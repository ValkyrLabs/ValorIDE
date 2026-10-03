# Import and synchronize an application project

Run **ValorIDE: Import Local Project Package**, select the project-export ZIP, then choose its parent folder. The Projects view also has an import button. Local import requires no ValkyrAI account and makes no hosted request. Open the imported project from the success notification, then use the existing Build Project and Run Project actions.

The importer verifies every authored file against `source-manifest.json` and the original nested generated ZIP against `generation-lineage.json`. It installs generated Java/UI source alongside editable specifications, custom adapters, workflow/module definitions and dependency/storage/run configuration. Repeated or interrupted imports use the existing write-ahead baseline and preserve local edits. Imported lineage remains descriptive; it does not create a verified production receipt.

Portable reference exports can instead contain `export-manifest.json`, `project/source-manifest.json`, the authored files under `project/`, and the original generated ZIP under `artifacts/`. The outer manifest must declare and checksum every remaining file. ValorIDE installs the editable project at its normal root and retains the complete original envelope under `export-reference/`, including genuine local receipts, workflow graphs, dependency contracts and license notices. Edit the normal project files; the retained envelope records what was imported. A local receipt keeps its original scope and does not enable its workflow or establish production readiness.

Edit and **save** the editable specification. Run **ValorIDE: Synchronize Project Blueprint** from the command palette or the project context menu. This action requires a signed-in account with access to the Application on the configured ValkyrAI backend. It publishes only the specification through the existing authenticated Application Blueprint API. It does not publish custom source, regenerate, enable the Application, or deploy.

The first synchronization compares the canonical document to the original imported specification before retaining the server's ETag. Subsequent saves retain that base revision. If another editor changed the canonical Blueprint, choose **Review changes**, merge changes in the local side of the diff, save the file, then choose **Publish reviewed changes**. The canonical side is read-only. The server is checked again against the exact reviewed revision before PUT. Cancelling leaves local edits and the base revision intact. Retry checks whether an interrupted save already committed before sending another PUT.

## Publish source using the existing Git client

Run **ValorIDE: Publish Project Source to GitHub**. Choose the existing repository, its currently checked-out branch, and GitHub remote; review the affected project paths and commit message, then publish. The action uses the built-in `vscode.git` API for staging, commit and push. VS Code's Git/GitHub integration handles local authentication. This command never reads or exports a GitHub token and never adds a server credential binding. Ordinary editor Save does not push.

Pre-existing staged work or merge conflicts stop publication. Only changed files inside the selected project are staged; credentials, editor binding metadata, caches and the original generated ZIP are excluded. Branch switching, repository creation and initial GitHub connection remain available through VS Code's existing controls. No automatic merge or force push occurs. If push fails after commit, the commit remains visible in Source Control; retry Push there rather than creating another commit. The returned full commit SHA identifies the source version.

After a successful push, choose **Select pushed source for generation** to retrieve that exact commit through an existing GitHub binding attached to the Application. Sign in to the Application's backend account and choose an authorized linked Project if several are available. Private repositories require an existing authorized server connection with Contents read access. The command sends the binding ID, Project ID, full commit SHA and project directory; VS Code's GitHub token stays with the local Git client. A successful push remains useful if this optional handoff is cancelled or fails.

The backend validates immutable Git commit/tree/blob identities, publishes a private S3 developer artifact under the Application's authorized organization/Project/revision, and persists the selected source by cloning and linking its BuildProfile. Selection compares the previous artifact reference to detect concurrent changes. Retry an interrupted retrieval using the same full commit; a new immutable snapshot may be created, and the existing selection is retained until selection succeeds. Generation admission freezes the selected descriptor together with the canonical specification. Later branch movement or another source selection cannot change the admitted input.

## Regeneration ownership

The canonical Blueprint/OpenAPI and its generator bundles own generated source. The local ownership list comes from the checksum-verified generator ZIP before authored files or editor configuration are added. A canonical regeneration replaces known generated files by default, including local edits, after showing the affected paths and receiving **Replace generated files**. Cancel leaves all project files intact. Unknown collisions and custom subclasses/extensions outside generated ownership remain protected. No automatic code merge is performed.

For intentional generated-file overrides, add patterns to **`.valoride-generator-ignore`** and commit that exact file in the project repository before regeneration. Uncommitted policy changes stop local regeneration; server regeneration reads the policy from the frozen commit. For the server handoff use root-relative paths with `*` and `**`, or a trailing slash for a directory. Negation, character classes and backslash escapes are rejected with an actionable error. A server exception must match a committed, previously generated file; it cannot silently discard a new generated path. **`.gitignore` controls Git staging and is never used as regeneration policy.** Repeated local package import remains a recoverable installation action and preserves local edits; it does not itself request destructive canonical regeneration.

Server regeneration verifies the previous ownership baseline against this Application's stored original generator artifact. It replaces known generated files by default, removes obsolete generated paths unless protected, preserves custom files and committed exceptions, and rejects new generated/custom collisions. The resulting complete project passes the existing build/test acceptance before a successful receipt or debit. ValorIDE retains the generator-only ownership vector, so authored modules, workflows and adapters are not reclassified as generated files.

## Project-package contract

ZIP paths are relative to the package root. Required files:

