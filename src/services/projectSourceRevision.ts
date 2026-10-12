import { getValkyrLabsRtkApiClient, ValkyrLabsApiError } from "./valkyrai/ValkyrLabsRtkApi";
import { PROJECT_UUID, normalizeBlueprintBackend } from "./projectBlueprintSync";

export interface DeveloperSourceRevision {
  applicationId: string; artifactId: string; projectId: string; organizationId: string;
  revisionRef: string; checksumSha256: string; sizeBytes: number; commitSha?: string; originalGeneratorChecksum?: string;
}
export interface GitSourceConnections {
  bindings: Array<{ bindingId: string; repository: string }>;
  projects: Array<{ projectId: string; name?: string }>;
}
export interface SourceHandoffOptions {
  backend: string; applicationId: string; jwtToken: string; assertCurrent: () => Promise<void>; sourceKind?: "upload";
}

/** A content-free pin of the exact profile association and configuration. */
export interface SourceSelectionDescriptor {
  applicationId: string;
  buildProfileId: string | null;
  artifactRef: string | null;
  profileSha256: string;
}
export interface SourceSelectionTransition {
  baseline: SourceSelectionDescriptor;
  selected: SourceSelectionDescriptor;
  sourceRevision: DeveloperSourceRevision;
}

export function sourceSelectionDescriptor(value: unknown, applicationId: string): SourceSelectionDescriptor {
  const descriptor = value as SourceSelectionDescriptor | undefined;
  if (!descriptor || typeof descriptor.applicationId !== "string" || descriptor.applicationId !== applicationId ||
      !PROJECT_UUID.test(applicationId) ||
      (descriptor.buildProfileId !== null && (typeof descriptor.buildProfileId !== "string" || !PROJECT_UUID.test(descriptor.buildProfileId))) ||
      (descriptor.artifactRef !== null && (typeof descriptor.artifactRef !== "string" ||
        !descriptor.artifactRef.trim() || descriptor.artifactRef.length > 512)) ||
      (descriptor.buildProfileId === null && descriptor.artifactRef !== null) ||
      typeof descriptor.profileSha256 !== "string" || !/^[a-f0-9]{64}$/.test(descriptor.profileSha256))
    throw new Error("The source selection descriptor is invalid or belongs to another Application. No source selection was changed.");
  // Project only the contract fields; never retain arbitrary response or recovery-file data.
  return { applicationId, buildProfileId: descriptor.buildProfileId, artifactRef: descriptor.artifactRef,
    profileSha256: descriptor.profileSha256 };
}

export function sameSourceSelection(left: SourceSelectionDescriptor, right: SourceSelectionDescriptor): boolean {
  return left.applicationId === right.applicationId && left.buildProfileId === right.buildProfileId &&
    left.artifactRef === right.artifactRef && left.profileSha256 === right.profileSha256;
}

export async function applicationSourceSelectionDescriptor(options: SourceHandoffOptions): Promise<SourceSelectionDescriptor> {
  return sourceSelectionDescriptor(await request(options, "/developer-project/source-selection/state"), options.applicationId);
}

