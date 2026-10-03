import fs from "fs/promises";
import path from "path";
import os from "os";
import { createHash } from "crypto";
import AdmZip from "adm-zip";
import { it } from "@jest/globals";
import { importLocalProjectPackage, validateProjectSourceRevision } from "./localProjectImport";
import { readGenerationManifest, GENERATION_MARKER } from "./generatedProjectInstall";
import { BLUEPRINT_MARKER, readProjectBlueprintState, specificationHash } from "./projectBlueprintSync";

jest.mock("vscode", () => ({
  Uri: { file: (fsPath: string) => ({ fsPath }) },
  workspace: { fs: {
    createDirectory: (uri: any) => jest.requireActual("fs/promises").mkdir(uri.fsPath, { recursive: true }),
    writeFile: (uri: any, bytes: any) => jest.requireActual("fs/promises").writeFile(uri.fsPath, bytes),
  } },
}));

const sha = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
const applicationId = "11111111-1111-4111-8111-111111111111";
const spec = { openapi: "3.0.3", info: { title: "Round Trip", version: "1.0.0" }, paths: {} };

describe("canonical local project-package import", () => {
  let fixture: string; let archivePath: string; let parent: string; let original: Buffer;
  const packageBytes = (mutate?: (zip: AdmZip, manifest: any) => void) => {
    const files = new Map([
      ["openapi.json", Buffer.from(JSON.stringify(spec))],
      ["runtime/adapter.py", Buffer.from("# authored adapter\n")],
      ["workflow/module.json", Buffer.from('{"status":"disabled"}')],
      ["runtime/dependencies.json", Buffer.from('{"platform":"target-build-required"}')],
      ["generation-lineage.json", Buffer.from(JSON.stringify({ schemaVersion: 1, scope: "local_isolated_fixture", productionGenerationProven: false, applicationId, packageSha256: sha(original), receiptRef: "local-descriptive-reference" }))],
    ]);
    const manifest: any = { schemaVersion: 1, version: "1.0.0", files: [...files].map(([file, bytes]) => ({ path: file, bytes: bytes.length, sha256: sha(bytes) })) };
    const zip = new AdmZip(); for (const [file, bytes] of files) zip.addFile(file, bytes);
    zip.addFile("artifacts/generated-1.0.0.zip", original);
    mutate?.(zip, manifest);
    zip.addFile("source-manifest.json", Buffer.from(JSON.stringify(manifest)));
    return zip.toBuffer();
  };
  const importPackage = (extra: any = {}) => importLocalProjectPackage({ archivePath, parent, ...extra });
  const portableBytes = (mutate?: (zip: AdmZip, manifest: any) => void) => {
    const source = new AdmZip(packageBytes()); const zip = new AdmZip();
    for (const entry of source.getEntries()) {
      if (entry.isDirectory) continue;
      zip.addFile(entry.entryName.startsWith("artifacts/") ? entry.entryName : `project/${entry.entryName}`, entry.getData());
    }
    zip.addFile("receipts/local-generation-receipt.json", Buffer.from('{"scope":"local_isolated_fixture","productionGenerationProven":false}'));
    zip.addFile("workflow/native-graph-snapshot.json", Buffer.from('{"enabled":false}'));
    zip.addFile("portability/acceptance-contract.json", Buffer.from('{"productionReady":false}'));
    zip.addFile("notices/renderer/LICENSE", Buffer.from("Original renderer notice\n"));
    const manifest = { schemaVersion: 1, files: zip.getEntries().filter((entry) => !entry.isDirectory).map((entry) => ({ path: entry.entryName, sha256: sha(entry.getData()), bytes: entry.getData().length })) };
    mutate?.(zip, manifest);
    zip.addFile("export-manifest.json", Buffer.from(JSON.stringify(manifest)));
    return zip.toBuffer();
  };
  beforeEach(async () => {
    fixture = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "valoride-import-test-")));
    parent = path.join(fixture, "projects"); archivePath = path.join(fixture, "project-export.zip");
    const generated = new AdmZip(); generated.addFile("src/main/java/test/Application.java", Buffer.from("package test; public class Application {}"));
    generated.addFile("ui/src/app.ts", Buffer.from("export const generated = true;"));
    original = generated.toBuffer(); await fs.writeFile(archivePath, packageBytes());
  });
  afterEach(async () => fs.rm(fixture, { recursive: true, force: true }));

  it("imports generated code, authored assets, editable spec and immutable nested ZIP with no hosted signup or invented receipt", async () => {
    const installed = await importPackage();
    expect(installed.extractedPath).toBe(path.join(parent, "Round-Trip-v1.0.0"));
    expect(await fs.readFile(path.join(installed.extractedPath, "artifacts/generated-1.0.0.zip"))).toEqual(original);
    for (const file of ["src/main/java/test/Application.java", "ui/src/app.ts", "runtime/adapter.py", "workflow/module.json", "runtime/dependencies.json"]) await expect(fs.access(path.join(installed.extractedPath, file))).resolves.toBeUndefined();
    expect((await readGenerationManifest(installed.extractedPath))?.generation).toBeUndefined();
    expect(await readProjectBlueprintState(installed.extractedPath)).toMatchObject({ baselineHash: specificationHash(spec), specificationPath: "openapi.json" });
    expect((await readProjectBlueprintState(installed.extractedPath))?.etag).toBeUndefined();
  });

  it("imports the dedicated developer export layout and artifact revision without FileRecord or invented hosted receipts",async()=>{
    const sourceFiles=new Map<string,Buffer>([["openapi.json",Buffer.from(JSON.stringify(spec))],["runtime/adapter.py",Buffer.from("# custom kept\n")],
      ["generation-lineage.json",Buffer.from(JSON.stringify({schemaVersion:1,scope:"canonical_application_generation",applicationId,packageSha256:sha(original),originalGeneratorChecksumSha256:sha(original),receiptRef:"local-fixture-receipt"}))],
      ["export-reference/generator-original.zip",original]]);
    const artifactId="44444444-4444-4444-8444-444444444444";
    const sourceRevision={applicationId,artifactId,projectId:"22222222-2222-4222-8222-222222222222",organizationId:"33333333-3333-4333-8333-333333333333",revisionRef:`source-snapshot:${applicationId}:${artifactId}`,checksumSha256:"a".repeat(64),sizeBytes:100,commitSha:"b".repeat(40),treeSha:"c".repeat(40)};
    const manifest={schemaVersion:1,version:"1.0.0",specificationPath:"openapi.json",sourceRevision,files:[...sourceFiles].map(([path,bytes])=>({path,bytes:bytes.length,sha256:sha(bytes)}))};
    const zip=new AdmZip();for(const [file,bytes]of sourceFiles)zip.addFile(file,bytes);zip.addFile("source-manifest.json",Buffer.from(JSON.stringify(manifest)));await fs.writeFile(archivePath,zip.toBuffer());
    const imported=await importPackage();expect(await fs.readFile(path.join(imported.extractedPath,"export-reference/generator-original.zip"))).toEqual(original);
    expect((await readGenerationManifest(imported.extractedPath))?.generation).toBeUndefined();expect(await fs.readFile(path.join(imported.extractedPath,"runtime/adapter.py"),"utf8")).toBe("# custom kept\n");
    expect(()=>validateProjectSourceRevision({...sourceRevision,projectId:"foreign"},applicationId,sourceFiles,true)).toThrow(/invalid Application/);
  });
  const fixtureTest=process.env.VALORIDE_BACKEND_EXPORT_FIXTURE?it:it.skip;
  fixtureTest("imports the actual backend local round-trip export with its exact original ZIP and source descriptor",async()=>{
    const bytes=await fs.readFile(process.env.VALORIDE_BACKEND_EXPORT_FIXTURE!);await fs.writeFile(archivePath,bytes);
    const result=await importPackage();const zip=new AdmZip(bytes);
    expect(await fs.readFile(path.join(result.extractedPath,"export-reference/generator-original.zip"))).toEqual(zip.readFile("export-reference/generator-original.zip"));
    expect(await fs.readFile(path.join(result.extractedPath,"runtime/adapter.py"))).toEqual(zip.readFile("runtime/adapter.py"));
    expect((await readGenerationManifest(result.extractedPath))?.generation).toBeUndefined();expect(result.specificationPath).toBe("openapi-spec.yaml");
  });
  it("preserves authored edits and the original Blueprint baseline during repeated import from an opened project", async () => {
    const first = await importPackage(); const marker = await fs.readFile(path.join(first.extractedPath, BLUEPRINT_MARKER));
    await fs.appendFile(path.join(first.extractedPath, "runtime/adapter.py"), "# local edit\n");
    const edit = { ...spec, info: { ...spec.info, description: "local edit" } }; await fs.writeFile(path.join(first.extractedPath, "openapi.json"), JSON.stringify(edit));
    const second = await importPackage({ parent: path.join(first.extractedPath, ".thorapi"), workspaceRoot: first.extractedPath });
    expect(second.extractedPath).toBe(first.extractedPath);
    expect(second.preservedFiles).toEqual(expect.arrayContaining(["runtime/adapter.py", "openapi.json"]));
    expect(await fs.readFile(path.join(first.extractedPath, BLUEPRINT_MARKER))).toEqual(marker);
    expect(await fs.readdir(parent)).toEqual(["Round-Trip-v1.0.0"]);
    await expect(fs.access(path.join(first.extractedPath, ".thorapi"))).rejects.toThrow();
  });

  it("imports a portable envelope and retains every original notice, receipt, graph and manifest byte without promoting local lineage", async () => {
    const bytes = portableBytes(); await fs.writeFile(archivePath, bytes);
    const installed = await importPackage();
    const envelope = new AdmZip(bytes);
    for (const entry of envelope.getEntries()) if (!entry.isDirectory)
      expect(await fs.readFile(path.join(installed.extractedPath, "export-reference", entry.entryName))).toEqual(entry.getData());
    expect(await fs.readFile(path.join(installed.extractedPath, "runtime/adapter.py"), "utf8")).toBe("# authored adapter\n");
    expect(installed.specificationPath).toBe("openapi.json");
    expect((await readGenerationManifest(installed.extractedPath))?.generation).toBeUndefined();
    await fs.appendFile(path.join(installed.extractedPath, "runtime/adapter.py"), "# keep edit\n");
    const retried = await importPackage(); expect(retried.preservedFiles).toContain("runtime/adapter.py");
    expect(await fs.readFile(path.join(installed.extractedPath, "export-reference/receipts/local-generation-receipt.json"))).toEqual(envelope.readFile("receipts/local-generation-receipt.json"));
  });

  it.each(["checksum", "undeclared", "project-undeclared", "missing-source-manifest"])("rejects a portable envelope %s problem before destination writes", async (problem) => {
    await fs.writeFile(archivePath, portableBytes((zip, manifest) => {
      if (problem === "checksum") zip.updateFile("receipts/local-generation-receipt.json", Buffer.from("tampered"));
      if (problem === "undeclared") zip.addFile("unknown.py", Buffer.from("unknown"));
      if (problem === "project-undeclared") {
        const bytes = Buffer.from("# undeclared project source\n"); zip.addFile("project/unknown.py", bytes);
        manifest.files.push({ path: "project/unknown.py", sha256: sha(bytes), bytes: bytes.length });
      }
      if (problem === "missing-source-manifest") {
        zip.deleteFile("project/source-manifest.json");manifest.files = manifest.files.filter((item: any) => item.path !== "project/source-manifest.json");
      }
    }));
    await expect(importPackage()).rejects.toThrow(); await expect(fs.access(parent)).rejects.toThrow();
  });

  it("resumes an interrupted installation without adopting edits made after interruption", async () => {
    let interrupted = false;
    const target = path.join(parent, "Round-Trip-v1.0.0");
    await expect(importPackage({ assertCurrent: async () => {
      if (!interrupted && await fs.access(path.join(target, "artifacts/generated-1.0.0.zip")).then(() => true, () => false)) { interrupted = true; throw new Error("interrupted"); }
    } })).rejects.toThrow("interrupted");
    expect(interrupted).toBe(true);
    await fs.writeFile(path.join(target, "custom.py"), "# keep this edit\n");
    const retried = await importPackage();
    expect(retried.extractedPath).toBe(target);
    expect(await fs.readFile(path.join(target, "custom.py"), "utf8")).toBe("# keep this edit\n");
    expect((await readProjectBlueprintState(target))?.baselineHash).toBe(specificationHash(spec));
  });

  it.each(["checksum", "nested-zip", "undeclared", "reserved", "traversal", "version"])("rejects a %s problem before modifying the destination", async (problem) => {
    await fs.writeFile(archivePath, packageBytes((zip, manifest) => {
      if (problem === "checksum") zip.updateFile("runtime/adapter.py", Buffer.from("tampered"));
      if (problem === "nested-zip") zip.updateFile("artifacts/generated-1.0.0.zip", Buffer.from("tampered"));
      if (problem === "undeclared") zip.addFile("unknown.py", Buffer.from("undeclared"));
      if (problem === "reserved") zip.addFile(GENERATION_MARKER, Buffer.from("{}"));
      if (problem === "traversal") manifest.files[0].path = "../escape.json";
      if (problem === "version") manifest.version = "2.0.0";
    }));
    await expect(importPackage()).rejects.toThrow();
    await expect(fs.access(parent)).rejects.toThrow();
  });

  it("cancels before installation without a destination, then retries the same package", async () => {
    await expect(importPackage({ assertCurrent: () => { throw new Error("cancelled"); } })).rejects.toThrow("cancelled");
    await expect(fs.access(parent)).rejects.toThrow();
    expect((await importPackage()).extractedPath).toBe(path.join(parent, "Round-Trip-v1.0.0"));
  });

  it("retains explicit local-driver immutable source/asset pins without migrating providers or promoting lineage", async () => {
    const bytes = Buffer.from("# authored adapter\n");
    const pin = { storageDriverId: "local", fileRecordId: "22222222-2222-4222-8222-222222222222", fileVersionId: "33333333-3333-4333-8333-333333333333", fileVersionNumber: 1, checksumSha256: sha(bytes) };
    const sourceRevision = { ...pin, revisionRef: `source-snapshot:${applicationId}:44444444-4444-4444-8444-444444444444`, assets: [{ ...pin, path: "runtime/adapter.py" }] };
    await fs.writeFile(archivePath, packageBytes((_zip, manifest) => { manifest.sourceRevision = sourceRevision; }));
    const imported = await importPackage();
    const retained = JSON.parse(await fs.readFile(path.join(imported.extractedPath, "source-manifest.json"), "utf8"));
    expect(retained.sourceRevision).toEqual(sourceRevision);
    expect((await readGenerationManifest(imported.extractedPath))?.generation).toBeUndefined();
    expect(() => validateProjectSourceRevision(sourceRevision, applicationId, new Map([["runtime/adapter.py", bytes]]), true)).toThrow(/durable S3.*fallback/);
  });

  it("retains an exported canonical Blueprint ETag instead of inventing or refreshing a base during import", async () => {
    const blueprint = { applicationId, specificationPath: "openapi.json", backend: "https://api.example/v1", specId: "22222222-2222-4222-8222-222222222222", etag: "a".repeat(64) };
    await fs.writeFile(archivePath, packageBytes((_zip, manifest) => { manifest.blueprint = blueprint; }));
    const imported = await importPackage();
    expect(await readProjectBlueprintState(imported.extractedPath)).toMatchObject(blueprint);
    await fs.writeFile(archivePath, packageBytes((_zip, manifest) => { manifest.blueprint = { ...blueprint, etag: "b".repeat(64) }; }));
    await importPackage();
    expect((await readProjectBlueprintState(imported.extractedPath))?.etag).toBe("a".repeat(64));
  });

  it("rejects a production export advertising proved generation without frozen FileVersion inputs", async () => {
    await fs.writeFile(archivePath, packageBytes((zip, manifest) => {
      const value = JSON.parse(zip.readAsText("generation-lineage.json"));value.scope = "production";value.productionGenerationProven = true;
      const bytes = Buffer.from(JSON.stringify(value));zip.updateFile("generation-lineage.json", bytes);
      Object.assign(manifest.files.find((item: any) => item.path === "generation-lineage.json"), { sha256: sha(bytes), bytes: bytes.length });
    }));
    await expect(importPackage()).rejects.toThrow(/frozen source revision.*FileVersion/);
    await expect(fs.access(parent)).rejects.toThrow();
  });

  it.each(["driver", "versionId", "versionNumber", "assetVersion", "checksum", "application"])("rejects an incomplete or mismatched frozen source pin (%s)", async (problem) => {
    const bytes = Buffer.from("# authored adapter\n");
    const pin: any = { storageDriverId: "local", fileRecordId: "22222222-2222-4222-8222-222222222222", fileVersionId: "33333333-3333-4333-8333-333333333333", fileVersionNumber: 1, checksumSha256: sha(bytes) };
    const value = { ...pin, revisionRef: `source-snapshot:${applicationId}:44444444-4444-4444-8444-444444444444`, assets: [{ ...pin, path: "runtime/adapter.py" }] };
    if (problem === "driver") delete value.storageDriverId;
    if (problem === "versionId") value.fileVersionId = null;
    if (problem === "versionNumber") value.fileVersionNumber = null;
    if (problem === "assetVersion") value.assets[0].fileVersionId = null;
    if (problem === "checksum") value.assets[0].checksumSha256 = "f".repeat(64);
    if (problem === "application") value.revisionRef = value.revisionRef.replace(applicationId, pin.fileRecordId);
    expect(() => validateProjectSourceRevision(value, applicationId, new Map([["runtime/adapter.py", bytes]]))).toThrow();
    await fs.writeFile(archivePath, packageBytes((_zip, manifest) => { manifest.sourceRevision = value; }));
    await expect(importPackage()).rejects.toThrow(); await expect(fs.access(parent)).rejects.toThrow();
  });
});