- `source-manifest.json`: `schemaVersion: 1`, `version`, and `files` containing each authored file's `path`, `sha256` and byte count.
- `generation-lineage.json`: listed and checksummed in the source manifest, containing the original `applicationId` and `packageSha256`. Keep actual lineage and scope; a local fixture is not production proof.
- One complete editable OpenAPI 3 specification, also listed and checksummed. Its `info.title` supplies the project name and `info.version` matches the manifest version. Set `specificationPath` in the manifest if several specifications are present.
- `artifacts/generated-<version>.zip` for portable/local exports, or `export-reference/generator-original.zip` for canonical server exports: the unmodified generated archive identified by the lineage checksum.
- Authored adapters, modules, workflows and runtime/deployment recipes: each listed and checksummed in `files`. Undeclared files, duplicate names, traversal, symbolic links and reserved ValorIDE metadata are rejected.

Exports with an existing canonical base may include a `blueprint` object in the source manifest:

```json
{
  "applicationId": "<same Application UUID as lineage>",
  "backend": "https://api-0.valkyrlabs.com/v1",
  "specId": "<canonical OpenAPI revision UUID>",
  "etag": "<server's 64-character SHA256 ETag>",
  "specificationPath": "clipping-service.openapi.json"
}
```

The local `.valoride-blueprint.json` retains this base or the imported specification hash. It contains no token and is excluded from deployment source snapshots. Treat both it and `.valoride-generation.json` as editor metadata; do not put them in project exports. When changing Application identity, import an export carrying that actual identity into a separate folder. The importer never substitutes a production identity nested in fixture lineage.

Canonical server exports use the developer `GeneratedArtifact` revision contract. Their frozen `sourceRevision` retains `applicationId`, `artifactId`, `projectId`, `organizationId`, `revisionRef` (`source-snapshot:<Application UUID>:<artifact UUID>`), `checksumSha256`, positive `sizeBytes`, and the full immutable `commitSha`/`treeSha` when sourced from GitHub. The server rechecks the private S3 artifact's domain, ownership, Project/Application grants, organization, exact key and checksum before reading. This descriptor has no synthetic FileRecord/FileVersion identities. Native import validates and retains it as descriptive metadata; an offline import does not authenticate server ownership or manufacture a receipt.

Legacy exports may instead declare actual FileRecord/FileVersion pins: explicit `storageDriverId`, `fileRecordId`, immutable `fileVersionId`, positive `fileVersionNumber` and checksum, with equivalent asset pins and matching included bytes. Missing or invented versions are rejected. Existing uploaded records retain their access/status semantics; they are not converted by this bridge. New canonical developer artifacts require S3 with no local fallback. Local-driver legacy descriptors remain usable for offline fixtures. Blueprint synchronization does not repin custom source; edited source needs a new immutable snapshot before generation can consume it.

## Canonical export and verification scope

For a successful authorized receipt, `GET /v1/thorapi/applications/<Application UUID>/developer-project/export?receiptRef=<receipt reference>` returns the exact accepted package, admitted editable `openapi-spec.yaml`, custom source/modules/configuration, committed override policy, unchanged original generator ZIP and actual generation receipt. Its manifest checksums every included file. The original generator ZIP is retained separately from the assembled project and has its own private developer artifact. Runtime assembly uses the admitted source descriptor, rather than materializing whichever source snapshot is latest.

Local acceptance exercises a real pushed Git fixture whose branch advances, bounded Git object retrieval, private S3-driver fixtures, actual generated-model BuildProfile persistence, frozen-revision checks, custom Java compilation/execution, export and native import. Method-security tests verify current read/write grants and cross-Application denial; storage tests verify cross-organization denial before presigning. The combined export fixture uses a fixture receipt/runtime collaborator. These tests do not establish a live GitHub/S3 production generation receipt or a deployment.

The clipping owner's original production inspection found 13 developer FileRecords using local storage with no immutable version pins. A separate infrastructure owner handles their approved preservation/migration and parity checks; consult that owner's current receipt for their present state. This bridge changes no existing object, FileRecord ID, Project link, ownership, ACL or status, and establishes no production workflow enablement. New source/generation/runtime ZIPs use the private developer domain and existing Application/Project authorization. The API, key contract and remaining production checks are recorded in [the GitHub source handoff](github-source-handoff.md).

## Portability and dependency scope

The export retains portable Java/TypeScript source, workflow/module definitions, Python adapter, target-platform FFmpeg recipe, and dependency/storage/run configuration. Native import is tested without hosted signup. The generated Java/UI builds and local UI/renderer execution were tested in isolated acceptance; that does not prove complete business operation on every deployment target.

The clipping renderer uses Python's standard library plus configured FFmpeg/ffprobe executables. Its workflow definition requires a compatible ValkyrAI Java workflow runtime (`LocalBashExecModule`). Transcription and editorial-selection providers remain unconfigured, so customer model choice and complete hosted-auth independence are not yet proved. Private storage, authenticated delivery and target-platform H264 must be configured and verified. Customer credentials remain runtime secret references; values are excluded from source publication.

The FFmpeg recipe explicitly enables GPL functionality when selecting libx264. Dependency and bundle license terms must travel with the export; ownership of authored/generated application code does not establish permission to redistribute every dependency. A complete license inventory and independent backend-auth/model acceptance remain prerequisites for a broader portability claim.
