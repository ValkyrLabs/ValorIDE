# Immutable GitHub source handoff

ValorIDE’s **Commit & Push** action uses VS Code Git, verifies the remote branch’s exact SHA, then selects that immutable commit for canonical generation and requests refresh of running hosted instances. Save alone never pushes. Local Git authentication stays with VS Code; the server uses the Application’s existing authorized repository binding. See the [round-trip guide](project-roundtrip.md) for setup and recovery.

## Authenticated developer APIs

All routes use the configured ValkyrAI backend and existing Application authorization:

- GET /v1/thorapi/applications/{applicationId}/source-snapshots/github-bindings: safe existing binding IDs/repository names and authorized linked Project IDs/names. No credential values are returned.
- POST .../source-snapshots/github: bindingId, projectId, full lowercase 40-character commitSha, and optional root-relative sourceDirectory. No caller token or mutable branch reference is accepted.
- POST .../source-snapshots: existing multipart ZIP upload alternative, with the same dedicated developer artifact boundary.
- GET .../developer-project/selection: the selected BuildProfile artifact reference and optional immutable source descriptor, including a previous non-source reference for concurrency checks.
- PUT .../developer-project/selected-source: revisionRef and expectedArtifactRef. An authorized write clones/persists the BuildProfile association under the Application lock and verifies readback. A conflicting prior reference returns 409.
- GET .../developer-project/artifacts/{artifactRef-or-id}/download: fresh authorized private byte download with checksum ETag and private, no-store caching.
- GET .../developer-project/export?receiptRef=...: a complete project export for the exact successful authorized Application receipt.

Reads require Application read permission. Source publication/selection require write permission. The existing Project service and authoritative organization context are checked before storage access. A changed session, unreadable Project, invalid binding, trashed record or foreign organization cannot reuse a prior grant. Generation admission freezes source and specification together; no later branch or latest-snapshot lookup substitutes an input.

## Existing GitHub module and connections

The connector remains bean gitHubModule, class com.valkyrlabs.workflow.modules.scm.GitHubModule. Existing issue, pull request, release, repository metadata and Actions operations are retained. Its new fetch_source operation requires a full commit_sha and optionally source_directory. The ordinary module output exposes immutable source metadata and publicationRequired, not archive bytes or credentials. ApplicationSourceSnapshotService owns publication through the existing authorized binding.

An attached binding must be active, untrashed, provider GITHUB, and identify a canonical credential-free github.com repository URL consistent with its owner/name. Public repositories can use the binding without a token. A private repository uses the binding's existing verified authorized IntegrationAccount via the current secure-field getter. Reconnect a missing, closed, errored or masked connection through the existing supported account flow. Creating any new durable credential requires separate user authorization.

The server resolves the exact commit and complete Git tree using the canonical GitHub API. For larger whole repositories it downloads a commit-pinned archive, checking every file against the tree's blob SHA-1 and size before producing a deterministic ZIP and SHA-256. The archive request permits only the expected GitHub codeload redirect for the same repository and commit, without forwarding credentials. Small repositories and selections scoped to a subdirectory fetch only the selected blobs. Truncated trees, unsafe paths, symlinks, submodules, ambiguous names, secret files and excessive responses/expansion are rejected. A successful Actions dispatch is not a source revision.

## Canonical developer storage and regeneration

New source snapshots, accepted generation packages, unchanged original generator ZIPs and runtime packages use the existing configured S3 driver with logical keys:

    <organization>/projects/<project>/source/applications/<application>/revisions/<revision>/<filename>

The existing S3 driver's physical prefix, encryption and bucket policies remain authoritative. There is no local-driver fallback for these new artifacts. GeneratedArtifact metadata records the private developer domain, driver, organization, Project, Application, owner, revision, kind, exact logical key and checksum. Reads recheck these fields and current grants before presigning; downloaded bytes must match the immutable size and checksum. An old or superseded source revision stays addressable by its exact reference while authorized.

Regeneration verifies the committed project's original generator baseline against an existing generator-original artifact in the same Application. Known generated paths are replaced by the newly admitted canonical spec, obsolete generated paths removed unless protected, and custom source/modules/workflows/adapters/configuration retained. A committed .valoride-generator-ignore protects existing generated overrides. Supported server patterns are root-relative paths, *, ** and directory suffixes; .gitignore has no regeneration effect. Unproven ownership or new generated/custom collisions stop the build with an actionable error.

The assembled project is tested by the existing generation acceptance contract before success/debit. Its original generator archive is retained byte for byte as a separate developer artifact and nested export file. The project export retains the exact admitted spec and source descriptor, actual receipt identity/scope, complete checksummed source closure and dependency/license notices. Native import never substitutes another Application's identity or turns local fixture evidence into production proof.

This bridge does not use FileUpload/Media scanning for new developer ZIPs, change existing FileRecord objects/statuses/links, or add another authentication system. Historical FileRecord/FileVersion references remain their own contract; no synthetic immutable versions are assigned to unversioned records. Existing storage preservation and migration belong to the infrastructure owner.

## Verification and remaining production acceptance

Focused local tests use real Git commit/push fixtures and Git object responses, generated-model/H2 BuildProfile persistence, private in-memory S3 fixtures, exact admitted revision checks, custom Java compile/run, canonical export and the production native importer. Separate generation regressions cover existing acceptance/billing ordering; method-security and storage tests cover current read/write grants and cross-Application/organization denial. The combined fixture's receipt/runtime collaborators are mocks, explicitly labelled local_isolated_fixture in evidence.

A live private GitHub binding, real private S3 parity and a successful actual Application generation/export receipt still need verification in the authorized deployment. No live push, deployment, persistent credential creation, bucket/IAM/ACL change, workflow enablement or schedule activation is performed by these local changes. The clipping infrastructure owner separately owns parity for the existing 13 developer FileRecords; these tests do not verify or modify that migration.

To repeat the cross-repository contract check, run ValkyrAI's `ApplicationSourceSnapshotServiceTest` with `-Dvalkyrai.roundtrip.evidenceDirectory=<temporary directory>`. Then run ValorIDE's `src/services/localProjectImport.test.ts` with `VALORIDE_BACKEND_EXPORT_FIXTURE=<temporary directory>/backend-roundtrip-local-export.zip`. Without that environment variable the cross-repository case is skipped.

Before enabling hosted refresh, use an authorized staging app already running on Valkyr. Push a visible change, note the verified Git SHA, and confirm the *existing endpoint* serves that change after the same operation and SHA are reported healthy. Retry unchanged and verify there is no second rollout or debit. A failed health check must leave the previous revision serving; a stopped instance must stay stopped.
