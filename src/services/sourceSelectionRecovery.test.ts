import { it } from "@jest/globals";
import AdmZip from "adm-zip";
import crypto from "crypto";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { applicationSourceSelectionDescriptor, restoreNullApplicationSourceSelection,
  selectPublishedApplicationSourceReversibly } from "./projectSourceRevision";
import { createApplicationSourceArchive, publishApplicationSource, restoreApplicationSourceSelection,
  SOURCE_PUBLICATION_MARKER, SOURCE_SELECTION_MARKER } from "./applicationSourcePublish";
import { getValkyrLabsRtkApiClient, ValkyrLabsApiError } from "./valkyrai/ValkyrLabsRtkApi";
import { getSecret } from "@core/storage/state";
import { getWorkspacePath } from "@utils/path";
import { getValkyraiBasePath } from "@utils/serverValkyraiHost";

jest.mock("./valkyrai/ValkyrLabsRtkApi", () => ({ getValkyrLabsRtkApiClient: jest.fn(),
  ValkyrLabsApiError: class extends Error { constructor(message: string, public status: number) { super(message); } } }));
jest.mock("@core/storage/state", () => ({ getSecret: jest.fn() }));
jest.mock("@utils/path", () => ({ getWorkspacePath: jest.fn() }));
jest.mock("@utils/serverValkyraiHost", () => ({ getValkyraiBasePath: jest.fn() }));

const applicationId = "11111111-1111-4111-8111-111111111111";
const artifactId = "44444444-4444-4444-8444-444444444444";
const projectId = "33333333-3333-4333-8333-333333333333";
const profileId = "55555555-5555-4555-8555-555555555555";
const baseline = { applicationId, buildProfileId: null, artifactRef: null, profileSha256: "a".repeat(64) };
const source = { applicationId, artifactId, projectId, organizationId: projectId,
  revisionRef: `source-snapshot:${applicationId}:${artifactId}`, checksumSha256: "c".repeat(64),
  sizeBytes: 100, originalGeneratorChecksum: "d".repeat(64) };
const selected = { applicationId, buildProfileId: profileId, artifactRef: source.revisionRef, profileSha256: "b".repeat(64) };
const options = { backend: "http://127.0.0.1:18925/v1", applicationId, jwtToken: "fixture-session-header-only",
  assertCurrent: jest.fn(async () => {}), sourceKind: "upload" as const };
let request: jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  request = jest.fn();
  (getValkyrLabsRtkApiClient as jest.Mock).mockReturnValue({ request });
});

