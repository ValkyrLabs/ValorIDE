import { getValkyrLabsRtkApiClient, ValkyrLabsApiError } from "./valkyrai/ValkyrLabsRtkApi";
import { PROJECT_UUID, normalizeBlueprintBackend } from "./projectBlueprintSync";

export interface DeveloperSourceRevision {
  applicationId: string; artifactId: string; projectId: string; organizationId: string;
  revisionRef: string; checksumSha256: string; sizeBytes: number; commitSha?: string;
}
export interface GitSourceConnections {
  bindings: Array<{ bindingId: string; repository: string }>;
  projects: Array<{ projectId: string; name?: string }>;
}
export interface SourceHandoffOptions {
  backend: string; applicationId: string; jwtToken: string; assertCurrent: () => Promise<void>;
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
    throw new Error(status === 409 ? "The Application source selection changed. Reload it and review the pushed commit before selecting it again."
      : status === 401 || status === 403 ? "The Application, Project or existing GitHub connection is unavailable to this account. Reconnect its authorized account."
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
