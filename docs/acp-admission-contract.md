# Governed ACP admission: host-side draft

Status: **source-only contract proposal; production route disabled**. This document creates no endpoint, credential, challenge, grant, signature verifier, or execution path. Local ACP consent and `AcpHostAccountGuard` remain separate from remote admission. Reviewed companion: `ValkyrAI/docs/security/ACP_ADMISSION_CONTRACT.md` draft 1 and `valkyrai/src/test/resources/contracts/acp-admission-v1.json`. Fixture agreement is not production verification.

## Authorities and required bindings

The backend must derive the requester from the authenticated Sage request and authorize the original canonical issued command, action, scope, approval, and exact target. Worker acknowledgements, prompt fields, and copied command digests are not authority. **Accept draft 1's strict host principal = target principal requirement.** Requester may differ only under the canonical authorized command/approval policy that permits this target; sharing an organization is insufficient. Broader host-to-target principal delegation is not supported by draft 1.

Bind the canonical backend origin and explicit audience. Compare an exact normalized HTTPS origin (or explicitly allowed loopback development origin), never a suffix, redirect destination, or caller-provided URL. API base-path/version remains a separately pinned destination; same-origin path changes cannot silently retarget verification.

Accept opaque, backend-issued `tenantContextRef` representing the full server-resolved placement: `organizationId`, `tenantSchemaRegistryId` (explicit null only when canonical placement permits), `schemaName`, `runtimeIsolationMode`, and `applicationDataPlaneBindingId` (including canonical null), plus any future placement revision. Organization alone is not tenant identity. The backend compares authoritative requester, issued-command, current SWARM target, and independently authenticated host placements; the host verifies the resulting reference through its own authentication, not by decoding or inventing a tenant override. This keeps schema metadata out of SWARM.

Bind the live SWARM `instanceId`, registered `principalId`, and authenticated socket `sessionId` from the correlated private server-control ACK on the current connection. `swarm-transport-binding/v1` is a socket identity assertion, not authorization to use an ACP host. Reconnect invalidates old evidence even when instance/principal strings remain unchanged.

## Proposed host evidence

These are semantic field names for coordination, **not an implemented wire schema**. No bearer token, token hash, private socket token, connection-file contents, or provider secret belongs in this evidence. Only an independently authenticated host-to-backend exchange can associate these local observations with a host principal/session.

| Field | Authority and meaning |
| --- | --- |
| `hostInstanceId` | Backend-recognized host registration identity, not the SWARM target ID or an editor-supplied name. |
| `hostAuthSessionRef` | Backend-issued non-bearer reference to the host's currently authenticated session. `/auth/me` principal summary alone does not supply this contract. |
| `hostProcessEpoch` | Fresh host-start identity; invalid after extension-host/server restart. The existing numeric local epoch is not a portable authenticated identity. |
| `hostConnectionId` | Host-generated identity for the exact private ACP connection; never the socket credential or path. |
| `hostSessionId` | Actual host-created ACP session from `session/new`, after native session consent and before any governed prompt or hydrated memory. This matches the backend draft's name. |
| `challengeId`, `challengeNonce` | `challengeId` is the backend-generated handle from at least 256 random bits; optional `challengeNonce` is separate fresh host-originated input registered directly with the backend. They are not interchangeable. Public challenge material is not a credential or grant. Do not reuse after cancellation, uncertainty, reconnect, expiry, or command completion. |
| `challengeCreatedAt`, `challengeExpiresAt` | Accept backend maximum admission lifetime of 60 seconds, shortened by challenge, approval, host authentication, and target authentication deadlines. No expiry grace. Backend time is authoritative for consume; host enforces its own monotonic lifetime and fails closed on incompatible evidence. |
| `workspace.identityVersion` | Versioned canonicalization/digest algorithm identifier; no implicit fallback between algorithms. |
| `workspace.canonicalUri` | Host-observed `file:` URI of `fs.realpath` of the locally selected trusted root, not ACP client `cwd`, repository URL, or a path from the command. Send only through the authenticated host registration if disclosure is needed. |
| `workspace.rootDevice`, `workspace.rootInode` | Host-observed filesystem identity encoded as lossless decimal strings; local recheck evidence, not server proof of filesystem ownership. Canonical path alone misses directory replacement. Unsupported/unreliable filesystem identities need an explicit separate policy, not a silent fallback. |
| `workspace.identityDigest` | Digest over the ordered/versioned tuple below: canonical URI, root identity, host process/connection/session identity, and workspace trust generation. `hostInstanceId` is independently bound by the authenticated registration, not included in this tuple. |
| `workspaceTrustGeneration` | Host-owned revision invalidated on root or trust changes, even if the same path is later restored. |
| `accountRevision` | Local revocation generation bound to the independently authenticated host session. Not a principal ID; authentication/credential/backend changes invalidate it. Matches the backend draft's name. |

