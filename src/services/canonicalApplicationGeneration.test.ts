import fs from "fs/promises";
import os from "os";
import path from "path";
import { createHash } from "crypto";
import { it } from "@jest/globals";
import { generateCanonicalArchive } from "./canonicalApplicationGeneration";
import { downloadCanonicalProjectExport } from "./canonicalProjectExport";
jest.mock("./canonicalProjectExport", () => ({ downloadCanonicalProjectExport: jest.fn() }));
import { getValkyrLabsRtkApiClient, ValkyrLabsApiError } from "./valkyrai/ValkyrLabsRtkApi";

jest.mock("./valkyrai/ValkyrLabsRtkApi", () => ({
  getValkyrLabsRtkApiClient: jest.fn(),
  ValkyrLabsApiError: class extends Error { constructor(message: string, public status: number | "FETCH_ERROR" | "TIMEOUT_ERROR") { super(message); } },
}));

const applicationId = "11111111-1111-4111-8111-111111111111";
const accountId = "22222222-2222-4222-8222-222222222222";
const otherId = "33333333-3333-4333-8333-333333333333";
const fileRecordId = "44444444-4444-4444-8444-444444444444";
const archive = Buffer.from([80, 75, 3, 4, 7]);
const checksum = createHash("sha256").update(archive).digest("hex");