export function sourceSelectionTransition(value: unknown, applicationId: string): SourceSelectionTransition {
  const transition = value as SourceSelectionTransition | undefined;
  const baseline = sourceSelectionDescriptor(transition?.baseline, applicationId);
  const selected = sourceSelectionDescriptor(transition?.selected, applicationId);
  const source = transition?.sourceRevision;
  if (!source || source.applicationId !== applicationId || typeof source.artifactId !== "string" || !PROJECT_UUID.test(source.artifactId) ||
      typeof source.projectId !== "string" || !PROJECT_UUID.test(source.projectId) ||
      typeof source.organizationId !== "string" || !PROJECT_UUID.test(source.organizationId) ||
      source.revisionRef !== `source-snapshot:${applicationId}:${source.artifactId}` ||
      typeof source.checksumSha256 !== "string" || !/^[a-f0-9]{64}$/.test(source.checksumSha256) ||
      typeof source.originalGeneratorChecksum !== "string" || !/^[a-f0-9]{64}$/.test(source.originalGeneratorChecksum) ||
      !Number.isSafeInteger(source.sizeBytes) || source.sizeBytes < 1 ||
      (source.commitSha != null && (typeof source.commitSha !== "string" || !/^[a-f0-9]{40}$/.test(source.commitSha))) ||
      selected.buildProfileId === null || selected.buildProfileId === baseline.buildProfileId ||
      selected.artifactRef !== source.revisionRef)
    throw new Error("The backend selected a different or invalid source revision. Review the Application's selected source before generating.");
  const sourceRevision: DeveloperSourceRevision = { applicationId, artifactId: source.artifactId,
    projectId: source.projectId, organizationId: source.organizationId, revisionRef: source.revisionRef,
    checksumSha256: source.checksumSha256, sizeBytes: source.sizeBytes,
    originalGeneratorChecksum: source.originalGeneratorChecksum, ...(source.commitSha ? { commitSha: source.commitSha } : {}) };
  return { baseline, selected, sourceRevision };
}

export async function selectPublishedApplicationSourceReversibly(options: SourceHandoffOptions,
    source: { applicationId: string; artifactId: string; revisionRef: string; checksumSha256: string; sizeBytes: number },
    expectedCurrent: SourceSelectionDescriptor, originalGeneratorChecksum: string): Promise<SourceSelectionTransition> {
  const expected = sourceSelectionDescriptor(expectedCurrent, options.applicationId);
  if (source.applicationId !== options.applicationId || !PROJECT_UUID.test(source.artifactId) ||
      source.revisionRef !== `source-snapshot:${options.applicationId}:${source.artifactId}` ||
      !/^[a-f0-9]{64}$/.test(source.checksumSha256) || !/^[a-f0-9]{64}$/.test(originalGeneratorChecksum) ||
      !Number.isSafeInteger(source.sizeBytes) || source.sizeBytes < 1)
    throw new Error("Uploaded source has invalid immutable Application evidence. No source selection was changed.");
  const current = await applicationSourceSelectionDescriptor(options);
  if (!sameSourceSelection(current, expected))
    throw new Error("The Application source selection changed after publication. Review its profile and saved baseline before retrying; the uploaded source remains intact.");
  const transition = sourceSelectionTransition(await request(options, "/developer-project/source-selection/select", "POST", {
    revisionRef: source.revisionRef, expectedCurrent: expected,
  }), options.applicationId);
  if (!sameSourceSelection(transition.baseline, expected) ||
      transition.sourceRevision.artifactId !== source.artifactId ||
      transition.sourceRevision.checksumSha256 !== source.checksumSha256 ||
      transition.sourceRevision.sizeBytes !== source.sizeBytes ||
      transition.sourceRevision.originalGeneratorChecksum !== originalGeneratorChecksum)
    throw new Error("The backend returned a different selection or immutable revision. Keep the recorded baseline and review the Application before retrying.");
  return transition;
}

