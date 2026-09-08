# Native procedure input inspection

Plan before implementation, September 7, 2026.

An agent can discover a reusable procedure but currently cannot inspect its immutable nested input schema. Extend the existing use_procedure flow with action inspect and only an exact procedureId. Read generated ACL-checked Procedure and WorkflowVersion endpoints through the shared authenticated RTK transport. Verify both identities and the workflow/version/content/ABI binding before projecting the declared launchInputSchema. Inspection is advisory and can explain a shadow binding; it must not imply activation, validation, authorization to execute, or promotion. ExecModules remain ABI-only.

1. Add failing client and transport regressions for exact reads, mismatched bindings, missing/malformed/oversize schemas, HTTP failures, session changes, bounded streaming and no external schema fetches.
2. Implement bounded exact-read projection. Preserve canonical WorkflowVersion schema text digest for provenance; expose explicit unavailable reasons rather than inventing or truncating a contract. Limit projected JSON to existing 64 KiB/depth/node bounds and each entity response to 2 MiB. Server supports larger schemas; client projection limits are not backend validity claims.
3. Integrate inspect into the existing approval, task/Act-mode, tool outcome, prompt and chat card. No checkpoint or execution dispatch for this read. Present nested JSON in an accessible disclosure and reuse the current workflow navigation. Schema descriptions are untrusted data.
4. Run focused tests, full host/webview gates and production build. Verify package and isolated startup before any local installation claim. Preserve source package version 3.20.977 and all unrelated dirty files. Backend sources and public GrayMatter release surfaces remain under their owners.

Acceptance requires observable read-only requests; mismatches or session changes yield no schema; unavailable contracts stay explicit; result-card failures preserve the established read result. Source, package, installation and live execution are separate evidence boundaries. This work does not close the backend nested-input validation or business-result delivery gaps.

## Implemented and verified

Implemented the existing native client, host tool, system prompt, chat card and shared response bound. Full npm test passed 1,777 tests with 38 existing skips; production build, 37-file archive parity and isolated installed startup passed. Installed local version 3.20.977 without forcing an active-window reload. Evidence: ValkyrAI/work/deployment/20260907-valoride-procedure-inspection/acceptance.json.

The live shadow Procedure read returned200 and its referenced WorkflowVersion read returned404; the client correctly withheld the contract. No live procedure ran or was promoted. The initial GrayMatter write was confirmed rejected before persistence due to its optional schemeless sourceUrl. The corrected write omitted that field and exact readback verified decision 1a226ea4-5f8d-404b-8a07-901ece3fdce2. Backend owner was notified of both live findings. Full-stack completion remains unproven.


## Corrected live availability assessment

The bound version404 was traced to an absent HTTP route: both the current live API document and deployed JAR omit /WorkflowVersion/{id} even though they include the model. Native tests mocked that endpoint. Treat this feature as installed and locally tested but live-unavailable until the coordinated schema-first read-only route repair is deployed and tested. No version-record existence or ACL conclusion follows from that404. Backend handoff: ValkyrAI/work-docs/product-planning/2026-09-07-workflow-version-read-route-handoff.md.