Accept draft 1's opaque `hostConnectionEpoch`, `hostSessionId`, `challengeId`, `workspaceBinding`, and `accountRevision` presentation fields as references to authenticated server records. `hostConnectionEpoch` must bind both fresh `hostProcessEpoch` and per-connection `hostConnectionId`, not just a stable device/instance ID. Backend records must also bind a non-bearer `hostAuthSessionRef`; a principal alone is not the exact authenticated host session. `workspaceBinding` can be an opaque reference to the registered workspace evidence/digest below. No separate wire `hostBindingRef` is required if these records provide the same immutable binding.

SWARM may relay opaque references, but must not supply the host's principal, tenant, or authenticated session as authoritative values. The host retains the original observations locally and compares the eventual admission/consume acknowledgement to that snapshot. Client `_meta` is never a trusted input. A future host `_meta` extension would carry references and explicitly labeled evidence only, with independent verification; it must not be an unsigned permission claim.

### Proposed canonical workspace encoding

The tuple contains **eight strings: one version tag plus seven host register-only fields**, in this exact order:

```text
["valoride-acp-workspace/v1", canonicalUri, rootDevice, rootInode,
 hostProcessEpoch, hostConnectionId, hostSessionId, workspaceTrustGeneration]
```

Encode as compact JSON without a trailing newline, UTF-8, then lowercase SHA-256 hex prefixed `sha256:`. Strings are not case-folded or Unicode-normalized. `canonicalUri` is exactly `pathToFileURL(await fs.realpath(root)).href` and must round-trip through `fileURLToPath`/`pathToFileURL`; no query, fragment, userinfo, remote authority, control characters or encoded path separators. Obtain root device/inode using bigint filesystem stats, then canonical nonnegative decimal strings (no sign or leading zeros, except `0`). Trust generation is also canonical decimal. IDs are bounded, control-free strings. Limit fields to these exact names; version changes require a new encoding identifier. The test interpreter does not probe the filesystem, so URI well-formedness does not establish realpath/trust/ownership.

The fingerprint binds one root identity and session, not repository contents or a sandbox. Keep raw filesystem evidence host-local when possible; the authenticated backend record can retain the opaque digest/reference and its source. Both sides must agree on encoding before implementing a verifier. Re-resolve the selected root and stat identity before prompt and each privileged action, **and enforce containment at actual file use through verified handles/platform-safe operations**. A check followed by an unguarded path reopen has a race. General shells/tools that cannot enforce the admitted scope must not be offered as contained by their working directory.

### Actual execution content and one-use identity

Bind `executionAuthorityDigest`, `taskEnvelopeDigest`, and `contextManifestDigest` as in the backend draft; ambient provider settings are not a fallback. Existing command/action/scope labels alone do not prevent substituted prompts or additional instructions. Suggested governed v1 restriction: a single text block, with `promptDigest = sha256(UTF-8(exact executed text))`, including hydrated memory; no trimming, normalization, or post-verification append. This is a renderer byte-vector proposal, not a replacement for the full task-envelope digest. Reject malformed Unicode rather than hash replacement characters. Rich/resource-link blocks need an agreed canonical encoding before support. Full envelope/context renderer fields and canonicalization remain to be agreed before runtime use.

