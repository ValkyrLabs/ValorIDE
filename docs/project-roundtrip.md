# Import and synchronize an application project

Run **ValorIDE: Import Local Project Package**, select the project-export ZIP, then choose its parent folder. The Projects view also has an import button. Local import requires no ValkyrAI account and makes no hosted request. Open the imported project from the success notification, then use the existing Build Project and Run Project actions.

The importer verifies every authored file against `source-manifest.json` and the original nested generated ZIP against `generation-lineage.json`. It installs generated Java/UI source alongside editable specifications, custom adapters, workflow/module definitions and dependency/storage/run configuration. Repeated or interrupted imports use the existing write-ahead baseline and preserve local edits. Imported lineage remains descriptive; it does not create a verified production receipt.

Portable reference exports can instead contain `export-manifest.json`, `project/source-manifest.json`, the authored files under `project/`, and the original generated ZIP under `artifacts/`. The outer manifest must declare and checksum every remaining file. ValorIDE installs the editable project at its normal root and retains the complete original envelope under `export-reference/`, including genuine local receipts, workflow graphs, dependency contracts and license notices. Edit the normal project files; the retained envelope records what was imported. A local receipt keeps its original scope and does not enable its workflow or establish production readiness.

Edit and **save** the editable specification. Run **ValorIDE: Synchronize Project Blueprint** from the command palette or the project context menu. This action requires a signed-in account with access to the Application on the configured ValkyrAI backend. It publishes only the specification through the existing authenticated Application Blueprint API. It does not publish custom source, regenerate, enable the Application, or deploy.

The first synchronization compares the canonical document to the original imported specification before retaining the server's ETag. Subsequent saves retain that base revision. If another editor changed the canonical Blueprint, choose **Review changes**, merge changes in the local side of the diff, save the file, then choose **Publish reviewed changes**. The canonical side is read-only. The server is checked again against the exact reviewed revision before PUT. Cancelling leaves local edits and the base revision intact. Retry checks whether an interrupted save already committed before sending another PUT.

## Publish source using the existing Git client

Run **ValorIDE: Publish Project Source to GitHub**. Choose the existing repository, its currently checked-out branch, and GitHub remote; review the affected project paths and commit message, then publish. The action uses the built-in `vscode.git` API for staging, commit and push. VS Code's Git/GitHub integration handles local authentication. This command never reads or exports a GitHub token and never adds a server credential binding. Ordinary editor Save does not push.

Pre-existing staged work or merge conflicts stop publication. Only changed files inside the selected project are staged; credentials, editor binding metadata, caches and the original generated ZIP are excluded. Branch switching, repository creation and initial GitHub connection remain available through VS Code's existing controls. No automatic merge or force push occurs. If push fails after commit, the commit remains visible in Source Control; retry Push there rather than creating another commit. The returned full commit SHA identifies the source version. The server import bridge is not connected yet, so local publication does not claim an S3 snapshot or successful regeneration.

## Regeneration ownership

The canonical Blueprint/OpenAPI and its generator bundles own generated source. The local ownership list comes from the checksum-verified generator ZIP before authored files or editor configuration are added. A canonical regeneration replaces known generated files by default, including local edits, after showing the affected paths and receiving **Replace generated files**. Cancel leaves all project files intact. Unknown collisions and custom subclasses/extensions outside generated ownership remain protected. No automatic code merge is performed.

For intentional generated-file overrides, add patterns to **`.valoride-generator-ignore`** and commit that exact file in the project repository before regeneration. The policy applies to existing and future generated paths. Uncommitted policy changes stop regeneration. **`.gitignore` controls Git staging and is never used as regeneration policy.** Repeated local package import remains a recoverable installation action and preserves local edits; it does not itself request destructive canonical regeneration.

## Project-package contract

ZIP paths are relative to the package root. Required files:

- `source-manifest.json`: `schemaVersion: 1`, `version`, and `files` containing each authored file's `path`, `sha256` and byte count.
- `generation-lineage.json`: listed and checksummed in the source manifest, containing the original `applicationId` and `packageSha256`. Keep actual lineage and scope; a local fixture is not production proof.
- One complete editable OpenAPI 3 specification, also listed and checksummed. Its `info.title` supplies the project name and `info.version` matches the manifest version. Set `specificationPath` in the manifest if several specifications are present.
- `artifacts/generated-<version>.zip`: the unmodified generated archive identified by the lineage checksum.
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

