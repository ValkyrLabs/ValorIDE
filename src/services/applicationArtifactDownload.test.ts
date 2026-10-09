import { it } from "@jest/globals";
import fs from "fs/promises";
import os from "os";
import path from "path";
import AdmZip from "adm-zip";
import { createHash } from "crypto";
import { downloadApplicationArtifact, filenameFromDisposition } from "./applicationArtifactDownload";
import { getWorkspacePath } from "@utils/path";
import { getValkyraiBasePath } from "@utils/serverValkyraiHost";
import { generateCanonicalArchive } from "./canonicalApplicationGeneration";
import { readProjectBlueprintState, specificationHash } from "./projectBlueprintSync";

jest.mock("vscode", () => ({
  Uri: { file: (fsPath: string) => ({ fsPath }) },
  workspace: { fs: {
    createDirectory: (uri: any) => jest.requireActual("fs/promises").mkdir(uri.fsPath, { recursive: true }),
    writeFile: (uri: any, bytes: any) => jest.requireActual("fs/promises").writeFile(uri.fsPath, bytes),
  } },
}));

jest.mock("@utils/path", () => ({ getWorkspacePath: jest.fn(), getReadablePath: (_: string, p: string) => p }));
jest.mock("@utils/thorapi", () => ({ resolveThorapiFolderPath: (root: string) => jest.requireActual("path").join(root, "thorapi") }));
jest.mock("@utils/serverValkyraiHost", () => ({ getValkyraiBasePath: jest.fn() }));
jest.mock("./canonicalApplicationGeneration", () => ({ generateCanonicalArchive: jest.fn() }));

const applicationId = "11111111-1111-4111-8111-111111111111";
const foreignId = "22222222-2222-4222-8222-222222222222";
const sha = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
const proof = { requestRef: "req-1", receiptRef: "receipt-1", generationRunRef: "run-1", artifactRef: "artifact-1", checksum: "a".repeat(64), tenantId: "tenant", accountId: applicationId };
const spec = { openapi: "3.0.3", info: { title: "Sample", version: "1" }, paths: {} };
const request = { applicationId, applicationName: "Sample", applicationVersion: "1", jwtToken: "synthetic-host-session" };

function packageBytes(mutate?: (files: Map<string, Buffer>, manifest: any, lineage: any) => void, specification: Record<string, any> = spec): Buffer {
  const original = new AdmZip(); original.addFile("spring-server/Generated.java", Buffer.from("fresh generated"));
  const originalBytes = original.toBuffer();
  const lineage = { schemaVersion: 1, scope: "canonical_application_generation", applicationId, ...proof,
    generatedPackageChecksumSha256: proof.checksum, packageSha256: sha(originalBytes), originalGeneratorChecksumSha256: sha(originalBytes), generatedFiles: ["spring-server/Generated.java"] };
  const files = new Map([["openapi-spec.yaml", Buffer.from(JSON.stringify(specification))], ["custom.ts", Buffer.from("custom accepted source")],
    ["export-reference/generator-original.zip", originalBytes]]);
  const manifest: any = { schemaVersion: 1, applicationId, receiptRef: proof.receiptRef, version: "1", specificationPath: "openapi-spec.yaml", sourceRevision: null };
  mutate?.(files, manifest, lineage);
  files.set("generation-lineage.json", Buffer.from(JSON.stringify(lineage)));
  manifest.files = [...files].map(([path, bytes]) => ({ path, bytes: bytes.length, sha256: sha(bytes) }));
  const zip = new AdmZip(); for (const [name, bytes] of files) zip.addFile(name, bytes);
  zip.addFile("source-manifest.json", Buffer.from(JSON.stringify(manifest))); return zip.toBuffer();
}