/** A lost restoration response is recoverable because the exact original descriptor is already known. */
export async function restoreNullApplicationSourceSelection(options: SourceHandoffOptions,
    expectedCurrent: SourceSelectionDescriptor, baseline: SourceSelectionDescriptor): Promise<SourceSelectionDescriptor> {
  const expected = sourceSelectionDescriptor(expectedCurrent, options.applicationId);
  const original = sourceSelectionDescriptor(baseline, options.applicationId);
  if (original.artifactRef !== null || expected.buildProfileId === null ||
      expected.buildProfileId === original.buildProfileId ||
      !expected.artifactRef?.match(new RegExp(`^source-snapshot:${options.applicationId}:[a-f0-9-]{36}$`)))
    throw new Error("Restoration requires the recorded no-source baseline and its exact selected source descriptor.");
  const current = await applicationSourceSelectionDescriptor(options);
  if (sameSourceSelection(current, original)) return original;
  if (!sameSourceSelection(current, expected))
    throw new Error("The source selection or recorded baseline changed. Review it without retrying restoration.");
  const restored = sourceSelectionDescriptor(await request(options, "/developer-project/source-selection/restore-null", "POST", {
    expectedCurrent: expected, baseline: original,
  }), options.applicationId);
  if (!sameSourceSelection(restored, original))
    throw new Error("The recorded source baseline was not restored. Review the Application; no further restoration was attempted.");
  const readback = await applicationSourceSelectionDescriptor(options);
  if (!sameSourceSelection(readback, original))
    throw new Error("Source restoration readback changed. Keep the saved baseline and review the Application.");
  return readback;
}
async function request<T>(options: SourceHandoffOptions, suffix: string, method = "GET", json?: unknown): Promise<T> {
  if (!PROJECT_UUID.test(options.applicationId) || !options.jwtToken.trim()) throw new Error("Sign in to the Application's authorized account before selecting pushed source.");
  const backend = normalizeBlueprintBackend(options.backend);
  await options.assertCurrent();
  try {
    const result = await getValkyrLabsRtkApiClient().request<T>({ url: `${backend}/thorapi/applications/${encodeURIComponent(options.applicationId)}${suffix}`,
      method, ...(json ? { json } : {}), headers: { Authorization: `Bearer ${options.jwtToken}` }, responseType: "json", redirect: "error", maxResponseBytes: 1024 * 1024 });
    await options.assertCurrent(); return result.data;
  } catch (error) {
    const status = error instanceof ValkyrLabsApiError ? error.status : undefined;
    const upload = options.sourceKind === "upload";
    throw new Error(status === 409 ? "The Application source selection changed. Reload it and review the immutable revision before selecting it again."
      : status === 401 || status === 403 ? upload
        ? "The Application or Project is unavailable to this account. Reconnect its authorized account before selecting source."
        : "The Application, Project or existing GitHub connection is unavailable to this account. Reconnect its authorized account."
      : upload
        ? `Source selection${status ? ` (${status})` : ""} was interrupted or unavailable. The uploaded revision remains intact; reconnect and retry selecting that exact revision.`
        : `Source retrieval${status ? ` (${status})` : ""} was interrupted or unavailable. The pushed Git commit remains intact; retry fetching that exact commit after checking the existing binding and Contents read permission.`);
  }
}
export async function authorizedGitSourceConnections(options: SourceHandoffOptions): Promise<GitSourceConnections> {
  const result = await request<GitSourceConnections>(options, "/source-snapshots/github-bindings");
  if (!result || !Array.isArray(result.bindings) || !Array.isArray(result.projects) || result.bindings.some(b => !PROJECT_UUID.test(b.bindingId) || typeof b.repository !== "string") || result.projects.some(p => !PROJECT_UUID.test(p.projectId)))
    throw new Error("The backend returned invalid Application connections. Repair its source-binding response before retrying.");
  return result;
}
export async function fetchAndSelectPushedRevision(options: SourceHandoffOptions & { bindingId: string; projectId: string; commitSha: string; sourceDirectory: string }): Promise<DeveloperSourceRevision> {
  if (!PROJECT_UUID.test(options.bindingId) || !PROJECT_UUID.test(options.projectId) || !/^[a-f0-9]{40}$/.test(options.commitSha)) throw new Error("Select an existing Project, GitHub binding and full immutable pushed commit.");
  const current = await request<{ applicationId: string; artifactRef?: string }>(options, "/developer-project/selection");
  if (!current || current.applicationId !== options.applicationId) throw new Error("The current source selection belongs to another Application. No source selection was changed.");
  const source = await request<{ applicationId: string; artifactId: string; revisionRef: string; checksumSha256: string }>(options, "/source-snapshots/github", "POST", {
    bindingId: options.bindingId, projectId: options.projectId, commitSha: options.commitSha, sourceDirectory: options.sourceDirectory,
  });
  if (source.applicationId !== options.applicationId || !PROJECT_UUID.test(source.artifactId) || source.revisionRef !== `source-snapshot:${options.applicationId}:${source.artifactId}` || !/^[a-f0-9]{64}$/.test(source.checksumSha256))
    throw new Error("Fetched source has invalid immutable Application evidence. No source selection was changed.");
  const selected = await request<DeveloperSourceRevision>(options, "/developer-project/selected-source", "PUT", { revisionRef: source.revisionRef, expectedArtifactRef: current?.artifactRef ?? null });
  if (selected.applicationId !== options.applicationId || selected.projectId !== options.projectId || selected.revisionRef !== source.revisionRef || selected.checksumSha256 !== source.checksumSha256 || selected.commitSha !== options.commitSha)
    throw new Error("The backend selected a different source revision. Review the Application's selected source before generating.");
  return selected;
}

