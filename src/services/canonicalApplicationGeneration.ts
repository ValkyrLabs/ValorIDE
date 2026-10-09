import fs from "fs/promises";
import path from "path";
import { createHash, randomUUID } from "crypto";
import type { AppGenerationRequest } from "@thorapi/model/AppGenerationRequest";
import type { GenerationReceipt } from "@thorapi/model/GenerationReceipt";
import type { AppGenerationTraceResponse } from "@thorapi/model/AppGenerationTraceResponse";
import type { GeneratedArtifact } from "@thorapi/model/GeneratedArtifact";
import type { Principal } from "@thorapi/model/Principal";
import { getValkyrLabsRtkApiClient, ValkyrLabsApiError } from "./valkyrai/ValkyrLabsRtkApi";
import { assertNoProjectLinks, GeneratedProjectProvenance } from "./generatedProjectInstall";

import { downloadCanonicalProjectExport } from "./canonicalProjectExport";

const MAX_ARCHIVE_BYTES = 128 * 1024 * 1024;
const hash = (bytes: string | Buffer) => createHash("sha256").update(bytes).digest("hex");
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const reference = (value: unknown): value is string => typeof value === "string" && /^[a-z0-9._:-]{1,200}$/i.test(value);
type Recovery = { idempotencyKey: string; requestRef?: string; tenantId?: string; accountId?: string };
const pending = new Map<string, Recovery>();

interface Options {
  backend: string;
  workspaceRoot: string;
  applicationId: string;
  applicationVersion?: string;
  jwtToken: string;
  recoveryDirectory?: string;
  assertCurrent: () => Promise<void>;
  onProgress?: (message: string) => void | Promise<void>;
  fetch?: typeof fetch;
  /** Fetch the complete editable export from the same accepted receipt instead of downloading twice. */
  completeProjectExport?: boolean;
}

const same = (left: unknown, right: unknown) => typeof left === "string" && typeof right === "string" && left.toLowerCase() === right.toLowerCase();

function validateRequest(request: AppGenerationRequest, applicationId: string, recovered?: Recovery): void {
  if (!request || !reference(request.requestRef) || !reference(request.tenantId) || !uuid.test(request.accountId || "") || !same(request.applicationId, applicationId))
    throw new Error("The backend returned an incomplete or different application generation request. Check the selected account/backend before retrying.");
  if (recovered?.requestRef && (request.requestRef !== recovered.requestRef || request.tenantId !== recovered.tenantId || !same(request.accountId, recovered.accountId)))
    throw new Error("The pending generation belongs to a different account or tenant. Return to its original account/backend before retrying.");
}

function validateReceipt(receipt: GenerationReceipt, request: AppGenerationRequest): void {
  if (!receipt || !reference(receipt.receiptRef) || receipt.requestRef !== request.requestRef || receipt.tenantId !== request.tenantId || !same(receipt.accountId, request.accountId) || !same(receipt.applicationId, request.applicationId) || (receipt.status === "succeeded" && (!reference(receipt.generationRunRef) || !reference(receipt.artifactSetRef))))
    throw new Error("The generation receipt does not match the authorized application/account. No project files were written; check the backend before retrying.");
}

