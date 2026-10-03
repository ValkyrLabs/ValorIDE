# Existing GitHub capabilities and required server handoff

Verified from maintained source on 2026-10-03:

- ValorIDE already activates `vscode.git` and uses API version 1 in `AgentRuntimeCoordinator.setupGitTelemetry`.
- The installed VS Code 1.136.1 includes the `github` and `github-enterprise` authentication providers.
- Project publication reuses `vscode.git` staging/commit/push and leaves local credentials with that client. A local authentication session is not an authorization to transfer a token to a server.
- The existing server connector is bean `gitHubModule`, class `com.valkyrlabs.workflow.modules.scm.GitHubModule`, metadata version `1.0.0`.
- Its required config is `auth.token`, `owner`, `repo`, `operation`. Implemented operations: `create_issue`, `create_pr`, `create_release`, `list_issues`, `get_repo`, `trigger_workflow`.
- Outputs include `status` (`success`/`error`), `data`, resource `url`, and operation-specific fields. `trigger_workflow` accepts `workflow_id`, `ref` and `inputs`; its default ref is mutable `main`.
- It has no source/archive/contents fetch operation and no commit-to-S3 snapshot operation. `get_repo` returns repository metadata, not source. A successful Actions dispatch is not a downloaded or imported source revision.

## Preferred flow and immutable boundary

Canonical Blueprint/OpenAPI and its bundles generate source. The customer downloads and edits the project, then explicitly publishes to their chosen GitHub repo/branch through the existing local Git client. The server GitHub module needs a narrowly scoped fetch operation for the **full immutable commit SHA**, followed by the existing authorized developer source-snapshot/project/artifact services. No mutable branch name can be the regeneration input.

The fetch operation must use an existing authorized server credential binding, scoped OAuth authorization or GitHub App installation with the necessary repository-content access. Any new persistent access requires explicit consent and a supported secret-transport handoff. Never scrape credential stores or copy the local VS Code token into ordinary module configuration or logs.

The resulting snapshot must be authenticated tenant-owned, explicitly stored with the durable S3 driver, and pinned by the developer source/artifact revision, full commit SHA and checksums. Preserve actual FileRecord/FileVersion references where the existing contract uses them; do not invent versions for the current unversioned records. Generation admission must freeze that descriptor together with the canonical spec revision. Export must return those real references, authored modules/workflows/adapters/config, committed generator override policy and the unchanged generated ZIP. Direct server source upload can remain an alternative if it establishes the same immutable boundary.

## Existing domain and storage boundaries

`ApplicationSourceSnapshotService.publish` already uses Application `write` permission, creates `source-snapshot:<Application UUID>:<revision UUID>`, and stores a `GeneratedArtifact` with Application, owner, tenant/account, manifest and checksum. Read access uses Application `read` permission. Preserve these controls. Its current implementation calls generic `FileUploadService.initMultipartUpload` / `uploadAndFinalize` and `requireCleanFile`; that couples developer ZIPs to the generic upload/scanning pipeline. The developer bridge must resolve this coupling within the existing services, without adding a parallel authentication system or treating source as customer media.

`FileUploadService.buildStorageKey` currently builds `<organization UUID>/<optional space UUID>/<directoryPath>/<UTC timestamp>/<random UUID>/<lowercase filename>`. The source service supplies `application-source/<Application UUID>` as its directory. `TenantArtifactStorageService` resolves organization from the authenticated context and stores generated artifacts through the existing tenant file storage; canonical generation supplies `application-generation/<Application UUID>`. `S3StorageProperties.applyPrefix` adds the configured physical prefix. These are existing behaviors, not permission to invent a flattened shared layout.

`GeneratedTenantRuntimeArtifactService` separately writes S3 directly at `generated-runtime/<Application UUID>/<version>/<ZIP name>`. That path contains no explicit tenant/project segment and does not establish the requested canonical tenant/project/revision ownership hierarchy. Its correction requires the existing developer artifact policy and owner review; a private encrypted bucket alone is insufficient evidence.

For GitHub snapshots and new generated artifacts, reuse the approved developer project/revision key builder and ownership mapping. Record exact logical key, physical S3 key, tenant, project, Application, owner, revision/commit and checksum in a private receipt. Verify authorized-owner retrieval and cross-tenant denial at the application layer. Keep S3 Object Ownership/object ACL mode distinct from application ACLs; this milestone changes neither object ACLs, IAM nor bucket policy. Existing FileRecord preservation retains its original keys, IDs, links and AVAILABLE/BLOCKED/scan status; copying bytes does not promote a blocked record or convert its domain.

## Exact shared backend prerequisites

Coordinate these files with their owners before implementation:

1. `workflow/modules/scm/GitHubModule.java` and focused tests: add the bounded immutable-source fetch operation, using supported consented auth. Bound archive size/path expansion and restrict credential-bearing requests/redirects to approved GitHub endpoints.
2. `valkyrai/service/ApplicationSourceSnapshotService.java` and its existing developer artifact storage collaborators/tests: retain Application authorization and GeneratedArtifact revision/owner/tenant/manifest/checksum, remove unintended media-pipeline coupling through the canonical developer storage contract, and materialize a specified immutable S3 revision with tenant/checksum checks. Its current `materializeLatest` cannot implement this contract.
3. `valkyrai/appgeneration/AppGenerationRuntimeService.java` and tests: freeze source descriptor plus spec revision during durable admission, carry it through run/receipt/artifact metadata, and reject changed or missing bases.
4. `valkyrai/service/ThorAPIOrchestrationService.java` and tests: consume the admitted source revision, retain authored source outside generated ownership, apply the explicitly committed override policy and create the complete project export. Current generation receives admitted canonical specification only.
5. `valkyrai/service/GeneratedTenantRuntimeArtifactService.java` and tests: use the frozen revision for deployment assembly and the canonical tenant/project/revision artifact key contract. It currently materializes the latest source snapshot and writes a direct tenantless S3 runtime key.
6. BuildProfile persistence owner: retain its selected artifact/source reference on an authorized persisted endpoint. The clipping owner's nested update does not persist; the standalone endpoint returns 404.

Infrastructure owns the S3 default-driver correction and approved existing-byte migration/parity gate. This milestone performs neither. No production workflow enablement or schedule activation is justified until storage/version/auth/generation prerequisites pass. This task created no workflow or promotion approval IDs; obtain actual approval records and UI links from the workflow owner before reporting desk items.
