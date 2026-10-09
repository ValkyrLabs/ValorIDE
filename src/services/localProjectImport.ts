import fs from "fs/promises";
import path from "path";
import os from "os";
import { createHash } from "crypto";
import AdmZip from "adm-zip";
import { extractLocalZip, isZipBuffer } from "../utils/zipExtractor";
import { canonicalProjectFolder, generatedProjectDestination, installGeneratedProject, assertNoProjectLinks, GENERATION_MARKER, GeneratedProjectProvenance } from "./generatedProjectInstall";
import { initializeGeneratedProject, connectGeneratedSources } from "./generatedProjectConfiguration";
import { BLUEPRINT_MARKER, PROJECT_UUID, initializeProjectBlueprintState, readProjectBlueprintState, parseProjectSpecification, safeProjectRelativePath, specificationHash, normalizeBlueprintBackend, ProjectBlueprintState } from "./projectBlueprintSync";

const sha256 = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
const reserved = (relative: string) => [GENERATION_MARKER, BLUEPRINT_MARKER].includes(relative.toLowerCase()) || relative.split("/").some((part) => /^\.valoride-.*\.tmp$/i.test(part));
const MAX_ARCHIVE_BYTES = 95 * 1024 * 1024;

/** Exported pins describe an immutable server input; only the authorized server resolver can authenticate them. */
export function validateProjectSourceRevision(value: any, applicationId: string, sourceFiles: Map<string, Buffer>, requireS3 = false): void {
  if (value?.artifactId) {
    const prefix = `source-snapshot:${applicationId}:`;
    if (value.applicationId !== applicationId || !PROJECT_UUID.test(value.artifactId) || !PROJECT_UUID.test(value.organizationId) || !PROJECT_UUID.test(value.projectId) || value.revisionRef !== `${prefix}${value.artifactId}` || !/^[a-f0-9]{64}$/.test(value.checksumSha256 || "") || !Number.isSafeInteger(value.sizeBytes) || value.sizeBytes < 1 || value.sizeBytes > 128 * 1024 * 1024 || (value.commitSha != null && !/^[a-f0-9]{40}$/.test(value.commitSha)) || (value.treeSha != null && !/^[a-f0-9]{40}$/.test(value.treeSha)))
      throw new Error("The developer source revision has invalid Application, Project, organization or immutable artifact evidence.");
    return; // A descriptive exported pin grants no hosted access; the server rechecks grants and S3 bytes.
  }
  const pin = (item: any) => {
    if (!item || !/^[a-z][a-z0-9_.-]{0,63}$/.test(item.storageDriverId || "") || !PROJECT_UUID.test(item.fileRecordId) || !PROJECT_UUID.test(item.fileVersionId) || !Number.isSafeInteger(item.fileVersionNumber) || item.fileVersionNumber < 1 || !/^[a-f0-9]{64}$/.test(item.checksumSha256 || ""))
      throw new Error("A frozen source revision requires an explicit storageDriverId, FileRecord, immutable FileVersion id/number and checksum. Unversioned uploaded assets cannot be used as frozen generation inputs.");
    if (requireS3 && item.storageDriverId !== "s3") throw new Error("Production round-trip source must be pinned to durable S3 storage. Local storage fallback is unavailable; verify the approved migration before exporting.");
  };
  pin(value);
  const prefix = `source-snapshot:${applicationId}:`;
  if (typeof value.revisionRef !== "string" || !value.revisionRef.startsWith(prefix) || !PROJECT_UUID.test(value.revisionRef.slice(prefix.length)))
    throw new Error("The frozen source revision belongs to another Application or has no immutable revision reference.");
  if (!Array.isArray(value.assets) || !value.assets.length) throw new Error("The frozen source revision must retain the immutable pins for its referenced uploaded assets.");
  const seen = new Set<string>();
  for (const asset of value.assets) {
    pin(asset);
    const relative = safeProjectRelativePath(asset.path);
    if (seen.has(relative.toLowerCase()) || !sourceFiles.has(relative) || sha256(sourceFiles.get(relative)!) !== asset.checksumSha256)
      throw new Error(`The pinned uploaded asset does not match its exported source: ${relative}`);
    seen.add(relative.toLowerCase());
  }
}