function packageFromTrace(trace: AppGenerationTraceResponse, receipt: GenerationReceipt, request: AppGenerationRequest): GeneratedArtifact {
  validateReceipt(trace?.generationReceipt, request);
  if (trace.receiptRef !== receipt.receiptRef || trace.requestRef !== request.requestRef || trace.tenantId !== request.tenantId || !same(trace.accountId, request.accountId) || !same(trace.applicationId, request.applicationId) || trace.generationRunRef !== receipt.generationRunRef || trace.artifactSetRef !== receipt.artifactSetRef || trace.generationReceipt.receiptRef !== receipt.receiptRef || trace.generationReceipt.generationRunRef !== receipt.generationRunRef || trace.generationReceipt.artifactSetRef !== receipt.artifactSetRef || trace.generationReceipt.status !== "succeeded")
    throw new Error("The authorized trace does not match this generation receipt. No project files were written; refresh the application and retry.");
  const packages = trace.generatedArtifacts?.filter((artifact) => artifact.artifactType === "package_zip" && ["packaged", "validated"].includes(artifact.status)) || [];
  if (packages.length !== 1) throw new Error("The successful receipt has no unique packaged application ZIP. Check its generation trace in ValkyrAI before retrying.");
  const artifact = packages[0];
  if (!reference(artifact.artifactRef) || artifact.tenantId !== request.tenantId || !same(artifact.accountId, request.accountId) || !same(artifact.applicationId, request.applicationId) || artifact.generationRunRef !== receipt.generationRunRef || artifact.artifactSetRef !== receipt.artifactSetRef || !/^[a-f0-9]{64}$/i.test(artifact.checksum || "") || !Number.isSafeInteger(artifact.byteSize) || artifact.byteSize! < 1 || artifact.byteSize! > MAX_ARCHIVE_BYTES)
    throw new Error("The packaged artifact has mismatched ownership or missing checksum/size evidence. No archive was downloaded; repair the generation trace before retrying.");
  return artifact;
}

async function readArchive(url: string, jwtToken: string, bytes: number, ensureCurrent: Options["assertCurrent"], fetcher: typeof fetch): Promise<Buffer> {
  const origin = new URL(url);
  let target = origin;
  for (let redirects = 0; redirects < 4; redirects++) {
    await ensureCurrent();
    let response: Response;
    try {
      response = await fetcher(target.toString(), {
        headers: redirects === 0 ? { Authorization: `Bearer ${jwtToken}` } : {},
        credentials: "omit", redirect: "manual", signal: AbortSignal.timeout(120000),
      });
    } catch { throw new Error("The artifact connection was interrupted. Retry to download from the same generation receipt; no new generation is needed."); }
    await ensureCurrent();
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      await response.body?.cancel();
      const location = response.headers.get("location");
      if (!location) throw new Error("The artifact download redirect is missing. Retry from the original generation receipt.");
      const next = new URL(location, target);
      const local = ["localhost", "127.0.0.1", "[::1]"];
      if (next.username || next.password || next.hash || (next.protocol !== "https:" && !(origin.protocol === "http:" && local.includes(origin.hostname) && next.protocol === "http:" && local.includes(next.hostname))))
        throw new Error("The artifact redirect uses an unsafe destination. Fix the backend's storage download URL before retrying.");
      target = next;
      continue;
    }
    if (!response.ok) throw new Error(`Artifact download failed (${response.status}). Sign in to the original account or retry an expired download from its receipt.`);
    const length = response.headers.get("content-length");
    if (length && /^\d+$/.test(length) && Number(length) > MAX_ARCHIVE_BYTES) { await response.body?.cancel(); throw new Error("The generated archive exceeds the supported 128 MiB size. Reduce its bundle and regenerate."); }
    if (!response.body) throw new Error("The artifact download was empty. Retry from its generation receipt.");
    const reader = response.body.getReader();
    const chunks: Buffer[] = []; let count = 0;
    try {
      while (true) {
        const chunk = await reader.read(); if (chunk.done) break;
        count += chunk.value.byteLength;
        if (count > bytes || count > MAX_ARCHIVE_BYTES) throw new Error("The downloaded archive size disagrees with its receipt. No project files were written; retry or repair the stored artifact.");
        chunks.push(Buffer.from(chunk.value));
      }
    } catch (error) { await reader.cancel().catch(() => {}); throw error; }
    if (count !== bytes) throw new Error("The downloaded archive is incomplete or has the wrong size. Retry from the same receipt; no new generation is needed.");
    return Buffer.concat(chunks);
  }
  throw new Error("The artifact download redirected too many times. Check the backend's storage configuration and retry.");
}