describe("descriptor recovery API", () => {
  it("reads only typed descriptor fields from the dedicated state route", async () => {
    request.mockResolvedValue({ data: { ...baseline, unexpected: "not retained" } });
    expect(await applicationSourceSelectionDescriptor(options)).toEqual(baseline);
    expect(request.mock.calls[0][0].url).toMatch(/source-selection\/state$/);
  });
  it("selects against the full pinned descriptor and validates the returned transition", async () => {
    request.mockResolvedValueOnce({ data: baseline }).mockResolvedValueOnce({ data: { baseline, selected, sourceRevision: source } });
    expect(await selectPublishedApplicationSourceReversibly(options, source, baseline, source.originalGeneratorChecksum))
      .toEqual({ baseline, selected, sourceRevision: source });
    expect(request.mock.calls[1][0].json).toEqual({ revisionRef: source.revisionRef, expectedCurrent: baseline });
    expect(request.mock.calls[1][0].method).toBe("POST");
    expect(JSON.stringify(request.mock.calls[1][0].json)).not.toContain(options.jwtToken);
  });
  it("rejects a changed profile digest even when the artifact remains null", async () => {
    request.mockResolvedValue({ data: { ...baseline, profileSha256: "e".repeat(64) } });
    await expect(selectPublishedApplicationSourceReversibly(options, source, baseline, source.originalGeneratorChecksum)).rejects.toThrow(/selection changed/);
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("does not retry a server-side stale-state conflict", async () => {
    request.mockResolvedValueOnce({ data: baseline }).mockRejectedValueOnce(new ValkyrLabsApiError(options.jwtToken, 409));
    const error = await selectPublishedApplicationSourceReversibly(options, source, baseline, source.originalGeneratorChecksum).catch(error => error);
    expect(error.message).toMatch(/selection changed/);
    expect(error.message).not.toContain(options.jwtToken);
    expect(request).toHaveBeenCalledTimes(2);
  });
  it("rejects a foreign or substituted transition after selection", async () => {
    request.mockResolvedValueOnce({ data: baseline }).mockResolvedValueOnce({ data: {
      baseline: { ...baseline, profileSha256: "f".repeat(64) }, selected, sourceRevision: source,
    } });
    await expect(selectPublishedApplicationSourceReversibly(options, source, baseline, source.originalGeneratorChecksum)).rejects.toThrow(/different selection/);
  });
  it("accepts a nullable upload commit field without retaining untyped metadata", async () => {
    request.mockResolvedValueOnce({ data: baseline }).mockResolvedValueOnce({ data: {
      baseline, selected, sourceRevision: { ...source, commitSha: null, unexpected: "not retained" },
    } });
    expect((await selectPublishedApplicationSourceReversibly(options, source, baseline, source.originalGeneratorChecksum)).sourceRevision).toEqual(source);
  });
  it("rejects non-string profile identity instead of coercing it", async () => {
    request.mockResolvedValue({ data: { ...baseline, buildProfileId: [projectId] } });
    await expect(applicationSourceSelectionDescriptor(options)).rejects.toThrow(/descriptor is invalid/);
  });
  it("reattaches the original profile association when the null-artifact baseline had a profile", async () => {
    const original = { ...baseline, buildProfileId: projectId };
    request.mockResolvedValueOnce({ data: selected }).mockResolvedValueOnce({ data: original }).mockResolvedValueOnce({ data: original });
    expect(await restoreNullApplicationSourceSelection(options, selected, original)).toEqual(original);
    expect(request.mock.calls[1][0].json.baseline).toEqual(original);
  });
  it("restores the full baseline through dedicated POST and verifies exact readback", async () => {
    request.mockResolvedValueOnce({ data: selected }).mockResolvedValueOnce({ data: baseline }).mockResolvedValueOnce({ data: baseline });
    expect(await restoreNullApplicationSourceSelection(options, selected, baseline)).toEqual(baseline);
    expect(request.mock.calls[1][0].url).toMatch(/source-selection\/restore-null$/);
    expect(request.mock.calls[1][0].json).toEqual({ expectedCurrent: selected, baseline });
  });
  it("recovers an already-restored exact baseline without another mutation", async () => {
    request.mockResolvedValue({ data: baseline });
    expect(await restoreNullApplicationSourceSelection(options, selected, baseline)).toEqual(baseline);
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("rejects changed selected configuration without restoring", async () => {
    request.mockResolvedValue({ data: { ...selected, profileSha256: "e".repeat(64) } });
    await expect(restoreNullApplicationSourceSelection(options, selected, baseline)).rejects.toThrow(/baseline changed/);
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("rejects a foreign baseline before any request", async () => {
    await expect(restoreNullApplicationSourceSelection(options, selected, { ...baseline, applicationId: projectId })).rejects.toThrow(/another Application/);
    expect(request).not.toHaveBeenCalled();
  });
});

describe("descriptor recovery publication", () => {
  let root: string, current: typeof baseline | typeof selected, uploaded: any, transition: any;
  let failSelectionResponse: boolean, failRestoreResponse: boolean, originalChecksum: string;
  let uploadCount: number, selectCount: number;
  const publication = () => publishApplicationSource({ context: {} as any, applicationId });
  const restoration = () => restoreApplicationSourceSelection({ context: {} as any, applicationId });
  const read = async (marker: string) => JSON.parse(await fs.readFile(path.join(root, marker), "utf8"));
  const selections = () => request.mock.calls.filter(([q]) => q.url.endsWith("/source-selection/select"));

  beforeEach(async () => {
    root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "valoride-descriptor-test-")));
    const write = async (name: string, data: string | Buffer) => {
      await fs.mkdir(path.dirname(path.join(root, name)), { recursive: true });
      await fs.writeFile(path.join(root, name), data);
    };
    const zip = new AdmZip(); zip.addFile("generated.txt", Buffer.from("generator original"));
    const original = zip.toBuffer(); originalChecksum = crypto.createHash("sha256").update(original).digest("hex");
    await write(".valoride-deploy.json", JSON.stringify({ schemaVersion: 1, applicationId, runtimeTemplate: "java_spring_boot",
      backendRoot: "spring-server", openApiInputPath: "spring-server/src/main/resources/openapi.yaml" }));
    await write("spring-server/pom.xml", "<project />");
    await write("spring-server/src/main/resources/openapi.yaml", "openapi: 3.0.3\n");
    await write("generation-lineage.json", JSON.stringify({ applicationId, originalGeneratorChecksumSha256: originalChecksum }));
    await write("export-reference/generator-original.zip", original);
    await write("CUSTOM.md", "User-authored source remains\n");
    (getWorkspacePath as jest.Mock).mockReturnValue(root);
    (getSecret as jest.Mock).mockResolvedValue(options.jwtToken);
    (getValkyraiBasePath as jest.Mock).mockReturnValue(options.backend);
    current = baseline; uploaded = undefined; transition = undefined;
    failSelectionResponse = false; failRestoreResponse = false;
    uploadCount = 0; selectCount = 0;
    request.mockImplementation(async q => {
      if (q.url.endsWith("/source-selection/state")) return { data: current };
      if (q.method === "GET" && q.url.endsWith("/source-snapshots")) return { data: uploaded };
      if (q.method === "POST" && q.url.endsWith("/source-snapshots")) {
        const bytes = Buffer.from(await q.body.get("file").arrayBuffer());
        const revisionId = ++uploadCount === 1 ? artifactId : "66666666-6666-4666-8666-666666666666";
        uploaded = { ...source, artifactId: revisionId, revisionRef: `source-snapshot:${applicationId}:${revisionId}`,
          checksumSha256: crypto.createHash("sha256").update(bytes).digest("hex"),
          sizeBytes: bytes.length, createdAt: "2026-10-11T18:00:00Z", status: "validated" };
        return { data: uploaded };
      }
      if (q.url.endsWith("/source-selection/select")) {
        const intent = await read(SOURCE_PUBLICATION_MARKER);
        expect(intent.baseline).toEqual(baseline);
        expect(intent.expectedCurrent).toEqual(q.json.expectedCurrent);
        expect(intent.result.revisionRef).toBe(uploaded.revisionRef);
        expect(intent.transition).toBeUndefined();
        const selectedDescriptor = ++selectCount === 1 ? selected : { ...selected,
          buildProfileId: "77777777-7777-4777-8777-777777777777", artifactRef: uploaded.revisionRef, profileSha256: "e".repeat(64) };
        transition = { baseline: q.json.expectedCurrent, selected: selectedDescriptor, sourceRevision: { ...uploaded,
          projectId, organizationId: projectId, originalGeneratorChecksum: originalChecksum } };
        current = selectedDescriptor;
        if (failSelectionResponse) throw new Error(options.jwtToken);
        return { data: transition };
      }
      if (q.url.endsWith("/source-selection/restore-null")) {
        current = baseline;
        if (failRestoreResponse) throw new Error(options.jwtToken);
        return { data: baseline };
      }
      throw new Error("Unexpected fixture request");
    });
  });
  afterEach(async () => { await fs.rm(root, { recursive: true, force: true }); });

  it("persists baseline and revision before select, then selected descriptor before readback", async () => {
    const transport = request.getMockImplementation()!;
    request.mockImplementation(async q => {
      if (transition && q.url.endsWith("/source-selection/state")) {
        expect((await read(SOURCE_PUBLICATION_MARKER)).transition.selected).toEqual(selected);
      }
      return transport(q);
    });
    expect((await publication()).sourceSelection?.selected).toEqual(selected);
    const receipt = await read(SOURCE_SELECTION_MARKER);
    expect(receipt.baseline).toEqual(baseline);
    expect(receipt.transition.selected).toEqual(selected);
    expect(receipt.transition.sourceRevision.revisionRef).toBe(source.revisionRef);
    expect((await fs.stat(path.join(root, SOURCE_SELECTION_MARKER))).mode & 0o777).toBe(0o600);
    expect(JSON.stringify(receipt)).not.toContain(options.jwtToken);
  });
  it("keeps restoration records outside source archives and preserves local authored files", async () => {
    await publication();
    const archive = await createApplicationSourceArchive(root, applicationId);
    expect(new AdmZip(archive.buffer).getEntry(SOURCE_SELECTION_MARKER)).toBeNull();
    expect(await restoration()).toEqual(baseline);
    expect((await read(SOURCE_SELECTION_MARKER)).state).toBe("restored");
    expect(await fs.readFile(path.join(root, "CUSTOM.md"), "utf8")).toContain("User-authored source remains");
  });
  it("retains the original baseline through a second published revision", async () => {
    await publication();
    await fs.writeFile(path.join(root, "CUSTOM.md"), "A second authored change\n");
    const next = await publication();
    expect(next.sourceSelection?.baseline).toEqual(selected);
    expect((await read(SOURCE_SELECTION_MARKER)).baseline).toEqual(baseline);
    expect(next.sourceSelection?.selected.buildProfileId).not.toBe(selected.buildProfileId);
    expect(await restoration()).toEqual(baseline);
    expect(await fs.readFile(path.join(root, "CUSTOM.md"), "utf8")).toBe("A second authored change\n");
  });
  it("resumes a recorded transition after interrupted readback without another selection", async () => {
    const transport = request.getMockImplementation()!;
    let fail = true;
    request.mockImplementation(async q => {
      if (transition && fail && q.url.endsWith("/source-selection/state")) throw new Error("fixture interrupted readback");
      return transport(q);
    });
    await expect(publication()).rejects.toThrow(/remains intact/);
    expect((await read(SOURCE_PUBLICATION_MARKER)).transition.selected).toEqual(selected);
    fail = false;
    expect((await publication()).sourceSelection?.selected).toEqual(selected);
    expect(selections()).toHaveLength(1);
  });
  it("reuses the recorded completed revision without another upload or selection", async () => {
    await publication();
    expect((await publication()).sourceSelection?.selected).toEqual(selected);
    expect(uploadCount).toBe(1);
    expect(selections()).toHaveLength(1);
    expect((await read(SOURCE_SELECTION_MARKER)).baseline).toEqual(baseline);
  });
  it("rejects another generated-project identity before restoration dispatch", async () => {
    await publication(); request.mockClear();
    await fs.writeFile(path.join(root, ".valoride-generation.json"), JSON.stringify({
      schemaVersion: 2, applicationId: projectId, applicationName: "Other fixture", applicationVersion: "1", files: {},
    }));
    await expect(restoration()).rejects.toThrow(/another Application/);
    expect(request).not.toHaveBeenCalled();
  });
  it("fences a backend change during restoration progress before any dispatch", async () => {
    await publication(); request.mockClear();
    await expect(restoreApplicationSourceSelection({ context: {} as any, applicationId,
      onProgress: () => { (getValkyraiBasePath as jest.Mock).mockReturnValue("http://127.0.0.1:18926/v1"); },
    })).rejects.toThrow(/backend or session changed/);
    expect(request).not.toHaveBeenCalled();
    expect((await read(SOURCE_SELECTION_MARKER)).state).toBe("selected");
  });
  it("keeps uncertain selection intent and refuses to infer a selected descriptor after response loss", async () => {
    failSelectionResponse = true;
    await expect(publication()).rejects.toThrow(/remains intact/);
    expect((await read(SOURCE_PUBLICATION_MARKER)).baseline).toEqual(baseline);
    expect((await read(SOURCE_PUBLICATION_MARKER)).transition).toBeUndefined();
    failSelectionResponse = false;
    await expect(publication()).rejects.toThrow(/selection changed/);
    expect(selections()).toHaveLength(1);
  });
  it("recovers a lost restoration response through the exact baseline without another POST", async () => {
    await publication(); failRestoreResponse = true;
    await expect(restoration()).rejects.toThrow(/interrupted or unavailable/);
    failRestoreResponse = false;
    expect(await restoration()).toEqual(baseline);
    expect(request.mock.calls.filter(([q]) => q.url.endsWith("/restore-null"))).toHaveLength(1);
  });
  it("rejects same-artifact configuration changes before restoration and preserves the saved receipt", async () => {
    await publication(); current = { ...selected, profileSha256: "f".repeat(64) };
    await expect(restoration()).rejects.toThrow(/baseline changed/);
    expect(request.mock.calls.filter(([q]) => q.url.endsWith("/restore-null"))).toHaveLength(0);
    expect((await read(SOURCE_SELECTION_MARKER)).transition.selected).toEqual(selected);
  });
  it("keeps legacy recovery unchanged instead of manufacturing a baseline", async () => {
    const legacy = JSON.stringify({ schemaVersion: 1, applicationId, expectedArtifactRef: null });
    await fs.writeFile(path.join(root, SOURCE_PUBLICATION_MARKER), legacy);
    await expect(publication()).rejects.toThrow(/Legacy recovery/);
    expect(request).not.toHaveBeenCalled();
    expect(await fs.readFile(path.join(root, SOURCE_PUBLICATION_MARKER), "utf8")).toBe(legacy);
  });
  it("rejects substituted recorded publication identity before restoration", async () => {
    await publication(); request.mockClear();
    const receipt = await read(SOURCE_SELECTION_MARKER);
    const corrupt = JSON.stringify({ schemaVersion: 2, applicationId, backend: options.backend,
      checksumSha256: uploaded.checksumSha256, originalGeneratorChecksum: originalChecksum,
      baseline, expectedCurrent: baseline, transition: receipt.transition,
      result: { ...uploaded, artifactId: projectId },
    });
    await fs.writeFile(path.join(root, SOURCE_PUBLICATION_MARKER), corrupt);
    await expect(restoration()).rejects.toThrow(/transition differs from its publication/);
    expect(request).not.toHaveBeenCalled();
    expect(await fs.readFile(path.join(root, SOURCE_PUBLICATION_MARKER), "utf8")).toBe(corrupt);
  });
  it("refuses another backend without forwarding the original session or altering recovery", async () => {
    await publication(); request.mockClear();
    (getValkyraiBasePath as jest.Mock).mockReturnValue("http://127.0.0.1:18926/v1");
    await expect(restoration()).rejects.toThrow(/Application and backend/);
    expect(request).not.toHaveBeenCalled();
    expect((await read(SOURCE_SELECTION_MARKER)).backend).toBe(options.backend);
  });
});
