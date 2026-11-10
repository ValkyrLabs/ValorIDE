/** TEST-ONLY interpretation of synthetic contract fixtures.
 * Not a wire parser, verifier, grant issuer, durable store, or runtime gate.
 * "canonical" values here are fixture premises, never trusted caller JSON.
 * Eligibility does NOT authorize execution. No production code imports this.
 */
import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";

const reject = (reason) => ({ decision: "reject", reason });
const present = (value) => typeof value === "string" && value.length > 0;

export function evaluateFixtureSnapshot(snapshot) {
  const c = snapshot?.canonical,
    p = snapshot?.presentation;
  const issued = c?.issuedCommand,
    host = c?.verifiedHost;
  if (
    !c ||
    !p ||
    !issued ||
    !host ||
    !c.liveTransport ||
    !issued.transportBinding
  )
    return reject("required-field-missing");
  const placementKeys = [
    "organizationId",
    "tenantSchemaRegistryId",
    "schemaName",
    "runtimeIsolationMode",
    "applicationDataPlaneBindingId",
  ];
  if (
    [c.tenantPlacement, c.currentTenantPlacement].some(
      (placement) =>
        !placement ||
        placementKeys.some((key) => !Object.hasOwn(placement, key)),
    )
  )
    return reject("required-field-missing");
  if (host.principalId !== issued.transportBinding.principalId)
    return reject("host-target-principal-mismatch");
  const comparisons = [
    ["audience", c.audience, "audience-mismatch"],
    ["apiBasePath", c.apiBasePath, "api-path-mismatch"],
    ["executionMode", c.executionMode, "execution-mode-mismatch"],
    [
      "hostAuthSessionRef",
      host.hostAuthSessionRef,
      "host-auth-session-mismatch",
    ],
    ["protocolVersion", c.protocolVersion, "protocol-version-mismatch"],
    [
      "authorizationRevision",
      c.authorizationRevision,
      "authorization-revision-changed",
    ],
    ["approvalId", issued.approvalId, "approval-record-changed"],
    ["backendOrigin", c.backendOrigin, "origin-mismatch"],
    ["tenantContextRef", c.tenantContextRef, "tenant-mismatch"],
    ["requesterPrincipalId", issued.requesterPrincipalId, "requester-mismatch"],
    ["commandId", issued.commandId, "command-mismatch"],
    ["targetInstanceId", issued.targetInstanceId, "target-mismatch"],
    ["targetSessionId", issued.transportBinding.sessionId, "socket-mismatch"],
    ["hostPrincipalId", host.principalId, "host-principal-mismatch"],
    ["hostConnectionEpoch", host.hostConnectionEpoch, "host-epoch-mismatch"],
    ["hostSessionId", host.hostSessionId, "host-session-mismatch"],
    ["challengeId", host.challengeId, "challenge-mismatch"],
    ["workspaceBinding", host.workspaceBinding, "workspace-mismatch"],
    ["accountRevision", host.accountRevision, "account-revision-mismatch"],
    ["actionDigest", issued.actionDigest, "action-mismatch"],
    ["scopeDigest", issued.scopeDigest, "scope-mismatch"],
    [
      "executionAuthorityDigest",
      issued.executionAuthorityDigest,
      "execution-authority-mismatch",
    ],
    [
      "executionIdentity",
      issued.executionIdentity,
      "execution-identity-mismatch",
    ],
    ["issuedLedgerRowId", issued.issuedLedgerRowId, "issued-row-mismatch"],
    ["taskEnvelopeDigest", issued.taskEnvelopeDigest, "task-envelope-mismatch"],
    [
      "contextManifestDigest",
      issued.contextManifestDigest,
      "context-manifest-mismatch",
    ],
  ];
  if (
    !present(p.admissionId) ||
    comparisons.some(
      ([key, expected]) => !present(p[key]) || !present(expected),
    )
  )
    return reject("required-field-missing");
  for (const [key, expected, reason] of comparisons)
    if (p[key] !== expected) return reject(reason);
  if (c.protocolVersion !== "valkyr-acp-admission/draft-1")
    return reject("protocol-version-mismatch");
  if (c.executionMode !== "governed") return reject("execution-mode-mismatch");
  const { now, issuedAt, expiresAt } = snapshot;
  if (
    ![now, issuedAt, expiresAt].every(Number.isSafeInteger) ||
    issuedAt > now ||
    expiresAt <= issuedAt ||
    expiresAt - issuedAt > 60
  )
    return reject("invalid-time-window");
  if (now >= expiresAt) return reject("admission-expired");
  if (snapshot.recordState === "CONSUMED")
    return reject("admission-already-consumed");
  if (snapshot.recordState !== "READY") return reject("admission-not-ready");
  if (
    [
      "requesterActive",
      "requesterAuthorized",
      "approvalCurrent",
      "targetAuthorized",
      "transportLive",
      "workspaceAuthorizedForCommand",
    ].some((key) => c[key] !== true)
  )
    return reject("canonical-authorization-revoked");
  if (c.authorizationRevision !== c.currentAuthorizationRevision)
    return reject("authorization-revision-changed");
  if (c.revocationFreshnessConfirmed !== true)
    return reject("revocation-freshness-unknown");
  if (!Number.isSafeInteger(c.approvalExpiresAt) || c.approvalExpiresAt <= now)
    return reject("approval-expired");
  if (c.currentApprovalId !== issued.approvalId)
    return reject("approval-record-changed");
  if (!isDeepStrictEqual(c.tenantPlacement, c.currentTenantPlacement))
    return reject("canonical-placement-changed");
  if (issued.status !== "accepted")
    return reject("original-accepted-command-required");
  if (!isDeepStrictEqual(issued.transportBinding, c.liveTransport))
    return reject("issued-live-transport-mismatch");
  if (
    c.liveTransport.instanceId !== issued.targetInstanceId ||
    c.liveTransport.organizationId !== c.tenantPlacement?.organizationId
  )
    return reject("issued-live-transport-mismatch");
  if (
    !Number.isSafeInteger(c.targetAuthenticatedUntil) ||
    c.targetAuthenticatedUntil <= now
  )
    return reject("target-authentication-expired");
  if (host.authenticated !== true)
    return reject("host-authentication-required");
  if (host.principalId !== c.liveTransport.principalId)
    return reject("host-target-principal-mismatch");
  if (host.backendOrigin !== c.backendOrigin)
    return reject("host-origin-mismatch");
  if (host.workspaceTrusted !== true) return reject("workspace-untrusted");
  if (c.currentHostConnectionEpoch !== host.hostConnectionEpoch)
    return reject("host-epoch-changed");
  if (c.currentHostSessionId !== host.hostSessionId)
    return reject("host-session-changed");
  if (c.currentHostAuthSessionRef !== host.hostAuthSessionRef)
    return reject("host-auth-session-changed");
  if (c.workspaceContainedAtUse !== true)
    return reject("workspace-containment-lost");
  if (host.tenantContextRef !== c.tenantContextRef)
    return reject("host-placement-mismatch");
  if (
    !Number.isSafeInteger(host.authenticatedUntil) ||
    host.authenticatedUntil <= now
  )
    return reject("host-authentication-expired");
  if (
    !Number.isSafeInteger(host.challengeExpiresAt) ||
    host.challengeExpiresAt <= now
  )
    return reject("challenge-expired");
  if (
    !Number.isSafeInteger(host.challengeEntropyBits) ||
    host.challengeEntropyBits < 256
  )
    return reject("insufficient-challenge-entropy");
  if (
    expiresAt >
    Math.min(
      c.targetAuthenticatedUntil,
      host.authenticatedUntil,
      host.challengeExpiresAt,
      c.approvalExpiresAt,
    )
  )
    return reject("admission-outlives-authority");
  if (c.currentAccountRevision !== host.accountRevision)
    return reject("host-account-changed");
  if (c.currentWorkspaceBinding !== host.workspaceBinding)
    return reject("workspace-changed");
  if (c.currentExecutionAuthorityDigest !== issued.executionAuthorityDigest)
    return reject("execution-authority-changed");
  if (c.actualTaskEnvelopeDigest !== issued.taskEnvelopeDigest)
    return reject("actual-task-envelope-mismatch");
  if (c.actualContextManifestDigest !== issued.contextManifestDigest)
    return reject("actual-context-manifest-mismatch");
  if (
    !present(issued.approvedToolArgumentsDigest) ||
    c.actualToolArgumentsDigest !== issued.approvedToolArgumentsDigest
  )
    return reject("actual-tool-arguments-mismatch");
  if (c.executionIdentityConsumed !== false)
    return reject("execution-already-consumed");
  if (c.challengeReservedForExecutionIdentity !== issued.executionIdentity)
    return reject("challenge-execution-mismatch");
  return {
    decision: "eligible-for-atomic-consume",
    reason: "still-requires-durable-consumption-and-final-host-check",
  };
}

