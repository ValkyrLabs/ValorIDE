import fs from "fs/promises";
import path from "path";
import { createHash, randomBytes } from "crypto";
import * as yaml from "js-yaml";
import { assertNoProjectLinks, readGenerationManifest } from "./generatedProjectInstall";
import { getValkyrLabsRtkApiClient, ValkyrLabsApiError, ValkyrLabsRtkApiClient } from "./valkyrai/ValkyrLabsRtkApi";

export const BLUEPRINT_MARKER = ".valoride-blueprint.json";
export const PROJECT_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HASH = /^[a-f0-9]{64}$/;
const active = new Set<string>();

export interface ProjectBlueprintDocument {
  applicationId: string;
  specId: string;
  filename: string;
  etag: string;
  specification: Record<string, unknown>;
}

export interface ProjectBlueprintState {
  schemaVersion: 1;
  applicationId: string;
  specificationPath: string;
  baselineHash: string;
  backend?: string;
  etag?: string;
  specId?: string;
  pending?: { expectedEtag: string; specificationHash: string };
}

export function safeProjectRelativePath(relative: string): string {
  if (typeof relative !== "string" || !relative || relative.includes("\\") || /[\x00-\x1f]/.test(relative) || /^[a-z]:/i.test(relative) || path.posix.isAbsolute(relative) || relative.split("/").some((part) => !part || part === "." || part === ".."))
    throw new Error("The project package contains an unsafe source path.");
  return relative;
}

export function normalizeBlueprintBackend(backend: string): string {
  const url = new URL(backend);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash)
    throw new Error("Choose a ValkyrAI API host without embedded credentials, query parameters, or fragments.");
  return url.toString().replace(/\/$/, "");
}

/** Compare editable documents independently of JSON property order; never synthesize a server ETag. */
export function specificationHash(value: unknown): string {
  let nodes = 0;
  const ancestors = new Set<object>();
  const stable = (node: any, depth = 0): any => {
    if (++nodes > 100000 || depth > 100) throw new Error("The OpenAPI document is too complex to synchronize.");
    if (node === null || typeof node === "string" || typeof node === "boolean" || typeof node === "number") return node;
    if (!node || typeof node !== "object" || ancestors.has(node)) throw new Error("The OpenAPI document must contain JSON-compatible values without cycles.");
    ancestors.add(node);
    const result = Array.isArray(node) ? node.map((entry) => stable(entry, depth + 1)) : Object.fromEntries(Object.keys(node).sort().map((key) => [key, stable(node[key], depth + 1)]));
    ancestors.delete(node);
    return result;
  };
  return createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}

export function parseProjectSpecification(bytes: Buffer): Record<string, unknown> {
  if (bytes.length > 4 * 1024 * 1024) throw new Error("The editable OpenAPI document exceeds 4 MiB.");
  const value = yaml.load(bytes.toString("utf8"), { schema: yaml.JSON_SCHEMA }) as Record<string, any>;
  if (!value || typeof value !== "object" || Array.isArray(value) || !/^3\.[01](?:\.|$)/.test(value.openapi) || typeof value.info?.title !== "string" || typeof value.info?.version !== "string")
    throw new Error("Choose a complete OpenAPI 3 document with info.title and info.version.");
  specificationHash(value);
  return value;
}