/** Check bounds and ambiguity before extraction; the shared extractor checks traversal and links. */
function validateArchive(bytes: Buffer): void {
  if (bytes.length > MAX_ARCHIVE_BYTES || !isZipBuffer(bytes)) throw new Error("Choose a project-export ZIP smaller than 95 MiB.");
  const entries = new AdmZip(bytes).getEntries();
  if (!entries.length || entries.length > 25000) throw new Error("The project archive is empty or contains too many entries.");
  const seen = new Set<string>();
  let expanded = 0;
  for (const entry of entries) {
    const relative = safeProjectRelativePath(entry.entryName.replace(/\/$/, ""));
    if (reserved(relative) || seen.has(relative.toLowerCase())) throw new Error(`The archive contains reserved or duplicate project metadata: ${relative}`);
    seen.add(relative.toLowerCase());
    expanded += entry.header.size;
    if (entry.header.size > 95 * 1024 * 1024 || expanded > 500 * 1024 * 1024) throw new Error("The expanded project archive exceeds the source-package limits.");
  }
}

async function listPackageFiles(directory: string, prefix = ""): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) files.push(...await listPackageFiles(path.join(directory, entry.name), relative));
    else if (entry.isFile()) files.push(relative);
    else throw new Error(`Unsupported project package entry: ${relative}`);
  }
  return files;
}

/** Verify a portable envelope before using its project source; retain its complete original closure. */
async function readPortableEnvelope(packageRoot: string, assertCurrent?: () => void | Promise<void>): Promise<Map<string, Buffer> | undefined> {
  const bytes = await fs.readFile(path.join(packageRoot, "export-manifest.json")).catch((error) => {
    if (error.code === "ENOENT") return undefined;
    throw error;
  });
  if (!bytes) return undefined;
  const manifest = JSON.parse(bytes.toString("utf8"));
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.files) || !manifest.files.length)
    throw new Error("The portable export manifest is invalid. Export the complete project package again.");
  const files = new Map<string, Buffer>([["export-manifest.json", bytes]]);
  const seen = new Set(["export-manifest.json"]);
  for (const item of manifest.files) {
    const relative = safeProjectRelativePath(item.path);
    if (reserved(relative) || seen.has(relative.toLowerCase()) || !/^[a-f0-9]{64}$/.test(item.sha256) || !Number.isSafeInteger(item.bytes) || item.bytes < 0)
      throw new Error(`Invalid portable export entry: ${relative}`);
    seen.add(relative.toLowerCase());
    await assertCurrent?.();
    const content = await fs.readFile(path.join(packageRoot, relative));
    if (content.length !== item.bytes || sha256(content) !== item.sha256) throw new Error(`Portable export checksum mismatch: ${relative}`);
    files.set(relative, content);
  }
  if (!files.has("project/source-manifest.json")) throw new Error("The portable export is missing project/source-manifest.json.");
  for (const relative of await listPackageFiles(packageRoot)) if (!seen.has(relative.toLowerCase())) throw new Error(`The portable export contains undeclared source: ${relative}`);
  return files;
}

export interface LocalProjectImportRequest {
  archivePath: string;
  parent: string;
  workspaceRoot?: string;
  assertCurrent?: () => void | Promise<void>;
  onProgress?: (message: string) => void | Promise<void>;
  /** Only the authenticated native generation path supplies verified receipt provenance. */
  expectedGeneration?: { applicationId: string; applicationVersion?: string; backend: string; provenance: GeneratedProjectProvenance };
  mode?: "import" | "regenerate";
  confirmOverwrite?: (affectedPaths: string[]) => boolean | Promise<boolean>;
}

