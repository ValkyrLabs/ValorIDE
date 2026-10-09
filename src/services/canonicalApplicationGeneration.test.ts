import fs from "fs/promises";
import os from "os";
import path from "path";
import { createHash } from "crypto";
import { generateCanonicalArchive } from "./canonicalApplicationGeneration";
import { downloadCanonicalProjectExport } from "./canonicalProjectExport";
jest.mock("./canonicalProjectExport", () => ({ downloadCanonicalProjectExport: jest.fn() }));
import { getValkyrLabsRtkApiClient, ValkyrLabsApiError } from "./valkyrai/ValkyrLabsRtkApi";

jest.mock("./valkyrai/ValkyrLabsRtkApi", () => ({
  getValkyrLabsRtkApiClient: jest.fn(),
  ValkyrLabsApiError: class extends Error { constructor(message: string, public status: number) { super(message); } },
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
    await expect(generateCanonicalArchive(options)).rejects.toThrow(/fix the saved Blueprint/);
    expect(await fs.readdir(options.recoveryDirectory!)).toEqual([]); expect(fetchArtifact).not.toHaveBeenCalled();
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