async function writeState(root: string, state: ProjectBlueprintState, createOnly = false): Promise<void> {
  await assertNoProjectLinks(root, BLUEPRINT_MARKER);
  const target = path.join(root, BLUEPRINT_MARKER);
  const temporary = `${target}.valoride-${randomBytes(6).toString("hex")}.tmp`;
  try {
    await fs.writeFile(temporary, JSON.stringify(state, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    if (createOnly) await fs.link(temporary, target);
    else await fs.rename(temporary, target);
  } finally { await fs.rm(temporary, { force: true }); }
}

export async function readProjectBlueprintState(root: string): Promise<ProjectBlueprintState | undefined> {
  await assertNoProjectLinks(root, BLUEPRINT_MARKER);
  try {
    const value: ProjectBlueprintState = JSON.parse(await fs.readFile(path.join(root, BLUEPRINT_MARKER), "utf8"));
    if (value.schemaVersion !== 1 || !PROJECT_UUID.test(value.applicationId) || !HASH.test(value.baselineHash) || (value.etag && (!HASH.test(value.etag) || !value.backend || !PROJECT_UUID.test(value.specId || ""))) || (value.pending && (!HASH.test(value.pending.expectedEtag) || !HASH.test(value.pending.specificationHash) || !value.etag)))
      throw new Error("The local Blueprint binding is invalid. Import the project package into a new folder.");
    safeProjectRelativePath(value.specificationPath);
    if (value.backend) normalizeBlueprintBackend(value.backend);
    return value;
  } catch (error) { if (error.code === "ENOENT") return undefined; throw error; }
}

export async function initializeProjectBlueprintState(root: string, state: ProjectBlueprintState): Promise<void> {
  const existing = await readProjectBlueprintState(root);
  if (existing) {
    if (existing.applicationId.toLowerCase() !== state.applicationId.toLowerCase() || existing.specificationPath !== state.specificationPath)
      throw new Error("This folder is bound to another Application or editable specification. Import into a new folder.");
    return; // Repeated imports retain the base revision, pending save, and local edits.
  }
  await writeState(root, state, true);
}

export class ProjectBlueprintConflict extends Error {
  constructor(readonly canonical: ProjectBlueprintDocument) {
    super("The canonical Blueprint changed since this project's base revision. Review and merge the canonical changes before synchronizing; local files were preserved.");
    this.name = "ProjectBlueprintConflict";
  }
}

export interface ProjectBlueprintSyncRequest {
  root: string;
  backend: string;
  jwtToken: string;
  client?: ValkyrLabsRtkApiClient;
  assertCurrent?: () => void | Promise<void>;
  /** Supplied only after the native editor shows the conflict and the user requests publication. */
  reviewedBase?: { etag: string; specificationHash: string };
}

const checkedDocument = (value: ProjectBlueprintDocument, applicationId: string): ProjectBlueprintDocument => {
  if (!value || value.applicationId?.toLowerCase() !== applicationId.toLowerCase() || !HASH.test(value.etag) || !PROJECT_UUID.test(value.specId) || typeof value.filename !== "string" || !value.specification)
    throw new Error("ValkyrAI returned an invalid Blueprint revision. Local files and the base revision were preserved.");
  specificationHash(value.specification);
  return value;
};

/** Never replaces a retained base with a freshly fetched ETag without a comparison or explicit conflict review. */
export async function synchronizeProjectBlueprint(request: ProjectBlueprintSyncRequest): Promise<{ status: "saved" | "unchanged" | "recovered"; document: ProjectBlueprintDocument; localEditsRemain: boolean }> {
  const { root, jwtToken, assertCurrent, reviewedBase } = request;
  if (!jwtToken.trim()) throw new Error("Sign in to ValorIDE before synchronizing the canonical Blueprint.");
  const backend = normalizeBlueprintBackend(request.backend);
  const key = path.resolve(root).toLowerCase();
  if (active.has(key)) throw new Error("This project's Blueprint is already being synchronized. Wait before retrying.");
  active.add(key);
  try {
    await assertCurrent?.();
    const manifest = await readGenerationManifest(root);
    let state = await readProjectBlueprintState(root);
    if (!manifest || !state || manifest.applicationId.toLowerCase() !== state.applicationId.toLowerCase())
      throw new Error("Import the canonical project package before synchronizing its editable specification.");
    if (state.backend && normalizeBlueprintBackend(state.backend) !== backend)
      throw new Error("This project is bound to another ValkyrAI backend. Return to that backend before synchronizing.");
    await assertNoProjectLinks(root, state.specificationPath);
    const file = path.join(root, state.specificationPath);
    const specification = parseProjectSpecification(await fs.readFile(file));
    const hash = specificationHash(specification);
    const client = request.client || getValkyrLabsRtkApiClient();
    const url = `${backend}/thorapi/applications/${encodeURIComponent(state.applicationId)}/openapi`;
    const headers = { Authorization: `Bearer ${jwtToken}`, jwtSession: jwtToken };
    const getCanonical = async () => {
      await assertCurrent?.();
      const response = await client.request<ProjectBlueprintDocument>({ url, headers, responseType: "json", maxResponseBytes: 8 * 1024 * 1024 });
      await assertCurrent?.();
      return checkedDocument(response.data, state!.applicationId);
    };
    let canonical = await getCanonical();
    const canonicalHash = specificationHash(canonical.specification);
    let recovered = false;
    if (state.pending?.specificationHash === canonicalHash) {
      // The server committed a prior PUT whose response was lost. Recover the actual saved revision without replaying it.
      state = { ...state, backend, etag: canonical.etag, specId: canonical.specId, baselineHash: canonicalHash };
      delete state.pending;
      await writeState(root, state);
      recovered = true;
    }
    if (reviewedBase) {
      if (canonical.etag !== reviewedBase.etag || canonicalHash !== reviewedBase.specificationHash) throw new ProjectBlueprintConflict(canonical);
      state = { ...state, backend, etag: canonical.etag, specId: canonical.specId, baselineHash: canonicalHash };
      delete state.pending;
    } else if (state.etag ? state.etag !== canonical.etag : state.baselineHash !== canonicalHash) {
      throw new ProjectBlueprintConflict(canonical);
    }
    if (!state.etag) state = { ...state, backend, etag: canonical.etag, specId: canonical.specId };
    await assertCurrent?.();
    await assertNoProjectLinks(root, state.specificationPath);
    if (specificationHash(parseProjectSpecification(await fs.readFile(file))) !== hash)
      throw new Error("The local specification changed during synchronization. Save your edits and retry.");
    if (hash === state.baselineHash) {
      await writeState(root, state);
      return { status: recovered ? "recovered" : "unchanged", document: canonical, localEditsRemain: false };
    }
    state = { ...state, pending: { expectedEtag: state.etag!, specificationHash: hash } };
    await writeState(root, state);
    await assertCurrent?.();
    try {
      const response = await client.request<ProjectBlueprintDocument>({ url, method: "PUT", headers, responseType: "json", maxResponseBytes: 8 * 1024 * 1024,
        json: { specification, filename: path.basename(state.specificationPath), expectedEtag: state.etag } });
      await assertCurrent?.();
      canonical = checkedDocument(response.data, state.applicationId);
    } catch (error) {
      if (error instanceof ValkyrLabsApiError && error.status === 409) throw new ProjectBlueprintConflict(await getCanonical());
      throw error;
    }
    if (specificationHash(canonical.specification) !== hash)
      throw new Error("ValkyrAI did not return the submitted Blueprint. Retry to check the saved revision; local edits were preserved.");
    state = { ...state, backend, etag: canonical.etag, specId: canonical.specId, baselineHash: hash };
    delete state.pending;
    await writeState(root, state);
    await assertNoProjectLinks(root, state.specificationPath);
    const localEditsRemain = specificationHash(parseProjectSpecification(await fs.readFile(file))) !== hash;
    return { status: "saved", document: canonical, localEditsRemain };
  } finally { active.delete(key); }
}