An export advertising a frozen `sourceRevision` must retain `revisionRef` (`source-snapshot:<Application UUID>:<revision UUID>`), explicit `storageDriverId`, `fileRecordId`, immutable `fileVersionId`, positive `fileVersionNumber`, and `checksumSha256`. Its `assets` list retains the same storage/version/checksum pins plus a source `path` for each referenced uploaded asset. Each asset checksum must match the included authored file. Missing drivers, null versions, wrong Application identity or mismatched checksums are rejected. These declarations are preserved as source metadata; they do not authenticate server ownership or prove a generation receipt. A production export advertising proved generation requires this descriptor. Local fixture exports can be imported without it.

For an export declaring FileRecord/FileVersion pins, the server must resolve those identities under the authenticated tenant, verify that the immutable FileVersion belongs to the declared FileRecord and storage driver, retain its existing access/status semantics and validate the checksum. This optional descriptor is not a replacement for the developer artifact service's own revision contract. Production round-trip inputs require **`storageDriverId: "s3"`**; local fallback is rejected. Explicit local-driver descriptors remain usable for offline fixtures without any provider migration. The server must never select a mutable current/latest pointer or infer S3 from an enabled flag. Blueprint synchronization does not repin custom source; edited source needs a new immutable snapshot before generation can consume it.

## Server handoff still required

Canonical generation must freeze an authorized developer source-snapshot/artifact revision, storage driver, full commit SHA and checksums together with the canonical spec revision, materialize that exact revision, and return authored assets plus the unmodified generated ZIP in a receipt-backed project export. Where existing uploaded FileRecords are referenced, retain their actual immutable version pins rather than inventing versions. The existing snapshot materializer selects the latest snapshot for deployment builds; generation currently does not consume it. Blueprint synchronization alone does not establish this handoff. Production BuildProfile artifact references also need a persistence endpoint that retains updates; the clipping owner's current nested update does not persist and the standalone endpoint returns 404.

The clipping owner's live acceptance on 2026-10-03 found all 13 uploaded production assets on driver `local`, with `latestVersionNumber` and `currentVersionId` null. Infrastructure inspection found their current physical root at `/tmp/valkyrai-files`; the base configuration defaulted to local because the S3 default-driver variable was absent. Enabling S3 only registers the driver. The imported OpenAPI is bound to `Application.openAPISpec.sourcePath`; the other assets are Project references. Those records are not frozen generation inputs. Provider changes or data migrations require a separate approved operation and parity verification; this workflow performs neither.

All 13 assets are developer material: ten authored source/configuration files, a source manifest, the unchanged locally generated ZIP, and genuine local generation evidence. They are currently FileRecords with Project links, not customer media. Preserve their IDs, links, ownership, ACLs and status during storage preservation. GitHub source snapshots and new build artifacts must use the canonical developer project/revision/artifact services and Application authorization, rather than being rerouted through media upload/moderation. The shared backend gaps and exact existing key builders are recorded in [the GitHub source handoff](github-source-handoff.md).

## Portability and dependency scope

The export retains portable Java/TypeScript source, workflow/module definitions, Python adapter, target-platform FFmpeg recipe, and dependency/storage/run configuration. Native import is tested without hosted signup. The generated Java/UI builds and local UI/renderer execution were tested in isolated acceptance; that does not prove complete business operation on every deployment target.

The clipping renderer uses Python's standard library plus configured FFmpeg/ffprobe executables. Its workflow definition requires a compatible ValkyrAI Java workflow runtime (`LocalBashExecModule`). Transcription and editorial-selection providers remain unconfigured, so customer model choice and complete hosted-auth independence are not yet proved. Private storage, authenticated delivery and target-platform H264 must be configured and verified. Customer credentials remain runtime secret references; values are excluded from source publication.

The FFmpeg recipe explicitly enables GPL functionality when selecting libx264. Dependency and bundle license terms must travel with the export; ownership of authored/generated application code does not establish permission to redistribute every dependency. A complete license inventory and independent backend-auth/model acceptance remain prerequisites for a broader portability claim.