export async function importLocalProjectPackage({ archivePath, parent, workspaceRoot, assertCurrent, onProgress, expectedGeneration, mode = "import", confirmOverwrite }: LocalProjectImportRequest): Promise<{ extractedPath: string; preservedFiles: string[]; configurationWarnings: string[]; specificationPath: string; packageSha256: string; applicationVersion: string }> {
  let staging: string | undefined;
  try {
    await assertCurrent?.();
    await onProgress?.("Checking the project package and source checksums...");
    const archiveStat = await fs.stat(archivePath);
    if (!archiveStat.isFile() || archiveStat.size > MAX_ARCHIVE_BYTES) throw new Error("Choose a project-export ZIP smaller than 95 MiB.");
    const archive = await fs.readFile(archivePath);
    validateArchive(archive);
    staging = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "valoride-project-import-")));
    const packagePath = path.join(staging, "project-export.zip");
    await fs.writeFile(packagePath, archive);
    const packageRoot = await extractLocalZip(packagePath, staging, "project-package", { fresh: true });
    const envelope = await readPortableEnvelope(packageRoot, assertCurrent);
    const sourceRoot = envelope ? path.join(packageRoot, "project") : packageRoot;
    const manifestBytes = await fs.readFile(path.join(sourceRoot, "source-manifest.json"), "utf8").catch(() => { throw new Error("This ZIP is missing source-manifest.json. Export the complete project package, including editable source and the original generated ZIP."); });
    const manifest = JSON.parse(manifestBytes);
    if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.files) || !manifest.files.length || typeof manifest.version !== "string")
      throw new Error("The project source manifest is invalid. Export the complete canonical project package again.");
    const sourceFiles = new Map<string, Buffer>();
    const allowed = new Set(["source-manifest.json"]);
    for (const item of manifest.files) {
      const relative = safeProjectRelativePath(item.path);
      if (reserved(relative) || allowed.has(relative.toLowerCase()) || !/^[a-f0-9]{64}$/.test(item.sha256) || !Number.isSafeInteger(item.bytes) || item.bytes < 0)
        throw new Error(`Invalid source manifest entry: ${relative}`);
      if (envelope && (relative.toLowerCase() === "export-reference" || relative.toLowerCase().startsWith("export-reference/")))
        throw new Error("Project source conflicts with the reserved portable export-reference folder.");
      allowed.add(relative.toLowerCase());
      await assertCurrent?.();
      const bytes = await fs.readFile(path.join(sourceRoot, relative));
      if (bytes.length !== item.bytes || sha256(bytes) !== item.sha256) throw new Error(`Source checksum mismatch: ${relative}. Export the project package again.`);
      sourceFiles.set(relative, bytes);
    }
    const lineageBytes = sourceFiles.get("generation-lineage.json");
    if (!lineageBytes) throw new Error("The project package is missing its original generation-lineage.json.");
    const lineage = JSON.parse(lineageBytes.toString("utf8"));
    if (manifest.applicationId !== undefined && manifest.applicationId !== lineage.applicationId)
      throw new Error("The project manifest and generation lineage belong to different Applications. Export the complete package from the intended Application.");
    if (manifest.receiptRef !== undefined && manifest.receiptRef !== lineage.receiptRef)
      throw new Error("The project manifest and generation lineage identify different generation receipts. Export the complete package again.");
    if (expectedGeneration) {
      const proof = expectedGeneration.provenance;
      if (lineage.applicationId !== expectedGeneration.applicationId || manifest.applicationId !== expectedGeneration.applicationId ||
          manifest.receiptRef !== proof.receiptRef || lineage.receiptRef !== proof.receiptRef || lineage.requestRef !== proof.requestRef ||
          lineage.generationRunRef !== proof.generationRunRef || lineage.artifactRef !== proof.artifactRef || lineage.generatedPackageChecksumSha256 !== proof.checksum ||
          (expectedGeneration.applicationVersion && manifest.version !== expectedGeneration.applicationVersion))
        throw new Error("The complete project export does not match this Application's accepted generation receipt or API version. Existing project files were preserved; retry the same receipt.");
      if (mode !== "regenerate") throw new Error("Verified generation exports must use the reviewed regeneration path.");
    } else if (mode === "regenerate") {
      throw new Error("Regeneration requires the Application's verified receipt. Use Import Local Project Package for an offline export.");
    }
    if ((lineage.scope === "canonical_application_generation" || (manifest.sourceRevision && lineage.sourceRevision)) && specificationHash(manifest.sourceRevision ?? null) !== specificationHash(lineage.sourceRevision ?? null))
      throw new Error("The project manifest and lineage identify different frozen source revisions. Export the complete package again.");
    if (!PROJECT_UUID.test(lineage.applicationId) || !/^[a-f0-9]{64}$/.test(lineage.packageSha256)) throw new Error("The project generation lineage has no valid application identity or generated ZIP checksum.");
    if (manifest.sourceRevision) validateProjectSourceRevision(manifest.sourceRevision, lineage.applicationId, sourceFiles, lineage.scope === "production");
    else if (lineage.scope === "production" && lineage.productionGenerationProven === true)
      throw new Error("A production project export must retain its frozen source revision and immutable FileVersion pins. Export a complete canonical project package.");
    const canonical = lineage.scope === "canonical_application_generation";
    const generatedPath = safeProjectRelativePath(canonical ? "export-reference/generator-original.zip" : `artifacts/generated-${manifest.version}.zip`);
    allowed.add(generatedPath.toLowerCase());
    const original = await fs.readFile(path.join(packageRoot, generatedPath));
    if (sha256(original) !== lineage.packageSha256) throw new Error("The original generated ZIP does not match its lineage checksum.");
    validateArchive(original);
    if (lineage.originalGeneratorChecksumSha256 !== undefined && lineage.originalGeneratorChecksumSha256 !== sha256(original))
      throw new Error("The canonical original generator checksum disagrees with its exported ZIP. Export the complete package again.");
    if (envelope) {
      for (const relative of await listPackageFiles(sourceRoot)) if (!allowed.has(relative.toLowerCase())) throw new Error(`The project package contains undeclared source: ${relative}`);
      if (!envelope.has(generatedPath)) throw new Error("The portable export must declare its original generated ZIP.");
    } else {
      for (const relative of await listPackageFiles(packageRoot)) if (!allowed.has(relative.toLowerCase())) throw new Error(`The project package contains undeclared source: ${relative}`);
    }
    const requestedSpec = manifest.blueprint?.specificationPath || manifest.specificationPath;
    const candidates: Array<{ relative: string; specification: Record<string, any> }> = [];
    for (const [relative, bytes] of sourceFiles) {
      if (requestedSpec ? relative !== requestedSpec : !/\.(json|ya?ml)$/i.test(relative)) continue;
      try { candidates.push({ relative, specification: parseProjectSpecification(bytes) }); }
      catch (error) { if (requestedSpec) throw error; }
    }
    if (candidates.length !== 1) throw new Error("The package must identify one editable OpenAPI source using specificationPath in source-manifest.json.");
    const { relative: specificationPath, specification } = candidates[0];
    if (specification.info.version !== manifest.version) throw new Error("The editable spec and project manifest versions differ. Export a consistent project package.");
    if (lineage.specChecksumSha256 !== undefined && lineage.specChecksumSha256 !== sha256(sourceFiles.get(specificationPath)!))
      throw new Error("The editable Blueprint does not match the generation's admitted specification. Export the complete package again.");
    const identity = { applicationId: lineage.applicationId, applicationName: specification.info.title, applicationVersion: manifest.version,
      ...(expectedGeneration ? { generation: expectedGeneration.provenance } : {}) };
    canonicalProjectFolder(identity.applicationName, identity.applicationVersion);
    const state: ProjectBlueprintState = { schemaVersion: 1, applicationId: identity.applicationId, specificationPath, baselineHash: specificationHash(specification) };
    if (manifest.blueprint) {
      const binding = manifest.blueprint;
      if (binding.applicationId !== identity.applicationId || !PROJECT_UUID.test(binding.specId) || !/^[a-f0-9]{64}$/.test(binding.etag) || typeof binding.backend !== "string")
        throw new Error("The exported canonical Blueprint binding is invalid.");
      Object.assign(state, { backend: normalizeBlueprintBackend(binding.backend), specId: binding.specId, etag: binding.etag });
    }
    if (expectedGeneration) state.backend = normalizeBlueprintBackend(expectedGeneration.backend);
    await assertCurrent?.();
    const incoming = await extractLocalZip(path.join(packageRoot, generatedPath), staging, identity.applicationName, { fresh: true });
    const generatedFiles = (await listPackageFiles(incoming)).filter((relative) => relative !== ".valoride-generator-ignore");
    if (lineage.generatedFiles !== undefined && (!Array.isArray(lineage.generatedFiles) ||
        JSON.stringify([...lineage.generatedFiles].sort()) !== JSON.stringify([...generatedFiles].sort())))
      throw new Error("The canonical generator ownership list disagrees with the original ZIP. Existing project files were preserved.");
    if (expectedGeneration && !Array.isArray(lineage.generatedFiles))
      throw new Error("The complete generation export has no verified generator ownership list. Export the complete package again.");
    if (envelope && generatedFiles.some((relative) => relative.toLowerCase() === "export-reference" || relative.toLowerCase().startsWith("export-reference/")))
      throw new Error("Generated source conflicts with the reserved portable export-reference folder.");
    try {
      const plan = JSON.parse(await fs.readFile(path.join(incoming, "generation-plan.json"), "utf8"));
      if (plan.api?.version && plan.api.version !== manifest.version) throw new Error("The original generated ZIP has another API version. Export a consistent project package.");
    } catch (error) { if (error.code !== "ENOENT") throw error; }
    const retainedEnvelope: Array<[string, Buffer]> = envelope ? [...envelope].map(([relative, bytes]) => [`export-reference/${relative}`, bytes]) : [];
    for (const [relative, bytes] of [...sourceFiles, ["source-manifest.json", Buffer.from(manifestBytes)], [generatedPath, original], ...retainedEnvelope] as Array<[string, Buffer]>) {
      await fs.mkdir(path.dirname(path.join(incoming, relative)), { recursive: true });
      await fs.writeFile(path.join(incoming, relative), bytes);
    }
    const configurationWarnings = await initializeGeneratedProject(incoming, identity.applicationName, identity.applicationVersion);
    const destination = workspaceRoot ? await generatedProjectDestination(workspaceRoot, parent, identity.applicationId) : { parent, standalone: false };
    const target = path.join(destination.parent, canonicalProjectFolder(identity.applicationName, identity.applicationVersion));
    await assertNoProjectLinks(target, BLUEPRINT_MARKER);
    const existingState = await readProjectBlueprintState(target);
    if (existingState && (existingState.applicationId.toLowerCase() !== identity.applicationId.toLowerCase() || existingState.specificationPath !== specificationPath))
      throw new Error("This folder is bound to another Application or editable specification. Import into a new folder.");
    if (mode === "regenerate" && existingState?.pending)
      throw new Error("Retry the pending Blueprint synchronization before regenerating this project; local edits and the saved base were preserved.");
    await assertCurrent?.();
    await onProgress?.("Installing project sources and preserving local edits...");
    // An imported lineage remains descriptive. It never grants hosted tenant access or manufactures a verified generation receipt.
    const installed = await installGeneratedProject(incoming, destination.parent, identity, assertCurrent, { mode, generatedFiles, confirmOverwrite });
    await initializeProjectBlueprintState(installed.extractedPath, state, mode === "regenerate" && !installed.preservedFiles.includes(specificationPath));
    await assertCurrent?.();
    const offset = workspaceRoot ? path.relative(workspaceRoot, installed.extractedPath) : undefined;
    const containingWorkspace = workspaceRoot && offset !== ".." && !offset!.startsWith(`..${path.sep}`) && !path.isAbsolute(offset!) ? workspaceRoot : installed.extractedPath;
    await connectGeneratedSources(installed.extractedPath, containingWorkspace, configurationWarnings);
    return { ...installed, specificationPath, configurationWarnings, packageSha256: sha256(archive), applicationVersion: manifest.version };
  } finally { if (staging) await fs.rm(staging, { recursive: true, force: true }); }
}