describe("canonical application generation handoff", () => {
  let root: string, request: any, receipt: any, artifact: any, trace: any;
  let json: jest.Mock, fetchArtifact: jest.Mock, options: Parameters<typeof generateCanonicalArchive>[0];
  beforeEach(async () => {
    jest.clearAllMocks();
    root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "valoride-receipt-test-")));
    request = { requestRef: "req-1", tenantId: "tenant-1", accountId, applicationId };
    receipt = { ...request, receiptRef: "receipt-1", generationRunRef: "run-1", artifactSetRef: "set-1", status: "succeeded", specRevisionRef: "spec-1", buildRunRef: "build-1", testRunRef: "test-1" };
    artifact = { ...request, artifactRef: "artifact-1", generationRunRef: "run-1", artifactSetRef: "set-1", artifactType: "package_zip", status: "packaged", checksum, byteSize: archive.length, fileName: "fixture.zip", metadataJson: JSON.stringify({ fileRecordId, generationRunRef: "run-1" }) };
    trace = { ...receipt, generationReceipt: { ...receipt }, generatedArtifacts: [artifact] };
    json = jest.fn(async (input) => {
      if (input.url.endsWith("/auth/me")) return { data: { authenticated: true, authenticatedPrincipalObject: { id: accountId } } };
      if (input.url.endsWith("/run")) return { data: receipt };
      if (input.url.includes("/traces/")) return { data: trace };
      return { data: request };
    });
    (getValkyrLabsRtkApiClient as jest.Mock).mockReturnValue({ request: json });
    fetchArtifact = jest.fn(async () => new Response(archive, { status: 200 }));
    options = { backend: "https://api.example/v1", workspaceRoot: root, applicationId, applicationVersion: "1.2.0", jwtToken: "ephemeral-fixture-token", recoveryDirectory: path.join(root, "recovery"), assertCurrent: async () => {}, fetch: fetchArtifact };
  });
  afterEach(async () => fs.rm(root, { recursive: true, force: true }));

  describe("MCP publication contract", () => {
    it("pins native Blueprint regeneration to the exact persisted spec revision before the run", async()=>{
      options.expectedSpecId="44444444-4444-4444-8444-444444444444";
      request.clarifyingQuestionsJson=JSON.stringify({expectedOpenApiSpecId:options.expectedSpecId});
      const generated=await generateCanonicalArchive(options);
      expect(json.mock.calls.find(([q])=>q.url.endsWith("/requests")&&q.method==="POST")[0].json.clarifyingQuestionsJson).toBe(request.clarifyingQuestionsJson);
      const persisted=json.mock.calls.findIndex(([q])=>q.url.endsWith("/requests/req-1"));
      expect(persisted).toBeGreaterThan(0);
      expect(json.mock.calls.findIndex(([q])=>q.url.endsWith("/run"))).toBeGreaterThan(persisted);
      await generated.complete();
    });
    it("refuses execution when the server drops the Blueprint revision pin",async()=>{
      options.expectedSpecId="44444444-4444-4444-8444-444444444444";
      await expect(generateCanonicalArchive(options)).rejects.toThrow(/did not retain/);
      expect(json.mock.calls.some(([q])=>q.url.endsWith("/run"))).toBe(false);
    });
    const useSuppression = () => {
      options.mcpPublicationMode = "suppress";
      request.mcpPublicationMode = "suppress";
      receipt.summaryJson = JSON.stringify({ mcpPublicationMode: "suppress", mcpPublicationDisposition: "SUPPRESSED" });
      trace.generationReceipt = { ...receipt };
    };
    const creates = () => json.mock.calls.filter(([call]) => call.url.endsWith("/requests") && call.method === "POST");
    const runs = () => json.mock.calls.filter(([call]) => call.url.endsWith("/run") && call.method === "POST");
    const journalPath = () => path.join(options.recoveryDirectory!, createHash("sha256").update(JSON.stringify([
      options.backend, root, applicationId, options.applicationVersion, accountId,
    ])).digest("hex") + ".json");
    const seedRecovery = async (mode?: "inherit" | "suppress") => {
      await fs.mkdir(options.recoveryDirectory!, { recursive: true });
      await fs.writeFile(journalPath(), JSON.stringify({ idempotencyKey: "valoride-existing", requestRef: "req-1", tenantId: "tenant-1", accountId, ...(mode ? { mcpPublicationMode: mode } : {}) }));
    };
    const useRecordedRun = () => {
      request.generationRunRef = "run-1";
      const handler = json.getMockImplementation()!;
      json.mockImplementation(async input => input.url.endsWith("/runs/run-1")
        ? { data: { ...request, generationReceiptRef: "receipt-1" } } : handler(input));
    };

    it("preserves the default wire request and labels legacy receipts UNKNOWN", async () => {
      const generated = await generateCanonicalArchive(options);
      expect(creates()[0][0].json).toEqual({ applicationId, idempotencyKey: expect.any(String) });
      expect(generated.provenance).toMatchObject({ mcpPublicationMode: "inherit", mcpPublicationDisposition: "UNKNOWN" });
      await generated.complete();
    });

    it.each(["GLOBAL_DISABLED", "PUBLISHER_UNAVAILABLE", "NO_APPLICATION", "PUBLISHED", "PUBLISH_FAILED", "UNKNOWN"])("retains the server-observed inherit outcome %s", async disposition => {
      options.mcpPublicationMode = "inherit";
      receipt.summaryJson = JSON.stringify({ mcpPublicationMode: "inherit", mcpPublicationDisposition: disposition });
      trace.generationReceipt = { ...receipt };
      const generated = await generateCanonicalArchive(options);
      expect(creates()[0][0].json).not.toHaveProperty("mcpPublicationMode");
      expect(generated.provenance.mcpPublicationDisposition).toBe(disposition);
      await generated.complete();
    });

    it("requires persisted suppression before executing and exports once from its attested receipt", async () => {
      useSuppression();
      (downloadCanonicalProjectExport as jest.Mock).mockResolvedValue(archive);
      const generated = await generateCanonicalArchive({ ...options, completeProjectExport: true });
      expect(creates()[0][0].json).toEqual({ applicationId, idempotencyKey: expect.any(String), mcpPublicationMode: "suppress" });
      const recordedIndex = json.mock.calls.findIndex(([call]) => call.url.endsWith("/requests/req-1") && call.method === "GET");
      const runIndex = json.mock.calls.findIndex(([call]) => call.url.endsWith("/run"));
      expect(recordedIndex).toBeGreaterThan(-1);
      expect(recordedIndex).toBeLessThan(runIndex);
      expect(runs()).toHaveLength(1);
      expect(generated.provenance).toMatchObject({ mcpPublicationMode: "suppress", mcpPublicationDisposition: "SUPPRESSED", receiptRef: "receipt-1", accountId });
      expect(downloadCanonicalProjectExport).toHaveBeenCalledTimes(1);
      expect(downloadCanonicalProjectExport).toHaveBeenCalledWith(expect.objectContaining({ applicationId, receiptRef: "receipt-1" }));
      expect(fetchArtifact).not.toHaveBeenCalled();
      await generated.complete();
    });

    it("uses the authorized trace when the compact run response omits the observation", async () => {
      useSuppression(); delete receipt.summaryJson;
      const generated = await generateCanonicalArchive(options);
      expect(json).toHaveBeenCalledWith(expect.objectContaining({ url: "https://api.example/v1/app_generation_ops/traces/receipt-1", method: "GET" }));
      expect(generated.provenance).toMatchObject({ mcpPublicationMode: "suppress", mcpPublicationDisposition: "SUPPRESSED" });
      await generated.complete();
    });

    it.each(["create", "readback"])("stops before a run when an older API drops suppression on %s", async stage => {
      useSuppression();
      const handler = json.getMockImplementation()!;
      json.mockImplementation(async input => (stage === "create" ? input.url.endsWith("/requests") : input.url.endsWith("/requests/req-1"))
        ? { data: { ...request, mcpPublicationMode: undefined } } : handler(input));
      await expect(generateCanonicalArchive(options)).rejects.toThrow(/did not record/);
      expect(runs()).toHaveLength(0);
      expect(fetchArtifact).not.toHaveBeenCalled();
      expect(JSON.parse(await fs.readFile(journalPath(), "utf8"))).toMatchObject({ mcpPublicationMode: "suppress", idempotencyKey: creates()[0][0].json.idempotencyKey });
    });

    it("retains the same idempotency key and suppression choice when creation response is lost", async () => {
      useSuppression();
      const handler = json.getMockImplementation()!;
      let lost = true;
      json.mockImplementation(async input => {
        if (input.url.endsWith("/requests") && lost) { lost = false; throw new ValkyrLabsApiError("lost response", "FETCH_ERROR"); }
        return handler(input);
      });
      await expect(generateCanonicalArchive(options)).rejects.toThrow(/resume the same request/);
      const generated = await generateCanonicalArchive(options);
      expect(creates()).toHaveLength(2);
      expect(creates()[0][0].json).toEqual(creates()[1][0].json);
      expect(runs()).toHaveLength(1);
      await generated.complete();
    });

    it("recovers a persisted suppressed run with GETs without another creation or execution", async () => {
      useSuppression();
      await seedRecovery("suppress");
      useRecordedRun();
      const generated = await generateCanonicalArchive(options);
      expect(creates()).toHaveLength(0);
      expect(runs()).toHaveLength(0);
      expect(generated.provenance.mcpPublicationDisposition).toBe("SUPPRESSED");
      await generated.complete();
    });

    it.each(["legacy-inherit", "suppressed"])("preserves a %s journal when a retry changes the mode", async saved => {
      if (saved === "legacy-inherit") { await seedRecovery(); options.mcpPublicationMode = "suppress"; }
      else { await seedRecovery("suppress"); options.mcpPublicationMode = "inherit"; }
      const before = await fs.readFile(journalPath(), "utf8");
      await expect(generateCanonicalArchive(options)).rejects.toThrow(/original choice/);
      expect(await fs.readFile(journalPath(), "utf8")).toBe(before);
      expect(json.mock.calls.every(([call]) => call.method === "GET" && call.url.endsWith("/auth/me"))).toBe(true);
      expect(fetchArtifact).not.toHaveBeenCalled();
    });

    it("rejects a mode change during durable run recovery without resubmission", async () => {
      useSuppression(); await seedRecovery("suppress"); useRecordedRun();
      const handler = json.getMockImplementation()!;
      let reads = 0;
      json.mockImplementation(async input => input.url.endsWith("/requests/req-1") && ++reads > 1
        ? { data: { ...request, mcpPublicationMode: "inherit" } } : handler(input));
      await expect(generateCanonicalArchive(options)).rejects.toThrow(/did not record/);
      expect(runs()).toHaveLength(0); expect(creates()).toHaveLength(0);
      expect(fetchArtifact).not.toHaveBeenCalled();
    });

    it("still verifies the authenticated account on the persisted suppression readback", async () => {
      useSuppression();
      const handler = json.getMockImplementation()!;
      json.mockImplementation(async input => input.url.endsWith("/requests/req-1")
        ? { data: { ...request, accountId: otherId } } : handler(input));
      await expect(generateCanonicalArchive(options)).rejects.toThrow(/different account or tenant/);
      expect(runs()).toHaveLength(0); expect(fetchArtifact).not.toHaveBeenCalled();
    });

    it.each([
      undefined,
      { mcpPublicationMode: "suppress" },
      { mcpPublicationDisposition: "SUPPRESSED" },
      { mcpPublicationMode: "inherit", mcpPublicationDisposition: "SUPPRESSED" },
      { mcpPublicationMode: "suppress", mcpPublicationDisposition: "PUBLISHED" },
      { mcpPublicationMode: "suppress", mcpPublicationDisposition: "UNKNOWN" },
      { mcpPublicationMode: "suppress", mcpPublicationDisposition: "FUTURE_VALUE" },
    ])("rejects missing or contradictory suppression evidence %# before download", async summary => {
      useSuppression();
      receipt.summaryJson = summary === undefined ? undefined : JSON.stringify(summary);
      trace.generationReceipt.summaryJson = receipt.summaryJson;
      // Artifact metadata cannot substitute for the server's receipt observation.
      artifact.metadataJson = JSON.stringify({ fileRecordId, generationRunRef: "run-1", mcpPublicationMode: "suppress", mcpPublicationDisposition: "SUPPRESSED" });
      await expect(generateCanonicalArchive(options)).rejects.toThrow(/does not attest/);
      expect(fetchArtifact).not.toHaveBeenCalled();
      expect(downloadCanonicalProjectExport).not.toHaveBeenCalled();
      expect((await fs.readdir(options.recoveryDirectory!)).length).toBe(1);
    });

    it("requires authorized trace clearance even if the compact response claims suppression", async () => {
      useSuppression(); delete trace.generationReceipt.summaryJson;
      await expect(generateCanonicalArchive(options)).rejects.toThrow(/does not attest/);
      expect(fetchArtifact).not.toHaveBeenCalled();
    });

    it("rejects malformed receipt summary JSON without downloading", async () => {
      useSuppression(); receipt.summaryJson = "{broken";
      await expect(generateCanonicalArchive(options)).rejects.toThrow(/invalid MCP publication evidence/);
      expect(fetchArtifact).not.toHaveBeenCalled();
    });

    it("rejects contradictory observations between the receipt and its matching trace", async () => {
      receipt.summaryJson = JSON.stringify({ mcpPublicationMode: "inherit", mcpPublicationDisposition: "PUBLISHED" });
      trace.generationReceipt.summaryJson = JSON.stringify({ mcpPublicationMode: "inherit", mcpPublicationDisposition: "PUBLISH_FAILED" });
      await expect(generateCanonicalArchive(options)).rejects.toThrow(/disagree about MCP publication/);
      expect(fetchArtifact).not.toHaveBeenCalled();
    });

    it("does not label an inherit receipt as suppressed", async () => {
      receipt.summaryJson = JSON.stringify({ mcpPublicationMode: "inherit", mcpPublicationDisposition: "SUPPRESSED" });
      await expect(generateCanonicalArchive(options)).rejects.toThrow(/does not attest/);
      expect(fetchArtifact).not.toHaveBeenCalled();
    });

    describe("MCP recovery status wording", () => {
      it("reports no submission only when suppression is rejected before a run POST", async () => {
        useSuppression(); delete request.mcpPublicationMode;
        await expect(generateCanonicalArchive(options)).rejects.toThrow("This attempt has not submitted execution");
        expect(runs()).toHaveLength(0);
        expect(fetchArtifact).not.toHaveBeenCalled();
      });

      it("preserves the key and acknowledges possible execution after a lost run response and conflicting mode", async () => {
        useSuppression();
        const handler = json.getMockImplementation()!;
        json.mockImplementation(async input => {
          if (input.url.endsWith("/run")) {
            request.mcpPublicationMode = "inherit";
            // A legacy recovery read can omit both the admitted mode and run reference.
            delete request.generationRunRef;
            throw new ValkyrLabsApiError("lost run response", 504);
          }
          return handler(input);
        });
        let failure: Error | undefined;
        try { await generateCanonicalArchive(options); } catch (error) { failure = error as Error; }
        expect(failure?.message).toContain("Generation may already have started or completed");
        expect(failure?.message).toContain("Suppression clearance is missing");
        expect(failure?.message).not.toMatch(/No execution.*submitted|has not submitted execution/);
        expect(runs()).toHaveLength(1);
        expect(fetchArtifact).not.toHaveBeenCalled();
        expect(downloadCanonicalProjectExport).not.toHaveBeenCalled();
        expect(JSON.parse(await fs.readFile(journalPath(), "utf8"))).toMatchObject({
          requestRef: "req-1", mcpPublicationMode: "suppress", idempotencyKey: creates()[0][0].json.idempotencyKey,
        });
      });

      it("keeps execution uncertain when a resumed request no longer acknowledges suppression", async () => {
        useSuppression(); await seedRecovery("suppress");
        request.mcpPublicationMode = "inherit";
        await expect(generateCanonicalArchive(options)).rejects.toThrow("Generation may already have started or completed");
        expect(creates()).toHaveLength(0); expect(runs()).toHaveLength(0);
        expect(JSON.parse(await fs.readFile(journalPath(), "utf8"))).toMatchObject({ idempotencyKey: "valoride-existing", requestRef: "req-1", mcpPublicationMode: "suppress" });
        expect(fetchArtifact).not.toHaveBeenCalled();
      });
    });

    it("reports an actual terminal generation failure instead of demanding a success attestation", async () => {
      useSuppression(); receipt.status = "failed"; receipt.errorMessage = "Recorded build failure"; delete receipt.summaryJson;
      await expect(generateCanonicalArchive(options)).rejects.toThrow("Recorded build failure");
      expect(await fs.readdir(options.recoveryDirectory!)).toEqual([]);
      expect(fetchArtifact).not.toHaveBeenCalled();
    });
  });

  it("binds the authorized request, receipt, trace and checked FileRecord bytes without caller-supplied tenancy", async () => {
    const generated = await generateCanonicalArchive(options);
    expect(generated.archive).toEqual(archive);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ url: "https://api.example/v1/app_generation_ops/requests", method: "POST", json: { applicationId, idempotencyKey: expect.any(String) }, headers: { Authorization: "Bearer ephemeral-fixture-token" }, redirect: "error" }));
    expect(fetchArtifact).toHaveBeenCalledWith(`https://api.example/v1/files/${fileRecordId}/download`, expect.objectContaining({ headers: { Authorization: "Bearer ephemeral-fixture-token" }, credentials: "omit", redirect: "manual" }));
    expect(generated.provenance).toMatchObject({ requestRef: "req-1", receiptRef: "receipt-1", generationRunRef: "run-1", artifactRef: "artifact-1", fileRecordId, checksum, tenantId: "tenant-1", accountId, specRevisionRef: "spec-1", buildRunRef: "build-1", testRunRef: "test-1" });
    const journal = path.join(options.recoveryDirectory!, (await fs.readdir(options.recoveryDirectory!))[0]);
    expect((await fs.stat(journal)).mode & 0o777).toBe(0o600);
    expect(await fs.readFile(journal, "utf8")).not.toContain(options.jwtToken);
    await generated.complete(); expect(await fs.readdir(options.recoveryDirectory!)).toEqual([]);
  });

  it("downloads the complete export for the same accepted receipt once and retains receipt recovery until installation completes", async () => {
    const completeExport = Buffer.from("complete export with its own checksum");
    (downloadCanonicalProjectExport as jest.Mock).mockResolvedValue(completeExport);
    const generated = await generateCanonicalArchive({ ...options, completeProjectExport: true });
    expect(generated.archive).toEqual(completeExport);
    expect(downloadCanonicalProjectExport).toHaveBeenCalledWith(expect.objectContaining({ applicationId, receiptRef: receipt.receiptRef, backend: options.backend, jwtToken: options.jwtToken }));
    expect(fetchArtifact).not.toHaveBeenCalled();
    expect((await fs.readdir(options.recoveryDirectory!)).length).toBe(1);
    await generated.complete(); expect(await fs.readdir(options.recoveryDirectory!)).toEqual([]);
  });

  it("downloads a dedicated developer artifact through the authorized Application endpoint without a FileRecord dependency", async () => {
    artifact.metadataJson = JSON.stringify({domain:"developer_project",storageDriverId:"s3",kind:"generation_package",organizationId:otherId,projectId:fileRecordId,applicationId,ownerId:accountId,generationRunRef:"run-1"});
    const result=await generateCanonicalArchive(options);
    expect(fetchArtifact).toHaveBeenCalledWith(`https://api.example/v1/thorapi/applications/${applicationId}/developer-project/artifacts/artifact-1/download`,expect.objectContaining({headers:{Authorization:"Bearer ephemeral-fixture-token"}}));
    expect(result.provenance.artifactStorage).toBe("developer_project");expect(result.provenance.fileRecordId).toBeUndefined();await result.complete();
  });
  it("rejects mismatched developer scope before storage access", async () => {
    artifact.metadataJson = JSON.stringify({domain:"developer_project",storageDriverId:"s3",kind:"generation_package",organizationId:otherId,projectId:fileRecordId,applicationId:otherId,ownerId:accountId,generationRunRef:"run-1"});
    await expect(generateCanonicalArchive(options)).rejects.toThrow(/mismatched developer scope/);expect(fetchArtifact).not.toHaveBeenCalled();
  });
  for (const [label, corrupt] of [
    ["request account", () => { request.accountId = otherId; }],
    ["request application", () => { request.applicationId = otherId; }],
    ["receipt tenant", () => { receipt.tenantId = "other-tenant"; }],
    ["receipt account", () => { receipt.accountId = otherId; }],
    ["receipt application", () => { receipt.applicationId = otherId; }],
    ["receipt request", () => { receipt.requestRef = "other-request"; }],
    ["trace run", () => { trace.generationRunRef = "other-run"; }],
    ["trace nested receipt", () => { trace.generationReceipt.receiptRef = "other-receipt"; }],
    ["artifact tenant", () => { artifact.tenantId = "other-tenant"; }],
    ["artifact account", () => { artifact.accountId = otherId; }],
    ["artifact application", () => { artifact.applicationId = otherId; }],
    ["artifact run", () => { artifact.generationRunRef = "other-run"; }],
    ["artifact set", () => { artifact.artifactSetRef = "other-set"; }],
    ["artifact checksum", () => { artifact.checksum = undefined; }],
    ["artifact size", () => { artifact.byteSize = 128 * 1024 * 1024 + 1; }],
    ["artifact duplication", () => { trace.generatedArtifacts.push({ ...artifact }); }],
    ["FileRecord metadata", () => { artifact.metadataJson = "null"; }],
    ["FileRecord run", () => { artifact.metadataJson = JSON.stringify({ fileRecordId, generationRunRef: "other-run" }); }],
  ] as Array<[string, () => void]>) {
    it(`rejects mismatched ${label} before downloading`, async () => {
      corrupt(); await expect(generateCanonicalArchive(options)).rejects.toThrow();
      expect(fetchArtifact).not.toHaveBeenCalled();
    });
  }

  it("strips authentication on storage redirects", async () => {
    fetchArtifact.mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "https://storage.example/signed-package" } }));
    const generated = await generateCanonicalArchive(options);
    expect(fetchArtifact.mock.calls[1]).toEqual(["https://storage.example/signed-package", expect.objectContaining({ headers: {}, credentials: "omit", redirect: "manual" })]);
    await generated.complete();
  });
  it("rejects unsafe storage redirects", async () => {
    fetchArtifact.mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "http://untrusted.example/archive" } }));
    await expect(generateCanonicalArchive(options)).rejects.toThrow(/unsafe destination/);
    expect(fetchArtifact).toHaveBeenCalledTimes(1);
  });
  it("rejects corrupt bytes and incomplete downloads", async () => {
    fetchArtifact.mockResolvedValueOnce(new Response(Buffer.from([80, 75, 3, 4, 8])));
    await expect(generateCanonicalArchive(options)).rejects.toThrow(/checksum/);
    fetchArtifact.mockResolvedValueOnce(new Response(archive.subarray(0, 4)));
    await expect(generateCanonicalArchive(options)).rejects.toThrow(/incomplete/);
    expect(json.mock.calls.filter(([call]) => call.url.endsWith("/requests") && call.method === "POST")).toHaveLength(1);
  });
  it("resumes after an interrupted download and token refresh using the same authenticated principal", async () => {
    fetchArtifact.mockRejectedValueOnce(new Error("fixture interruption"));
    await expect(generateCanonicalArchive(options)).rejects.toThrow(/same generation receipt/);
    const generated = await generateCanonicalArchive({ ...options, jwtToken: "rotated-fixture-token" });
    expect(json.mock.calls.filter(([call]) => call.url.endsWith("/requests") && call.method === "POST")).toHaveLength(1);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ url: "https://api.example/v1/app_generation_ops/requests/req-1", headers: { Authorization: "Bearer rotated-fixture-token" } }));
    await generated.complete();
    const next = await generateCanonicalArchive(options);
    const created = json.mock.calls.filter(([call]) => call.url.endsWith("/requests") && call.method === "POST");
    expect(created).toHaveLength(2); expect(created[0][0].json.idempotencyKey).not.toBe(created[1][0].json.idempotencyKey);
    await next.complete();
  });
  it("replays the same idempotency key when creation succeeds but its response is lost", async () => {
    const handler = json.getMockImplementation()!;
    let lost = true;
    json.mockImplementation(async input => { if (input.url.endsWith("/requests") && lost) { lost = false; throw new Error("lost response"); } return handler(input); });
    await expect(generateCanonicalArchive(options)).rejects.toThrow(/retry to resume/);
    const generated = await generateCanonicalArchive(options);
    const created = json.mock.calls.filter(([call]) => call.url.endsWith("/requests"));
    expect(created).toHaveLength(2); expect(created[0][0].json.idempotencyKey).toBe(created[1][0].json.idempotencyKey);
    await generated.complete();
  });
  it("clears an owned terminal failure so a repaired Blueprint can create a new request", async () => {
    receipt.status = "failed"; receipt.generationRunRef = undefined; receipt.artifactSetRef = undefined;
    await expect(generateCanonicalArchive(options)).rejects.toThrow(/build\/validation evidence/);
    expect(await fs.readdir(options.recoveryDirectory!)).toEqual([]); expect(fetchArtifact).not.toHaveBeenCalled();
  });
  it("explains a terminated worker, retains inspection references, and leaves a fresh user retry possible", async () => {
    receipt.status = "failed";
    receipt.errorMessage = "Code generation failed: TypeScript client generation failed: ThorAPI code-generation worker exited with code 143";
    receipt.billable = false;
    receipt.debitedCredits = 0;
    await expect(generateCanonicalArchive(options)).rejects.toThrow(
      "The server stopped the application generator before it finished. Generate again after the server is ready. No credits were charged for this failed generation. Request: req-1. Receipt: receipt-1.",
    );
    expect(await fs.readdir(options.recoveryDirectory!)).toEqual([]);
    expect(fetchArtifact).not.toHaveBeenCalled();
    const firstKey = json.mock.calls.find(([call]) => call.url.endsWith("/requests") && call.method === "POST")![0].json.idempotencyKey;
    expect(json.mock.calls.filter(([call]) => call.url.endsWith("/run"))).toHaveLength(1);

    // Only a new explicit invocation creates another generation after terminal failure.
    await expect(generateCanonicalArchive(options)).rejects.toThrow("The server stopped");
    const created = json.mock.calls.filter(([call]) => call.url.endsWith("/requests") && call.method === "POST");
    expect(created).toHaveLength(2);
    expect(created[1][0].json.idempotencyKey).not.toBe(firstKey);
  });
  it.each([
    { billable: undefined, debitedCredits: undefined },
    { billable: true, debitedCredits: 0 },
    { billable: false, creditDebitReceiptRef: "debit-1", debitedCredits: 0 },
    { billable: false, debitedCredits: 5 },
    { billable: false, debitedCredits: Number.NaN },
  ])("does not claim no charge without consistent receipt evidence %#", async billing => {
    receipt.status = "failed";
    receipt.errorMessage = "ThorAPI code-generation worker exited with code 143";
    Object.assign(receipt, billing);
    let error: Error | undefined;
    try { await generateCanonicalArchive(options); } catch (caught) { error = caught as Error; }
    expect(error?.message).toContain("The server stopped the application generator");
    expect(error?.message).toContain("Request: req-1. Receipt: receipt-1.");
    expect(error?.message).not.toContain("No credits were charged");
    expect(fetchArtifact).not.toHaveBeenCalled();
  });
  it("retains the backend reason and inspection references for an ordinary terminal failure", async () => {
    receipt.status = "failed";
    receipt.errorMessage = "Blueprint validation failed: unknown reference Customer";
    await expect(generateCanonicalArchive(options)).rejects.toThrow(
      "Review its build/validation evidence in ValkyrAI before retrying. Blueprint validation failed: unknown reference Customer Request: req-1. Receipt: receipt-1.",
    );
  });
  it.each(["FETCH_ERROR", "TIMEOUT_ERROR", 502, 503, 504] as const)("reconciles an interrupted run (%s) using GETs without a duplicate POST", async status => {
    const handler = json.getMockImplementation()!;
    json.mockImplementation(async input => {
      if (input.url.endsWith("/run")) throw new ValkyrLabsApiError("fixture proxy failure", status);
      if (input.url.endsWith("/requests/req-1")) return { data: { ...request, generationRunRef: "run-1", status: "succeeded" } };
      if (input.url.endsWith("/runs/run-1")) return { data: { ...request, generationRunRef: "run-1", generationReceiptRef: "receipt-1" } };
      return handler(input);
    });
    const generated = await generateCanonicalArchive(options);
    expect(generated.archive).toEqual(archive);
    expect(json.mock.calls.filter(([call]) => call.url.endsWith("/run"))).toHaveLength(1);
    expect(json.mock.calls.filter(([call]) => call.url.endsWith("/requests") && call.method === "POST")).toHaveLength(1);
    expect(json.mock.calls.filter(([call]) => call.url.endsWith("/traces/receipt-1"))).toHaveLength(1);
    await generated.complete();
  });
  it("resumes an already durable run without submitting it again", async () => {
    request.generationRunRef = "run-1";
    const handler = json.getMockImplementation()!;
    json.mockImplementation(async input => input.url.endsWith("/runs/run-1")
      ? { data: { ...request, generationReceiptRef: "receipt-1" } } : handler(input));
    const generated = await generateCanonicalArchive(options);
    expect(json.mock.calls.some(([call]) => call.url.endsWith("/run"))).toBe(false);
    await generated.complete();
  });
  it("waits through a running receipt and transient read failure without repeating the launch", async () => {
    const handler = json.getMockImplementation()!;
    let reads = 0;
    options.onProgress = jest.fn();
    json.mockImplementation(async input => {
      if (input.url.endsWith("/run")) throw new ValkyrLabsApiError("proxy timeout", 504);
      if (input.url.endsWith("/requests/req-1")) return { data: { ...request, generationRunRef: "run-1", status: "running" } };
      if (input.url.endsWith("/runs/run-1")) {
        reads++;
        if (reads === 1) throw new ValkyrLabsApiError("connection interrupted", "FETCH_ERROR");
        return { data: { ...request, generationRunRef: "run-1", ...(reads > 2 ? { generationReceiptRef: "receipt-1" } : {}) } };
      }
      return handler(input);
    });
    // Keep real timers for filesystem work; shorten only the bounded poll interval.
    const nativeTimeout = global.setTimeout;
    const timeout = jest.spyOn(global, "setTimeout").mockImplementation(((callback, milliseconds, ...args) =>
      nativeTimeout(callback, milliseconds === 2000 ? 1 : milliseconds, ...args)) as typeof setTimeout);
    try {
      const generated = await generateCanonicalArchive(options);
      expect(reads).toBe(3);
      expect(json.mock.calls.filter(([call]) => call.url.endsWith("/run"))).toHaveLength(1);
      expect(options.onProgress).toHaveBeenCalledWith(expect.stringContaining("no duplicate build"));
      await generated.complete();
    } finally { timeout.mockRestore(); }
  });
  it("reconciles an execution conflict only when an owned durable run exists", async () => {
    const handler = json.getMockImplementation()!;
    json.mockImplementation(async input => {
      if (input.url.endsWith("/run")) throw new ValkyrLabsApiError("already running", 409);
      if (input.url.endsWith("/requests/req-1")) return { data: { ...request, generationRunRef: "run-1" } };
      if (input.url.endsWith("/runs/run-1")) return { data: { ...request, generationRunRef: "run-1", generationReceiptRef: "receipt-1" } };
      return handler(input);
    });
    const generated = await generateCanonicalArchive(options);
    expect(json.mock.calls.filter(([call]) => call.url.endsWith("/run"))).toHaveLength(1);
    await generated.complete();
  });
  it("does not poll a source conflict with no durable run", async () => {
    const handler = json.getMockImplementation()!;
    json.mockImplementation(async input => {
      if (input.url.endsWith("/run")) throw new ValkyrLabsApiError("source conflict", 409);
      return handler(input);
    });
    await expect(generateCanonicalArchive(options)).rejects.toThrow("(409)");
    expect(json.mock.calls.some(([call]) => call.url.includes("/runs/"))).toBe(false);
    expect(fetchArtifact).not.toHaveBeenCalled();
  });
  it("keeps the original recovery when reconciliation reaches its bounded deadline", async () => {
    request.generationRunRef = "run-1";
    const clock = jest.spyOn(Date, "now").mockReturnValueOnce(0).mockReturnValue(45 * 60_000 + 1);
    try {
      await expect(generateCanonicalArchive(options)).rejects.toThrow("no duplicate build was started");
      expect((await fs.readdir(options.recoveryDirectory!)).length).toBe(1);
      expect(json.mock.calls.some(([call]) => call.url.endsWith("/run"))).toBe(false);
      expect(fetchArtifact).not.toHaveBeenCalled();
    } finally { clock.mockRestore(); }
  });
  it("shows the recorded backend failure after a proxy loss and clears only its terminal recovery", async () => {
    receipt.status = "failed"; receipt.errorMessage = "Unsupported class file major version 71";
    trace.generationReceipt = { ...receipt };
    const handler = json.getMockImplementation()!;
    json.mockImplementation(async input => {
      if (input.url.endsWith("/run")) throw new ValkyrLabsApiError("proxy timeout", 504);
      if (input.url.endsWith("/requests/req-1")) return { data: { ...request, generationRunRef: "run-1" } };
      if (input.url.endsWith("/runs/run-1")) return { data: { ...request, generationRunRef: "run-1", generationReceiptRef: "receipt-1" } };
      return handler(input);
    });
    await expect(generateCanonicalArchive(options)).rejects.toThrow("Unsupported class file major version 71");
    expect(await fs.readdir(options.recoveryDirectory!)).toEqual([]);
    expect(fetchArtifact).not.toHaveBeenCalled();
    expect(json.mock.calls.filter(([call]) => call.url.endsWith("/run"))).toHaveLength(1);
  });
  it("retains recovery and stops when a recovered run has different ownership", async () => {
    request.generationRunRef = "run-1";
    const handler = json.getMockImplementation()!;
    json.mockImplementation(async input => input.url.endsWith("/runs/run-1")
      ? { data: { ...request, accountId: otherId, generationReceiptRef: "receipt-1" } } : handler(input));
    await expect(generateCanonicalArchive(options)).rejects.toThrow("different request or account");
    expect((await fs.readdir(options.recoveryDirectory!)).length).toBe(1);
    expect(fetchArtifact).not.toHaveBeenCalled();
    expect(json.mock.calls.some(([call]) => call.url.endsWith("/run"))).toBe(false);
  });
  it.each([401, 403, 400])("does not recover a rejected run (%s)", async status => {
    const handler = json.getMockImplementation()!;
    json.mockImplementation(async input => {
      if (input.url.endsWith("/run")) throw new ValkyrLabsApiError("rejected", status);
      return handler(input);
    });
    await expect(generateCanonicalArchive(options)).rejects.toThrow();
    expect(json.mock.calls.some(([call]) => call.url.endsWith("/runs/run-1"))).toBe(false);
    expect(json.mock.calls.filter(([call]) => call.url.endsWith("/run"))).toHaveLength(1);
  });
  it("reports authorization errors without attempting another generation endpoint", async () => {
    json.mockRejectedValueOnce(new ValkyrLabsApiError("fixture unauthorized", 401));
    await expect(generateCanonicalArchive(options)).rejects.toThrow(/authorized account/);
    expect(json).toHaveBeenCalledTimes(1); expect(fetchArtifact).not.toHaveBeenCalled();
  });
  it("honors a session change after authenticated responses", async () => {
    let current = true;
    options.assertCurrent = async () => { if (!current) throw new Error("Session changed"); };
    json.mockImplementationOnce(async () => { current = false; return { data: { authenticated: true, authenticatedPrincipalObject: { id: accountId } } }; });
    await expect(generateCanonicalArchive(options)).rejects.toThrow("Session changed");
    expect(fetchArtifact).not.toHaveBeenCalled();
  });
});
