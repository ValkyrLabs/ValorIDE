import fs from "fs/promises";
import path from "path";
import { createHash, randomBytes } from "crypto";
import { committedGeneratorPolicy, GENERATOR_POLICY } from "./generatedProjectPolicy";

export const GENERATION_MARKER = ".valoride-generation.json";
const activeProjects = new Set<string>();
const sha256 = (data: Buffer) => createHash("sha256").update(data).digest("hex");

export interface GeneratedProjectIdentity {
  applicationId: string;
  applicationName: string;
  applicationVersion: string;
}

interface FileBaseline {
  appliedHash?: string;
  pendingHash?: string;
}

export interface GeneratedProjectProvenance {
  requestRef: string;
  receiptRef: string;
  generationRunRef: string;
  artifactRef: string;
  fileRecordId: string;
  checksum: string;
  tenantId: string;
  accountId: string;
  specRevisionRef?: string;
  buildRunRef?: string;
  testRunRef?: string;
  runtimeBindingRef?: string;
}

export interface GeneratedProjectManifest extends GeneratedProjectIdentity {
  schemaVersion: 2;
  source: "valkyrai";
  direction: "valkyrai-to-valoride";
  editableUpstreamSurface: "openapi-only";
  generatedAt: string;
  files: Record<string, FileBaseline>;
  preservedFiles: string[];
  generation?: GeneratedProjectProvenance;
  generatedFiles?: string[];
}

export interface GeneratedProjectInstallOptions {
  mode?: "import" | "regenerate";
  /** Paths from the checksum-verified generator ZIP, before authored source or editor configuration is added. */
  generatedFiles?: string[];
  confirmOverwrite?: (affectedPaths: string[]) => boolean | Promise<boolean>;
}

export function canonicalProjectFolder(name: string, version: string): string {
  const safeName = name.normalize("NFKC").trim().replace(/[^\p{L}\p{N}._-]+/gu, "-").replace(/^[.-]+|[.-]+$/g, "");
  if (!safeName || safeName.length > 100 || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(safeName))
    throw new Error("Save a project name before downloading the application.");
  const safeVersion = version.trim();
  if (!/^[a-z0-9][a-z0-9._+-]{0,63}$/i.test(safeVersion) || safeVersion.includes(".."))
    throw new Error("The application needs a valid OpenAPI info.version (for example 1.0.0) before downloading.");
  return `${safeName}-v${safeVersion}`;
}

const statOrMissing = async (file: string) => fs.lstat(file).catch((error) => {
  if (error.code === "ENOENT") return undefined;
  throw error;
});

export async function assertNoProjectLinks(root: string, relative = ""): Promise<void> {
  if (relative && (path.isAbsolute(relative) || relative.split(/[\\/]/).some((part) => part === "..")))
    throw new Error(`Unsafe generated project path: ${relative}`);
  // Check ancestors as well: a configured artifact directory may itself point outside the workspace.
  const absolute = path.resolve(root, relative);
  let current = path.parse(absolute).root;
  for (const part of absolute.slice(current.length).split(path.sep)) {
    current = path.join(current, part);
    const stat = await statOrMissing(current);
    if (stat?.isSymbolicLink()) throw new Error(`Generated project path contains a symbolic link: ${current}`);
    if (current !== absolute && stat && !stat.isDirectory())
      throw new Error(`A project file blocks the directory ${current}. Move it before retrying.`);
  }
}