describe("native complete project generation", () => {
  let root: string;
  let complete: jest.Mock;
  beforeEach(async () => {
    jest.clearAllMocks();
    root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "valoride-native-package-")));
    (getWorkspacePath as jest.Mock).mockReturnValue(root);
    (getValkyraiBasePath as jest.Mock).mockReturnValue("https://api.example.test/v1");
    complete = jest.fn(async () => {});
    (generateCanonicalArchive as jest.Mock).mockResolvedValue({ archive: packageBytes(), fileName: "v1.Sample.zip", provenance: proof, complete });
  });
  afterEach(async () => fs.rm(root, { recursive: true, force: true }));

  it("imports the accepted receipt's complete source and establishes an editable Blueprint without another download", async () => {
    const result = await downloadApplicationArtifact(request);
    expect(generateCanonicalArchive).toHaveBeenCalledWith(expect.objectContaining({ applicationId, completeProjectExport: true }));
    expect(result.extractedPath).toBe(path.join(root, "thorapi", "Sample-v1"));
    expect(await readProjectBlueprintState(result.extractedPath)).toMatchObject({ applicationId, specificationPath: "openapi-spec.yaml", baselineHash: specificationHash(spec), backend: "https://api.example.test/v1" });
    expect(JSON.parse(await fs.readFile(path.join(result.extractedPath, ".valoride-generation.json"), "utf8"))).toMatchObject({ applicationId, generation: proof, generatedFiles: ["spring-server/Generated.java"] });
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it("regenerates in the same opened project, preserves authored/spec edits, and replaces reviewed generated files", async () => {
    const first = await downloadApplicationArtifact(request);
    const edited = { ...spec, info: { ...spec.info, description: "developer spec edit" } };
    await fs.writeFile(path.join(first.extractedPath, "custom.ts"), "developer custom edit");
    await fs.writeFile(path.join(first.extractedPath, "openapi-spec.yaml"), JSON.stringify(edited));
    await fs.writeFile(path.join(first.extractedPath, "spring-server/Generated.java"), "developer generated edit");
    (getWorkspacePath as jest.Mock).mockReturnValue(first.extractedPath);
    const confirmOverwrite = jest.fn(async () => true);
    const result = await downloadApplicationArtifact({ ...request, confirmOverwrite });
    expect(result.extractedPath).toBe(first.extractedPath);
    expect(confirmOverwrite).toHaveBeenCalledWith(["spring-server/Generated.java"]);
    expect(await fs.readFile(path.join(result.extractedPath, "custom.ts"), "utf8")).toBe("developer custom edit");
    expect(JSON.parse(await fs.readFile(path.join(result.extractedPath, "openapi-spec.yaml"), "utf8"))).toEqual(edited);
    expect(await fs.readFile(path.join(result.extractedPath, "spring-server/Generated.java"), "utf8")).toBe("fresh generated");
    await expect(fs.access(path.join(first.extractedPath, "thorapi"))).rejects.toThrow();
  });

  it("keeps edits and the receipt recoverable after cancelling replacement, then safely retries", async () => {
    const first = await downloadApplicationArtifact(request);
    const file = path.join(first.extractedPath, "spring-server/Generated.java"); await fs.writeFile(file, "keep cancelled edit");
    complete.mockClear();
    await expect(downloadApplicationArtifact({ ...request, confirmOverwrite: async () => false })).rejects.toThrow(/cancelled/);
    expect(await fs.readFile(file, "utf8")).toBe("keep cancelled edit"); expect(complete).not.toHaveBeenCalled();
    await downloadApplicationArtifact({ ...request, confirmOverwrite: async () => true }); expect(complete).toHaveBeenCalledTimes(1);
  });

  it.each(["application", "manifest-application", "receipt", "artifact-checksum", "original-checksum"])("rejects mismatched %s evidence before writing a destination", async (problem) => {
    const bytes = packageBytes((_files, manifest, lineage) => {
      if (problem === "application") lineage.applicationId = foreignId;
      if (problem === "manifest-application") manifest.applicationId = foreignId;
      if (problem === "receipt") manifest.receiptRef = "foreign-receipt";
      if (problem === "artifact-checksum") lineage.generatedPackageChecksumSha256 = "b".repeat(64);
      if (problem === "original-checksum") lineage.originalGeneratorChecksumSha256 = "c".repeat(64);
    });
    (generateCanonicalArchive as jest.Mock).mockResolvedValue({ archive: bytes, provenance: proof, complete });
    await expect(downloadApplicationArtifact(request)).rejects.toThrow(/Application|receipt|checksum/i);
    expect(await fs.readdir(root)).toEqual([]); expect(complete).not.toHaveBeenCalled();
  });

  it("rejects a raw ZIP with a complete-package recovery instruction and retains generation recovery", async () => {
    const zip = new AdmZip(); zip.addFile("Generated.java", Buffer.from("raw generated source"));
    (generateCanonicalArchive as jest.Mock).mockResolvedValue({ archive: zip.toBuffer(), provenance: proof, complete });
    await expect(downloadApplicationArtifact(request)).rejects.toThrow(/Export the complete project package/);
    expect(await fs.readdir(root)).toEqual([]); expect(complete).not.toHaveBeenCalled();
  });

  it("stops when the account/backend changes before installation", async () => {
    await expect(downloadApplicationArtifact({ ...request, assertCurrent: async () => { throw new Error("Account changed"); } })).rejects.toThrow(/Account changed/);
    expect(generateCanonicalArchive).not.toHaveBeenCalled();
    (generateCanonicalArchive as jest.Mock).mockImplementation(async () => {
      (getValkyraiBasePath as jest.Mock).mockReturnValue("https://other.example.test/v1");
      return { archive: packageBytes(), provenance: proof, complete };
    });
    await expect(downloadApplicationArtifact(request)).rejects.toThrow(/backend changed/);
    expect(await fs.readdir(root)).toEqual([]); expect(complete).not.toHaveBeenCalled();
  });

  it("rejects invalid identity/auth/workspace before generation", async () => {
    await expect(downloadApplicationArtifact({ ...request, applicationId: "../app" })).rejects.toThrow(/application/i);
    await expect(downloadApplicationArtifact({ ...request, jwtToken: "" })).rejects.toThrow(/Sign in/);
    (getWorkspacePath as jest.Mock).mockReturnValue(undefined);
    await expect(downloadApplicationArtifact(request)).rejects.toThrow(/workspace/);
    expect(generateCanonicalArchive).not.toHaveBeenCalled();
  });

  it("sanitizes a download filename and preserves UTF-8 disposition support", () => {
    expect(filenameFromDisposition('attachment; filename="../Sample.zip"', applicationId)).toBe("Sample.zip");
    expect(filenameFromDisposition("attachment; filename*=UTF-8''Sample%20App.zip", applicationId)).toBe("Sample App.zip");
  });
  it("rejects duplicate generation before another request and releases its lock after completion", async () => {
    let release!: (value: unknown) => void;
    (generateCanonicalArchive as jest.Mock).mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
    const first = downloadApplicationArtifact(request);
    await new Promise(resolve => setImmediate(resolve));
    await expect(downloadApplicationArtifact(request)).rejects.toThrow(/already being generated/);
    expect(generateCanonicalArchive).toHaveBeenCalledTimes(1);
    release({ archive: packageBytes(), provenance: proof, complete }); await first;
    await downloadApplicationArtifact(request); expect(generateCanonicalArchive).toHaveBeenCalledTimes(2);
  });

  it("does not send a generation request after a progress callback switches backend", async () => {
    await expect(downloadApplicationArtifact({ ...request, onProgress: async () => {
      (getValkyraiBasePath as jest.Mock).mockReturnValue("https://other.example.test/v1");
    } })).rejects.toThrow(/backend changed/);
    expect(generateCanonicalArchive).not.toHaveBeenCalled();
  });

  it("rejects a workspace switch during generation before writing a destination", async () => {
    (generateCanonicalArchive as jest.Mock).mockImplementationOnce(async () => {
      (getWorkspacePath as jest.Mock).mockReturnValue(path.join(root, "different-workspace"));
      return { archive: packageBytes(), provenance: proof, complete };
    });
    await expect(downloadApplicationArtifact(request)).rejects.toThrow(/workspace changed/);
    expect(await fs.readdir(root)).toEqual([]); expect(complete).not.toHaveBeenCalled();
  });

  it("puts a new API version beside the opened project and rejects a stale selected version", async () => {
    const first = await downloadApplicationArtifact(request);
    (getWorkspacePath as jest.Mock).mockReturnValue(first.extractedPath);
    const nextSpec = { ...spec, info: { ...spec.info, version: "2" } };
    const bytes = packageBytes((_files, manifest) => { manifest.version = "2"; }, nextSpec);
    (generateCanonicalArchive as jest.Mock).mockResolvedValue({ archive: bytes, provenance: proof, complete });
    await expect(downloadApplicationArtifact(request)).rejects.toThrow(/API version/);
    const next = await downloadApplicationArtifact({ ...request, applicationVersion: "2" });
    expect(next.extractedPath).toBe(path.join(path.dirname(first.extractedPath), "Sample-v2"));
    expect((await readProjectBlueprintState(next.extractedPath))?.applicationId).toBe(applicationId);
  });

  it("rejects a non-ZIP response without a success stage or completed receipt", async () => {
    (generateCanonicalArchive as jest.Mock).mockResolvedValue({ archive: Buffer.from("not a package"), provenance: proof, complete });
    const progress = jest.fn(); await expect(downloadApplicationArtifact({ ...request, onProgress: progress })).rejects.toThrow(/non-ZIP/);
    expect(progress.mock.calls.some(([,stage]) => stage === "finalizing")).toBe(false);
    expect(await fs.readdir(root)).toEqual([]); expect(complete).not.toHaveBeenCalled();
  });

  it("preserves the original Blueprint conflict baseline when an edited specification collides with newer admitted source", async () => {
    const first = await downloadApplicationArtifact(request);
    const marker = await fs.readFile(path.join(first.extractedPath, ".valoride-blueprint.json"));
    await fs.writeFile(path.join(first.extractedPath, "openapi-spec.yaml"), JSON.stringify({ ...spec, info: { ...spec.info, description: "local unsynchronized change" } }));
    (generateCanonicalArchive as jest.Mock).mockResolvedValue({ archive: packageBytes(undefined, { ...spec, info: { ...spec.info, description: "new accepted source" } }), provenance: proof, complete });
    await downloadApplicationArtifact(request);
    expect(await fs.readFile(path.join(first.extractedPath, ".valoride-blueprint.json"))).toEqual(marker);
  });

});