/** Deterministic trace model, NOT a transaction/locking or task-start implementation. */
export function interpretLifecycle(events) {
  let recordState = "READY",
    committedConsumes = 0,
    taskStarts = 0;
  let rejectedConsumes = 0,
    rejectedStarts = 0,
    uncertain = false;
  let pending = false,
    receipt = false,
    invalidated = false;
  let admissionRecords = events[0]?.startsWith("issue:") ? 0 : 1;
  let rejectedIssues = 0;
  const executions = new Map(),
    challenges = new Map(),
    consumedExecutions = new Set();
  let execution = "execution1";
  let authorizationRevision = "revision1",
    startReserved = false;
  let contained = false,
    fileOperations = 0,
    rejectedFileOperations = 0;
  for (const event of events) {
    if (event === "read:authorization-revision1") {
      // A stale read does not freeze the subsequent commit's authorization fence.
    } else if (event === "commit:revocation-revision2") {
      authorizationRevision = "revision2";
    } else if (event === "consume-cas:revision1") {
      if (authorizationRevision !== "revision1") rejectedConsumes++;
      else throw new Error("Synthetic CAS requires an explicit commit fixture");
    } else if (event === "workspace-check:valid") {
      contained = true;
    } else if (event === "symlink-swap:outside") {
      contained = false;
    } else if (event === "file-operation-attempt") {
      if (contained && taskStarts === 1 && !invalidated && !uncertain)
        fileOperations++;
      else rejectedFileOperations++;
    } else if (event === "persist:start-reservation") {
      if (
        recordState !== "CONSUMED" ||
        !receipt ||
        uncertain ||
        invalidated ||
        startReserved
      )
        throw new Error("Invalid synthetic start reservation");
      startReserved = true;
    } else if (event === "consumer-crash") {
      uncertain = true;
      receipt = false;
      invalidated = true;
    } else if (event.startsWith("issue:")) {
      const [, key, value] = event.split(":");
      if (key.startsWith("admission")) {
        if (
          consumedExecutions.has(value) ||
          executions.has(value) ||
          admissionRecords > 0
        )
          rejectedIssues++;
        else throw new Error("Unsupported synthetic alternate admission ISSUE");
      } else if (
        consumedExecutions.has(key) ||
        (executions.has(key) && executions.get(key) !== value) ||
        (challenges.has(value) && challenges.get(value) !== key)
      ) {
        rejectedIssues++;
      } else if (!executions.has(key)) {
        executions.set(key, value);
        challenges.set(value, key);
        admissionRecords++;
        execution = key;
      }
    } else if (event.startsWith("consume:")) {
      if (event === "consume:foreignHost" || recordState !== "READY")
        rejectedConsumes++;
      else {
        pending = true;
        if (event.startsWith("consume:admission"))
          execution = event.split(":")[2];
      }
    } else if (event.startsWith("commit:")) {
      if (!pending || recordState !== "READY")
        throw new Error("Invalid synthetic commit trace");
      recordState = "CONSUMED";
      committedConsumes++;
      consumedExecutions.add(execution);
      pending = false;
      // In these traces commit includes an acknowledgement unless response-lost follows.
      receipt = true;
    } else if (event === "response-lost") {
      uncertain = true;
      receipt = false;
    } else if (event === "commit-failed") {
      pending = false;
      receipt = false;
      uncertain = true;
    } else if (
      /^(revoke:|replace:|reconnect:)/.test(event) ||
      event === "host-restart" ||
      event === "revocation-freshness-lost"
    ) {
      invalidated = true;
      receipt = false;
    } else if (/^(start:|start-attempt:|receipt-replay:|spawn:)/.test(event)) {
      if (
        event.endsWith(":hostA") &&
        recordState === "CONSUMED" &&
        receipt &&
        !uncertain &&
        !invalidated &&
        taskStarts === 0 &&
        (!event.startsWith("spawn:") || startReserved)
      )
        taskStarts++;
      else rejectedStarts++;
    } else if (event === "retry:hostA") {
      rejectedConsumes++;
    } else if (
      ![
        "backend-restart",
        "consumer-restart",
        "task-failed",
        "final-check:valid",
        "deny:foreignHost",
        "status-read:consumed",
      ].includes(event)
    ) {
      throw new Error(`Unsupported synthetic lifecycle event: ${event}`);
    }
    // In particular, a status read cannot clear uncertainty or restore a receipt.
  }
  return {
    committedConsumes,
    taskStarts,
    rejectedConsumes,
    rejectedStarts,
    uncertain,
    recordState,
    admissionRecords,
    rejectedIssues,
    fileOperations,
    rejectedFileOperations,
  };
}