`approvedToolArgumentsDigest` applies only to pre-approved parameters. Dynamic tool calls still require native approval of the exact arguments, current authorization/scope, and containment checks immediately before use. The starting task digest never authorizes arbitrary future arguments or tool names. No raw-reference/context fallback, extra system prompt, MCP server, or workspace may be injected after verification.

The eventual task envelope must explicitly cover or authorize host-side custom/system instructions, automatic memory/context retrieval, and other content the native task engine adds after receiving the initial text. Matching the incoming text digest alone does not bind that effective task context. This is still a renderer/policy agreement gap, not something these byte vectors implement.

Canonical one-use identity must cover the **logical execution attempt** across all admission IDs, challenge registrations, delivery retries, and backend instances. Issuing a second admission for the same logical execution cannot bypass consumption or host start deduplication. Challenge reservation and reuse constraints must be atomic with this identity; rejecting a foreign host cannot burn another host's valid reservation. A status receipt is not a new start permit.

## Consume and execution boundary

1. Native server and session consent establish only local willingness. Create a fresh empty ACP session; do not send a governed prompt or hydrated memory yet.
2. The host authenticates directly to the pinned backend, registers its challenge/session/workspace evidence, and retains immutable local observations.
3. Backend admission evaluates the original issued command and current requester, placement, approval, target socket, host session, audience, challenge, workspace, expiry, and revocation state.
4. Before prompt delivery or task construction, the host performs a durable atomic one-use consume against that exact authorization using its own origin-bound authentication. Recheck authority and all live bindings at consume, not just at issuance. Validate the current monotonic authorization revision/fence in the same transactional ordering as consumption; a revocation committed before consume wins over a stale read. Concurrent consumers cannot both acquire execution authority, including across distinct admission IDs for the same logical execution. A stable `consumeRequestId` correlates ambiguity but is not authority; a replay/idempotent status read must not convey a second execution permit.
5. Only a positively authenticated consume acknowledgement matching the entire pending binding, followed by a local compare-and-set from `CONSUMING` to `READY_ONCE`, may allow one prompt dispatch. Recheck local account/workspace/connection state immediately before dispatch. Native per-tool approvals remain necessary and do not enlarge the command's authorized action/scope.
6. Durably reserve task start by logical execution identity before dispatch. Restart/crash after consume, the start marker, or spawn must never blindly repeat work; ambiguity is reconciled without a new prompt. Cancellation, process failure, or disconnect does not restore a consumed grant or prove rollback. Further governed turns, follow-up answers, resumed sessions, and tool actions outside the approved action/scope need an explicit new authorization; one admission is not blanket multi-turn access.

If a consume response is lost, malformed, unverifiable, timed out, or disconnected, mark the local attempt **UNCERTAIN / NO EXECUTION**. Do not resend a prompt, consume again to obtain execution permission, mint a replacement challenge automatically, or infer success/failure from missing receipts. An authenticated reconciliation/status operation may classify history but must never authorize that ambiguous attempt to execute. Any later attempt needs an explicit canonical backend decision/new attempt after reconciliation. If the host crashes after consume, a replacement process must not revive the old execution permission.

Account, workspace, trust, host process, ACP connection/session, target SWARM socket, placement, or authorization changes revoke pending and active work. Propagate abort to pending approvals and detached tasks. Start and tool gates require ordered backend checks of authorization revision and bounded freshness; unknown freshness or disconnected revocation transport denies the gate. Notifications alone are insufficient. A revocation ordered before a gate wins; an already-permitted action is in flight and cannot be retroactively undone. Local credential revision cannot detect server membership revocation.

## Current incompatibilities / implementation prerequisites