export interface ApplicationSourceSelection {
  applicationId: string;
  artifactRef?: string | null;
  sourceRevision?: DeveloperSourceRevision | null;
}

export async function applicationSourceSelection(options: SourceHandoffOptions): Promise<ApplicationSourceSelection> {
  const current = await request<ApplicationSourceSelection>(options, "/developer-project/selection");
  if (!current || current.applicationId !== options.applicationId ||
      (current.artifactRef != null && (typeof current.artifactRef !== "string" || current.artifactRef.length > 512)))
    throw new Error("The current source selection belongs to another Application or is invalid. No source selection was changed.");
  return current;
}

export async function latestPublishedApplicationSource<T>(options: SourceHandoffOptions): Promise<T | undefined> {
  return request<T | undefined>(options, "/source-snapshots");
}

/** Recover an interrupted upload's exact immutable revision without adopting a newer parent selection. */
export async function selectPublishedApplicationSource(options: SourceHandoffOptions,
    source: { applicationId: string; artifactId: string; revisionRef: string; checksumSha256: string; sizeBytes: number },
    expectedArtifactRef: string | null, originalGeneratorChecksum: string): Promise<DeveloperSourceRevision> {
  if (source.applicationId !== options.applicationId || !PROJECT_UUID.test(source.artifactId) ||
      source.revisionRef !== `source-snapshot:${options.applicationId}:${source.artifactId}` ||
      !/^[a-f0-9]{64}$/.test(source.checksumSha256) || !/^[a-f0-9]{64}$/.test(originalGeneratorChecksum) ||
      !Number.isSafeInteger(source.sizeBytes) || source.sizeBytes < 1)
    throw new Error("Uploaded source has invalid immutable Application evidence. No source selection was changed.");
  const current = await applicationSourceSelection(options);
  let selected: DeveloperSourceRevision;
  if (current.artifactRef === source.revisionRef) {
    selected = current.sourceRevision!;
  } else {
    if ((current.artifactRef ?? null) !== expectedArtifactRef)
      throw new Error("The Application source selection changed after publication. Review its current revision before retrying; the uploaded source remains intact.");
    selected = await request<DeveloperSourceRevision>(options, "/developer-project/selected-source", "PUT", {
      revisionRef: source.revisionRef, expectedArtifactRef,
    });
  }
  if (!selected || selected.applicationId !== options.applicationId || selected.artifactId !== source.artifactId ||
      selected.revisionRef !== source.revisionRef || selected.checksumSha256 !== source.checksumSha256 ||
      selected.sizeBytes !== source.sizeBytes || !PROJECT_UUID.test(selected.projectId) || !PROJECT_UUID.test(selected.organizationId) ||
      selected.originalGeneratorChecksum !== originalGeneratorChecksum)
    throw new Error("The backend selected a different or invalid source revision. Review the Application's selected source before generating.");
  return selected;
}