const workspaceKeys = [
  "canonicalUri",
  "rootDevice",
  "rootInode",
  "hostProcessEpoch",
  "hostConnectionId",
  "hostSessionId",
  "workspaceTrustGeneration",
];

/** Draft workspace fingerprint over synthetic host-observed inputs; not authority. */
export function canonicalWorkspaceEvidence(evidence) {
  if (
    !evidence ||
    typeof evidence !== "object" ||
    Array.isArray(evidence) ||
    Object.keys(evidence).length !== workspaceKeys.length ||
    Object.keys(evidence).some((key) => !workspaceKeys.includes(key)) ||
    workspaceKeys.some(
      (key) =>
        !present(evidence[key]) ||
        !evidence[key].isWellFormed() ||
        evidence[key].length > 16384 ||
        /[\u0000-\u001f\u007f]/.test(evidence[key]),
    )
  )
    throw new Error("Invalid synthetic workspace evidence");
  const uri = new URL(evidence.canonicalUri);
  if (
    uri.protocol !== "file:" ||
    uri.host ||
    uri.username ||
    uri.password ||
    uri.search ||
    uri.hash ||
    uri.href !== evidence.canonicalUri
  )
    throw new Error("Expected a canonical local file URI");
  const filename = fileURLToPath(uri);
  if (
    pathToFileURL(filename).href !== evidence.canonicalUri ||
    /[\u0000-\u001f\u007f]/.test(filename)
  )
    throw new Error("Expected an unambiguous local file URI");
  if (
    ["rootDevice", "rootInode", "workspaceTrustGeneration"].some(
      (key) => !/^(0|[1-9][0-9]{0,39})$/.test(evidence[key]),
    )
  )
    throw new Error("Expected lossless canonical decimal identity fields");
  return JSON.stringify([
    "valoride-acp-workspace/v1",
    ...workspaceKeys.map((key) => evidence[key]),
  ]);
}

export function workspaceBindingDigest(evidence) {
  return (
    "sha256:" +
    createHash("sha256")
      .update(canonicalWorkspaceEvidence(evidence), "utf8")
      .digest("hex")
  );
}

/** Exact single-text renderer vector only. Not a complete task/context envelope. */
export function promptDigest(text) {
  if (
    typeof text !== "string" ||
    !text.isWellFormed() ||
    !text.length ||
    Buffer.byteLength(text, "utf8") > 1024 * 1024
  )
    throw new Error("Expected bounded well-formed exact prompt text");
  return "sha256:" + createHash("sha256").update(text, "utf8").digest("hex");
}