/** Generated API types remain authoritative. This adapter binds the canonical request, receipt, trace and private artifact bytes. */
export async function generateCanonicalArchive(options: Options): Promise<{ archive: Buffer; fileName?: string; provenance: GeneratedProjectProvenance; complete: () => Promise<void> }> {
  const { backend, workspaceRoot, applicationId, applicationVersion, jwtToken, recoveryDirectory, assertCurrent } = options;
  const client = getValkyrLabsRtkApiClient();
  const json = async <T>(url: string, method = "GET", body?: Partial<AppGenerationRequest>): Promise<T> => {
    await assertCurrent();
    let data: T;
    try {
      const response = await client.request<T>({ url: `${backend}${url}`, method, ...(body ? { json: body } : {}), headers: { Authorization: `Bearer ${jwtToken}` }, responseType: "json", redirect: "error", maxResponseBytes: 8 * 1024 * 1024 });
      data = response.data;
    } catch (error) {
      const status = error instanceof ValkyrLabsApiError ? error.status : undefined;
      throw new Error(status === 401 || status === 403 ? "Sign in to the application's authorized account before generating or resuming it." : `Canonical generation request failed${status ? ` (${String(status)})` : ""}. Check the backend connection and retry to resume the same request.`);
    }
    await assertCurrent(); return data;
  };
  // The authenticated principal is stable across token refreshes. Tokens never enter the recovery journal.
  const session = await json<{ authenticated?: boolean; authenticatedPrincipalObject?: Pick<Principal, "id"> }>("/auth/me");
  const principalId = session?.authenticatedPrincipalObject?.id;
  if (session?.authenticated !== true || !uuid.test(principalId || "")) throw new Error("Sign in to an authorized account with a verified principal before generating or resuming this application.");
  const key = hash(JSON.stringify([backend, workspaceRoot, applicationId.toLowerCase(), applicationVersion || "", principalId!.toLowerCase()]));
  const file = recoveryDirectory ? path.join(recoveryDirectory, `${key}.json`) : undefined;
  let recovery = pending.get(key);
  if (file) {
    await assertNoProjectLinks(recoveryDirectory!, path.basename(file));
    const contents = await fs.readFile(file, "utf8").catch((error) => { if (error.code === "ENOENT") return undefined; throw error; });
    if (contents) {
      try { recovery = JSON.parse(contents); } catch { throw new Error("The pending generation recovery record is invalid. Keep the project intact and repair that record before retrying."); }
      if (!recovery || !reference(recovery.idempotencyKey) || (recovery.requestRef && (!reference(recovery.requestRef) || !reference(recovery.tenantId) || !uuid.test(recovery.accountId || ""))))
        throw new Error("The pending generation recovery record is invalid. Keep the project intact and repair that record before retrying.");
    }
  }
  recovery ||= { idempotencyKey: `valoride-${randomUUID()}` };
  const save = async () => {
    pending.set(key, recovery!);
    if (file) {
      await assertNoProjectLinks(recoveryDirectory!, path.basename(file));
      await fs.mkdir(recoveryDirectory!, { recursive: true });
      const temporary = `${file}.${randomUUID()}.tmp`;
      try { await fs.writeFile(temporary, JSON.stringify(recovery) + "\n", { mode: 0o600, flag: "wx" }); await fs.rename(temporary, file); }
      finally { await fs.rm(temporary, { force: true }); }
    }
  };
  const complete = async () => { pending.delete(key); if (file) { await assertNoProjectLinks(recoveryDirectory!, path.basename(file)); await fs.rm(file, { force: true }); } };
  await assertCurrent(); await save();
  if (recovery.requestRef) await options.onProgress?.("Resuming the previous generation. Generate again after this download finishes to include later Blueprint edits.");
  const request = recovery.requestRef
    ? await json<AppGenerationRequest>(`/app_generation_ops/requests/${encodeURIComponent(recovery.requestRef)}`)
    : await json<AppGenerationRequest>("/app_generation_ops/requests", "POST", { applicationId, idempotencyKey: recovery.idempotencyKey });
  validateRequest(request, applicationId, recovery);
  if (!same(request.accountId, principalId)) throw new Error("The generation request belongs to a different authenticated principal. No project files were written; return to its authorized account.");
  recovery = { ...recovery, requestRef: request.requestRef, tenantId: request.tenantId, accountId: request.accountId };
  await save();
  const receipt = await json<GenerationReceipt>(`/app_generation_ops/requests/${encodeURIComponent(request.requestRef)}/run`, "POST");
  validateReceipt(receipt, request);
  if (receipt?.status !== "succeeded") {
    // Terminal unsuccessful requests are not reused after the user repairs the saved Blueprint.
    if (["failed", "partial", "canceled"].includes(receipt?.status)) await complete();
    throw new Error(`Application generation ${receipt?.status || "did not finish"}. Review its build/validation evidence in ValkyrAI, fix the saved Blueprint, and retry. ${receipt?.errorMessage || ""}`.trim());
  }
  const trace = await json<AppGenerationTraceResponse>(`/app_generation_ops/traces/${encodeURIComponent(receipt.receiptRef)}`);
  const artifact = packageFromTrace(trace, receipt, request);
  let metadata: Record<string, unknown>;
  try { metadata = JSON.parse(artifact.metadataJson || "{}"); } catch { throw new Error("The packaged artifact has invalid storage metadata. Repair its generation trace before downloading."); }
  if (!metadata || typeof metadata !== "object" || metadata.generationRunRef !== receipt.generationRunRef)
    throw new Error("The packaged artifact has no matching durable storage revision. Repair its generation trace before downloading.");
  const developer = metadata.domain === "developer_project";
  if (developer ? metadata.storageDriverId !== "s3" || metadata.kind !== "generation_package" || !uuid.test(String(metadata.organizationId || "")) || !uuid.test(String(metadata.projectId || "")) || !same(metadata.applicationId, applicationId) || !same(metadata.ownerId, principalId) : !uuid.test(String(metadata.fileRecordId || "")))
    throw new Error("The packaged artifact has mismatched developer scope or no durable FileRecord. Repair its generation trace before downloading.");
  const download = developer
    ? `${backend}/thorapi/applications/${encodeURIComponent(applicationId)}/developer-project/artifacts/${encodeURIComponent(artifact.artifactRef)}/download`
    : `${backend}/files/${encodeURIComponent(String(metadata.fileRecordId))}/download`;
  await options.onProgress?.("Downloading the verified application package from its generation receipt...");
  const archive = options.completeProjectExport
    ? await downloadCanonicalProjectExport({ backend, applicationId, receiptRef: receipt.receiptRef, jwtToken, assertCurrent })
    : await readArchive(download, jwtToken, artifact.byteSize!, assertCurrent, options.fetch || fetch);
  await assertCurrent();
  if (!options.completeProjectExport && hash(archive) !== artifact.checksum!.toLowerCase()) throw new Error("The downloaded archive checksum disagrees with its receipt. No project files were written; retry or repair the stored artifact.");
  return { archive, fileName: artifact.fileName, complete, provenance: { requestRef: request.requestRef, receiptRef: receipt.receiptRef, generationRunRef: receipt.generationRunRef!, artifactRef: artifact.artifactRef, ...(developer ? { artifactStorage: "developer_project" as const } : { fileRecordId: String(metadata.fileRecordId), artifactStorage: "file_record" as const }), checksum: artifact.checksum!.toLowerCase(), tenantId: request.tenantId, accountId: request.accountId!, specRevisionRef: receipt.specRevisionRef, buildRunRef: receipt.buildRunRef, testRunRef: receipt.testRunRef, runtimeBindingRef: receipt.runtimeBindingRef } };
}
