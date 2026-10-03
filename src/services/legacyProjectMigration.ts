import fs from "fs/promises";
import path from "path";
import { createHash } from "crypto";
import { assertNoProjectLinks, canonicalProjectFolder, GENERATION_MARKER, GeneratedProjectIdentity, GeneratedProjectManifest } from "./generatedProjectInstall";

const digest = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const excluded = (name: string) => ["node_modules", ".git", "target", "dist", "build", ".vite", ".aws", ".ssh", ".DS_Store"].includes(name) || /^\.env(?:\.|$)/.test(name) || /\.(?:pem|key|p12|pfx)$/i.test(name);

export interface LegacyMigrationPlan {
  schemaVersion: 1;
  operation: "copy-legacy-project";
  source: string;
  destination: string;
  identity: GeneratedProjectIdentity;
  files: Record<string, string>;
  excludedPaths: string[];
  sourceMarkerHash: string;
  planHash: string;
}

export interface LegacyMigrationReceipt {
  plan: LegacyMigrationPlan;
  files: Record<string, string>;
}

/** Legacy markers did not contain file baselines or API versions. Never infer either from a UUID. */
export async function readLegacyProjectIdentity(source: string): Promise<GeneratedProjectIdentity | undefined> {
  await assertNoProjectLinks(source, GENERATION_MARKER);
  const marker = await fs.readFile(path.join(source, GENERATION_MARKER), "utf8").catch((error) => {
    if (error.code === "ENOENT") return undefined;
    throw error;
  });
  if (!marker) return undefined;
  const value = JSON.parse(marker);
  if (value.schemaVersion === 2) return undefined;
  if ((value.schemaVersion !== undefined && value.schemaVersion !== 1) || value.source !== "valkyrai" || !uuid.test(value.applicationId) || typeof value.applicationName !== "string")
    throw new Error("This folder does not contain a supported legacy ValkyrAI project marker.");
  let version = value.applicationVersion;
  await assertNoProjectLinks(source, "generation-plan.json");
  const plan = await fs.readFile(path.join(source, "generation-plan.json"), "utf8").catch((error) => {
    if (error.code === "ENOENT") return undefined;
    throw error;
  });
  const plannedVersion = plan ? JSON.parse(plan)?.api?.version : undefined;
  if (version && plannedVersion && version !== plannedVersion) throw new Error("The legacy marker and generation plan disagree about the API version. Review them before migration.");
  version ||= plannedVersion;
  if (typeof version !== "string") throw new Error("This legacy download has no verified API version. Add its original OpenAPI info.version to generation-plan.json before previewing migration.");
  canonicalProjectFolder(value.applicationName, version);
  return { applicationId: value.applicationId, applicationName: value.applicationName, applicationVersion: version };
}