async function listFiles(root: string, relative = ""): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await fs.readdir(path.join(root, relative), { withFileTypes: true })) {
    const file = path.posix.join(relative, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Generated archive contains a symbolic link: ${file}`);
    if (entry.isDirectory()) files.push(...await listFiles(root, file));
    else if (entry.isFile()) files.push(file);
    else throw new Error(`Unsupported generated project entry: ${file}`);
  }
  return files.sort();
}

async function atomicWrite(file: string, data: string | Buffer, createOnly = false): Promise<void> {
  const temporary = `${file}.valoride-${randomBytes(6).toString("hex")}.tmp`;
  try {
    await fs.writeFile(temporary, data, { flag: "wx" });
    if (createOnly) await fs.link(temporary, file);
    else await fs.rename(temporary, file);
  } finally {
    await fs.rm(temporary, { force: true });
  }
}

export async function readGenerationManifest(root: string): Promise<GeneratedProjectManifest | undefined> {
  const file = path.join(root, GENERATION_MARKER);
  await assertNoProjectLinks(root, GENERATION_MARKER);
  try {
    const value = JSON.parse(await fs.readFile(file, "utf8"));
    if (value.schemaVersion !== 2 || typeof value.applicationId !== "string" || typeof value.applicationName !== "string" || typeof value.applicationVersion !== "string" || !value.files || typeof value.files !== "object" || Array.isArray(value.files))
      throw new Error("Unsupported generated-project baseline. Run ValorIDE: Preview Legacy Project Migration to review a separate canonical copy, or keep this folder and download into a new version.");
    for (const [relative, record] of Object.entries(value.files)) {
      if (!relative || relative === "." || relative === GENERATION_MARKER || path.isAbsolute(relative) || relative.split(/[\\/]/).includes("..") || !record || typeof record !== "object")
        throw new Error("Invalid generated-project baseline. Keep this folder and download into a new version.");
      for (const hash of Object.values(record)) {
        if (hash !== undefined && (typeof hash !== "string" || !/^[a-f0-9]{64}$/.test(hash)))
          throw new Error("Invalid generated-project file hash. Keep this folder and download into a new version.");
      }
    }
    if (value.generatedFiles !== undefined && (!Array.isArray(value.generatedFiles) || value.generatedFiles.some((relative: unknown) => typeof relative !== "string" || !value.files[relative])))
      throw new Error("Invalid generated ownership manifest. Import the canonical project package into a new folder.");
    return value;
  } catch (error) {
    if (error.code === "ENOENT") return undefined;
    throw error;
  }
}

/** Re-downloads from an opened canonical project must update that project, not create a nested .thorapi copy. */
export async function generatedProjectDestination(workspaceRoot: string, artifactParent: string, applicationId: string): Promise<{ parent: string; standalone: boolean }> {
  const manifest = await readGenerationManifest(workspaceRoot);
  if (manifest?.applicationId.toLowerCase() === applicationId.toLowerCase()) {
    if (path.basename(workspaceRoot).toLowerCase() !== canonicalProjectFolder(manifest.applicationName, manifest.applicationVersion).toLowerCase())
      throw new Error("This project folder was renamed. Restore its project-name/version folder name or open the parent workspace before regenerating.");
    return { parent: path.dirname(workspaceRoot), standalone: true };
  }
  return { parent: artifactParent, standalone: false };
}

/** A write-ahead hash baseline makes interrupted setup safe to retry without adopting unknown files. */
export async function installGeneratedProject(
  incomingRoot: string,
  parent: string,
  identity: GeneratedProjectIdentity & { generation?: GeneratedProjectProvenance },
  assertCurrent?: () => void | Promise<void>,
  options: GeneratedProjectInstallOptions = {},
): Promise<{ extractedPath: string; preservedFiles: string[]; updatedFiles: string[] }> {
  const extractedPath = path.join(parent, canonicalProjectFolder(identity.applicationName, identity.applicationVersion));
  if (activeProjects.has(extractedPath.toLowerCase())) throw new Error("This project version is already being updated. Wait for it to finish before retrying.");
  activeProjects.add(extractedPath.toLowerCase());
  try {
    await assertCurrent?.();
    await assertNoProjectLinks(extractedPath);
    const existing = await readGenerationManifest(extractedPath);
    if (existing && (existing.applicationId.toLowerCase() !== identity.applicationId.toLowerCase() || existing.applicationVersion !== identity.applicationVersion || existing.applicationName !== identity.applicationName))
      throw new Error("Another application already uses this project name and version. Rename this application or change its version before downloading.");
    const incomingFiles = await listFiles(incomingRoot);
    const generatedFiles = options.generatedFiles || existing?.generatedFiles || [];
    if (generatedFiles.some((relative) => !incomingFiles.includes(relative) || relative === GENERATOR_POLICY))
      throw new Error("The generated ownership manifest contains a missing or reserved file.");
    if (options.mode === "regenerate" && options.generatedFiles === undefined)
      throw new Error("Regeneration requires the canonical generator's file ownership manifest. Existing files were preserved.");
    const owned = new Set(generatedFiles);
    const ignored = options.mode === "regenerate" ? await committedGeneratorPolicy(extractedPath) : () => false;
    const incoming = new Map<string, Buffer>();
    const plans: Array<{ relative: string; expectedHash?: string; hash: string }> = [];
    const preservedFiles: string[] = [];
    const affectedPaths: string[] = [];
    const files: Record<string, FileBaseline> = Object.assign(Object.create(null), existing?.files || {});
    // Complete path/type validation before creating or changing any project file.
    for (const relative of incomingFiles) {
      if (relative === GENERATION_MARKER || relative.split("/").some((part) => /^\.valoride-.*\.tmp$/.test(part)))
        throw new Error(`The archive contains reserved ValorIDE metadata: ${relative}`);
      await assertNoProjectLinks(extractedPath, relative);
      const target = path.join(extractedPath, relative);
      const stat = await statOrMissing(target);
      if (stat && !stat.isFile()) throw new Error(`A project directory blocks generated file ${relative}. Move it before retrying.`);
      const data = await fs.readFile(path.join(incomingRoot, relative));
      incoming.set(relative, data);
      const hash = sha256(data);
      const currentHash = stat ? sha256(await fs.readFile(target)) : undefined;
      const record = files[relative];
      if (currentHash && record?.pendingHash === currentHash) files[relative] = { appliedHash: currentHash };
      const baseline = files[relative]?.appliedHash;
      const replaceGenerated = options.mode === "regenerate" && owned.has(relative) && Boolean(baseline) && !ignored(relative);
      if (options.mode === "regenerate" && owned.has(relative) && ignored(relative)) {
        files[relative] ||= {};
        preservedFiles.push(relative);
      } else if ((!stat && !baseline) || replaceGenerated || (baseline && currentHash === baseline)) {
        plans.push({ relative, expectedHash: currentHash, hash });
        files[relative] = { appliedHash: baseline, pendingHash: hash };
        if (replaceGenerated && currentHash !== hash) affectedPaths.push(relative);
      } else {
        if (owned.has(relative)) files[relative] ||= {};
        preservedFiles.push(relative);
      }
    }
    await assertCurrent?.();
    if (affectedPaths.length) {
      if (!options.confirmOverwrite) throw new Error(`Review replacement of generated files before retrying: ${affectedPaths.join(", ")}`);
      if (!await options.confirmOverwrite(affectedPaths)) throw new Error("Regeneration cancelled; no project files were changed.");
      await assertCurrent?.();
    }
    await fs.mkdir(extractedPath, { recursive: true });
    const manifest: GeneratedProjectManifest = {
      ...identity, schemaVersion: 2, source: "valkyrai", direction: "valkyrai-to-valoride",
      editableUpstreamSurface: "openapi-only", generatedAt: new Date().toISOString(), files, preservedFiles, generatedFiles,
    };
    const save = () => atomicWrite(path.join(extractedPath, GENERATION_MARKER), JSON.stringify(manifest, null, 2) + "\n");
    await save();
    const updatedFiles: string[] = [];
    for (const plan of plans) {
      await assertCurrent?.();
      await assertNoProjectLinks(extractedPath, plan.relative);
      const target = path.join(extractedPath, plan.relative);
      const stat = await statOrMissing(target);
      const currentHash = stat?.isFile() ? sha256(await fs.readFile(target)) : undefined;
      // Recheck immediately before writing in case an editor saved while setup was running.
      if (currentHash !== plan.expectedHash || (stat && !stat.isFile())) {
        preservedFiles.push(plan.relative);
        delete files[plan.relative].pendingHash;
        continue;
      }
      await fs.mkdir(path.dirname(target), { recursive: true });
      if (stat) await atomicWrite(target, incoming.get(plan.relative)!);
      else {
        try {
          await atomicWrite(target, incoming.get(plan.relative)!, true);
        } catch (error) {
          if (error.code !== "EEXIST") throw error;
          preservedFiles.push(plan.relative);
          delete files[plan.relative].pendingHash;
          continue;
        }
      }
      files[plan.relative] = { appliedHash: plan.hash };
      updatedFiles.push(plan.relative);
    }
    await save();
    return { extractedPath, preservedFiles, updatedFiles };
  } finally {
    activeProjects.delete(extractedPath.toLowerCase());
  }
}