- `AcpAgentBridge` authenticates a private OS-user connection and returns `{}` to `hello`; it has no independently authenticated host registration or admission consumer.
- `session/new` returns only a random session ID. `HostConnection.newSession` reconstructs `{ sessionId }`, discarding any extra backend fields. `AgentServer`'s backend interface carries no host evidence. Adding metadata on only one hop would not work.
- `AcpAgentServer` observes realpath/device/inode and local credential revisions, but does not produce a versioned authenticated workspace/challenge record. Its guard does not pin provider/model selection without a credential mutation.
- The local bridge can prompt after native session consent. A future governed mode must enforce consume **inside the host**, before `createDetachedAcpTask`, without allowing an omitted flag or metadata downgrade to fall back to local mode. A SWARM-only `verifyHostIdentity` callback is an additional gate, not host enforcement.
- Current local ACP allows multi-turn continuation and arbitrary approved local tools. The governed lane needs command/action/scope enforcement in the host and a policy for follow-up turns; a native allow-once click is not canonical command authorization.
- Backend `/auth/me` does not currently provide the independently authenticated host-session/tenant-placement attestation required here. The existing `withGovernedCodingIssuedCommand` and LM Studio configuration retrieval are not generic ACP admission or atomic consume APIs.
- No durable one-use consume store, lost-response reconciliation contract, host process/session registration, signed-grant verifier, or cross-transport revocation mechanism is implemented by this proposal.
- Admission is not terminal success. `end_turn`, displayed `completed`, transcript hashes, and model text do not establish command completion or disk/commit effects. Machine terminal evidence remains a separate contract.

## Fixture interpretation

Portable fixtures are contract examples only: synthetic values, no real credential or executable grant. A fixture can describe matching evidence without proving its origin. Test interpreters must never accept `authenticated: true`, `signatureValid: true`, or identity fields from ordinary caller JSON as production verification.

Host-side checks must cover mismatched/omitted challenge, session, workspace identity, principal/placement, target socket, audience/origin, command/action/scope, expiry and replay; host state changes during consume; duplicate/concurrent consume; lost consume responses; and attempted downgrade to local consent. Negative fixture coverage is not a signed-proof verifier or a live integration result. Run only the dedicated contract test, not the existing full ACP suite, for this source-only work.

### Review result and focused command

Accepted backend field semantics: `protocolVersion`, `audience`, `apiBasePath`, `executionMode: governed`, `tenantContextRef`, `requesterPrincipalId`, `issuedLedgerRowId`, `executionIdentity`, `commandId`, target instance/socket, `approvalId`, `authorizationRevision`, action/scope/task-envelope/context-manifest/execution-authority digests, and the host fields above. Backend canonical host records also bind `hostInstanceId`, `hostProcessEpoch`, and `hostConnectionId`. Missing governed mode cannot downgrade to local consent. Current host-session and auth-session references must match the registration, not just its historical snapshot.

The host-only reference model reads the producer corpus in place; it does not duplicate backend fixtures or import into extension runtime. Run from ValorIDE:

```sh
node --test scripts/contracts/acp-admission-host.contract.test.mjs
```

By default this reads the sibling `ValkyrAI/valkyrai/src/test/resources/contracts/acp-admission-v1.json`; set `ACP_ADMISSION_FIXTURES` to another reviewed local corpus path if needed. Shared draft byte vectors are `scripts/contracts/fixtures/acp-host-encoding-v1.json`: one eight-string workspace tuple plus three exact single-text UTF-8 vectors (composed/decomposed Unicode and whitespace). They are not full task-envelope/context-manifest vectors.

Latest reviewed corpus: **73 decisions, 23 lifecycle traces, 10 parser requirements**. Focused result: **147 tests passed**. The ten parser entries are inventory assertions, not executed duplicate-key/redirect/wire parser rejection tests. The sequential lifecycle model demonstrates agreed interpretation only; it cannot prove actual database races, crash durability, server authentication, at-use filesystem containment, or revocation delivery. Existing full ACP suite was not rerun, no production code was wired, and no artifacts were installed or activated.
