import { normalizeBlueprintBackend, PROJECT_UUID } from "./projectBlueprintSync";
import type { DeveloperSourceRevision, SourceHandoffOptions } from "./projectSourceRevision";
import { getValkyrLabsRtkApiClient, ValkyrLabsApiError } from "./valkyrai/ValkyrLabsRtkApi";

interface HostedRefreshInput {
  options: SourceHandoffOptions;
  revision: DeveloperSourceRevision;
  repository: string;
  branch: string;
}

interface HostedRefreshReceipt {
  applicationId: string;
  revisionRef: string;
  commitSha: string;
  queued: number;
  alreadyRequested: number;
}

/** The server derives eligible targets and GitHub credentials from the authorized selected revision.
 * A response means admission, not that a candidate passed health checks or was promoted. */
export async function refreshHostedProjectRevision({ options, revision, repository, branch }: HostedRefreshInput) {
  const { applicationId, assertCurrent, jwtToken } = options;
  if (!PROJECT_UUID.test(applicationId) || applicationId !== revision.applicationId ||
      !PROJECT_UUID.test(revision.artifactId) ||
      revision.revisionRef !== `source-snapshot:${applicationId}:${revision.artifactId}` ||
      !/^[a-f0-9]{40}$/.test(revision.commitSha ?? "") || !jwtToken.trim() || !branch.trim() ||
      !/^[a-z0-9-]+\/[a-z0-9._-]+$/i.test(repository))
    throw new Error("Hosted refresh requires this Application's selected immutable GitHub revision.");
  await assertCurrent();
  const url = `${normalizeBlueprintBackend(options.backend)}/thorapi/applications/${applicationId}/developer-project/refresh-running`;
  let receipt: HostedRefreshReceipt;
  try {
    const result = await getValkyrLabsRtkApiClient().request<HostedRefreshReceipt>({
      url, method: "POST", json: { revisionRef: revision.revisionRef, commitSha: revision.commitSha, repository, branch },
      headers: { Authorization: `Bearer ${jwtToken}` }, responseType: "json", redirect: "error", maxResponseBytes: 8192,
    });
    receipt = result.data;
  } catch (error) {
    const status = error instanceof ValkyrLabsApiError ? error.status : undefined;
    const detail = status === 404 ? "The Application or hosted-refresh endpoint is unavailable on this server."
      : status === 401 || status === 403 ? "Check the connected account and its deployment permissions."
      : status === 402 ? "Check the deployment plan and available credits."
      : status === 409 ? "Check the selected revision, active GitHub integration, and pending deployment in Launchpad."
      : status === 503 ? "The hosted refresh service or its revision-aware worker is unavailable. Check Launchpad and the server configuration."
      : "Check the deployment status in Launchpad before retrying.";
    throw new Error(`Hosted refresh not confirmed${status ? ` (HTTP ${status})` : ""}. ${detail} The Git push remains intact.`);
  }
  await assertCurrent();
  if (!receipt || receipt.applicationId !== applicationId || receipt.revisionRef !== revision.revisionRef ||
      receipt.commitSha !== revision.commitSha || !Number.isSafeInteger(receipt.queued) || receipt.queued < 0 ||
      !Number.isSafeInteger(receipt.alreadyRequested) || receipt.alreadyRequested < 0)
    throw new Error("Hosted refresh receipt did not match the pushed revision. Check Launchpad before retrying.");
  const runningTargets = receipt.queued + receipt.alreadyRequested;
  return { queued: receipt.queued, alreadyRequested: receipt.alreadyRequested, runningTargets, message: runningTargets
    ? `Hosted refresh: ${receipt.queued} queued, ${receipt.alreadyRequested} already queued or promoted for this commit. Check Launchpad for build and health status.`
    : "No running Valkyr-hosted instances for this Application. No deployment requested." };
}
