# Immutable GitHub source handoff

ValorIDE publishes reviewed project paths through the existing vscode.git API, then optionally selects the exact pushed commit for canonical generation. Save alone never pushes. Local Git authentication remains with VS Code; the server handoff uses an existing authorized Application repository binding and never transfers that client token.

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

Fetching uses the canonical GitHub API, with redirects disabled and bounded connect/read/call timeouts. The server verifies the requested commit, its exact complete tree and each selected blob's Git SHA-1 and size before creating a deterministic ZIP and SHA-256. Truncated trees, unsafe paths, symlinks, submodules, ambiguous names, secret files and excessive responses/expansion are rejected. Selecting a project directory does not fetch another project's blobs. A successful Actions dispatch is not a source revision.

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