async function snapshot(source: string, excludePrivate: boolean, relative = ""): Promise<{ files: Record<string, string>; excludedPaths: string[] }> {
  const files: Record<string, string> = Object.create(null);
  const excludedPaths: string[] = [];
  for (const entry of (await fs.readdir(path.join(source, relative), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const file = path.posix.join(relative, entry.name);
    if (excludePrivate && (excluded(entry.name) || file === GENERATION_MARKER)) { if (file !== GENERATION_MARKER) excludedPaths.push(file); continue; }
    if (entry.isSymbolicLink()) throw new Error(`Migration source contains a symbolic link: ${file}. Replace it with source files before retrying.`);
    if (entry.isDirectory()) {
      const child = await snapshot(source, excludePrivate, file);
      Object.assign(files, child.files); excludedPaths.push(...child.excludedPaths);
    } else if (entry.isFile()) files[file] = digest(await fs.readFile(path.join(source, file)));
    else throw new Error(`Unsupported migration source entry: ${file}`);
  }
  return { files, excludedPaths };
}

/** Read-only preview. The original is retained, caches/private files stay there, and unknown baselines stay protected. */
export async function planLegacyProjectMigration(source: string, parent?: string): Promise<LegacyMigrationPlan> {
  source = path.resolve(source);
  await assertNoProjectLinks(source);
  if (!(await fs.lstat(source)).isDirectory()) throw new Error("Choose the legacy project folder containing .valoride-generation.json.");
  const identity = await readLegacyProjectIdentity(source);
  if (!identity) throw new Error("This folder is already canonical or has no legacy generation marker.");
  const defaultParent = path.dirname(source);
  parent = path.resolve(parent || (uuid.test(path.basename(defaultParent)) ? path.dirname(defaultParent) : defaultParent));
  const destination = path.join(parent, canonicalProjectFolder(identity.applicationName, identity.applicationVersion));
  if (destination === source || destination.startsWith(source + path.sep)) throw new Error("Choose a destination outside the original project.");
  await assertNoProjectLinks(destination);
  const data = await snapshot(source, true);
  const plan = { schemaVersion: 1 as const, operation: "copy-legacy-project" as const, source, destination, identity, ...data, sourceMarkerHash: digest(await fs.readFile(path.join(source, GENERATION_MARKER))) };
  return { ...plan, planHash: digest(JSON.stringify(plan)) };
}

export async function applyLegacyProjectMigration(plan: LegacyMigrationPlan, assertCurrent?: () => void | Promise<void>): Promise<LegacyMigrationReceipt> {
  const current = await planLegacyProjectMigration(plan.source, path.dirname(plan.destination));
  if (JSON.stringify(current) !== JSON.stringify(plan)) throw new Error("The migration plan or original files changed. Preview the migration again before creating a copy.");
  await assertCurrent?.();
  const parent = path.dirname(plan.destination);
  await fs.mkdir(parent, { recursive: true });
  const stage = await fs.mkdtemp(path.join(parent, ".valoride-migrate-"));
  await fs.chmod(stage, 0o700);
  let reservation: Awaited<ReturnType<typeof fs.lstat>> | undefined;
  let published = false;
  try {
    for (const [relative, hash] of Object.entries(plan.files)) {
      await assertCurrent?.();
      await assertNoProjectLinks(plan.source, relative);
      const bytes = await fs.readFile(path.join(plan.source, relative));
      if (digest(bytes) !== hash) throw new Error("The original project changed during migration. Preview it again; no original files were modified.");
      const file = path.join(stage, relative);
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, bytes, { flag: "wx" });
    }
    const manifest: GeneratedProjectManifest = { ...plan.identity, schemaVersion: 2, source: "valkyrai", direction: "valkyrai-to-valoride", editableUpstreamSurface: "openapi-only", generatedAt: new Date().toISOString(), files: {}, preservedFiles: Object.keys(plan.files) };
    // Empty baselines are deliberate: legacy downloads have no evidence that any file remains unedited.
    const marker = JSON.stringify(manifest, null, 2) + "\n";
    await fs.writeFile(path.join(stage, GENERATION_MARKER), marker, { flag: "wx" });
    await assertCurrent?.();
    const finalPlan = await planLegacyProjectMigration(plan.source, parent);
    if (finalPlan.planHash !== plan.planHash) throw new Error("The original project changed during migration. Preview it again; no original files were modified.");
    await assertNoProjectLinks(plan.destination);
    try { await fs.mkdir(plan.destination); } catch (error) {
      if (error.code === "EEXIST") throw new Error("The canonical destination already exists. Keep both folders and review them; migration never merges or overwrites a project.");
      throw error;
    }
    reservation = await fs.lstat(plan.destination);
    // A rename can replace only our empty reservation. Any intervening files make it fail rather than overwrite them.
    await fs.rename(stage, plan.destination);
    published = true;
    return { plan, files: { ...plan.files, [GENERATION_MARKER]: digest(marker) } };
  } finally {
    await fs.rm(stage, { recursive: true, force: true });
    if (!published && reservation) {
      const stat = await fs.lstat(plan.destination).catch(() => undefined);
      if (stat?.ino === reservation.ino && stat.dev === reservation.dev) await fs.rmdir(plan.destination).catch(() => undefined);
    }
  }
}

/** Park only the exact unedited copy in a recovery folder; no project files are deleted. */
export async function undoLegacyProjectMigration(receipt: LegacyMigrationReceipt): Promise<string> {
  await assertNoProjectLinks(receipt.plan.destination);
  const current = await snapshot(receipt.plan.destination, false);
  if (Object.keys(current.files).length !== Object.keys(receipt.files).length || Object.entries(current.files).some(([file, hash]) => receipt.files[file] !== hash))
    throw new Error("The migrated copy contains changes or new files. Keep it and review those changes before undoing migration.");
  const recovery = await fs.mkdtemp(path.join(path.dirname(receipt.plan.destination), ".valoride-migration-undo-"));
  try { await fs.rename(receipt.plan.destination, path.join(recovery, path.basename(receipt.plan.destination))); }
  catch (error) { await fs.rmdir(recovery); throw error; }
  return recovery;
}
