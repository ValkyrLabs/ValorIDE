# Procedure execution control from ValorIDE

An agent can start a durable ValkyrAI Procedure from ValorIDE, but the native tool currently supports only discovery, dispatch and status. A person should be able to ask that agent to pause, resume or cancel the exact execution through the existing approval and Workflow paths.

## Existing owners and scope

Extend `use_procedure`, `ProcedureToolHandler`, the session-bound `ValkyrProcedureClient`, the existing prompt contract and `ProcedureToolCard`. Reuse the shared RTK transport and `/v1/vaiworkflow/executions/{executionId}/pause`, `/resume` and `/stop` routes. Their canonical WorkflowController enforces execution WRITE permission and delegates to WorkflowExecutionService. Do not use the differently shaped generated operation stubs, a new controller or a separate execution runtime.

ValkyrAI backend/frontend, generated code, Maven, publishers and live Workflow writes remain release-owner controlled. Local ValorIDE source, tests and package preparation are this lane's scope. The latest verified GrayMatter preflight and exact methodology reads remain the temporary context during the owner's requested api-0 activation quiet period; refresh live memory when that period ends.

## Behavior

- Add actions pause, resume and cancel with exactly one bounded UUID input, executionId. No resume payload, policy, identity, trace, URL, arbitrary input edit or approval override.
- Require the existing human approval prompt for each control operation. The existing useProcedures setting explicitly covers discovery, invocation and status; it must not silently gain automatic control authority.
- Keep the selected backend/session frozen across approval. After approval, read the exact execution and reject currently inapplicable states: pause requires RUNNING; resume requires PAUSED; cancel allows RUNNING, PAUSED and existing waiting states. This read is advisory preflight, not an atomic state precondition or execution authorization; the server remains authoritative for races, reconciliation and exact approval continuation.
- Recheck active task and Act mode around the read and checkpoint, save the existing task checkpoint before the control POST, and perform at most one control write. Denial, ended task, Plan mode, failed checkpoint or changed credentials must prevent the write.
- Accept a control response only with HTTP 200 and the exact execution identity/known state. Project only the existing bounded execution state. Show the actual returned state, including a terminal or unchanged state; do not claim the requested transition occurred merely because a request returned successfully.
- Keep control conflicts distinct from dispatch conflicts. For uncertain writes, show the exact known execution reference and require inspection; never retry, start another execution or launch an agent fallback automatically.
- The chat card explains that pause takes effect at a supported execution boundary, cancellation does not reverse completed effects, and resume does not grant approval or supply human input. Existing authenticated Open workflow navigation remains available for valid control results.

## Validation and delivery

First reproduce the missing client, host and card behavior with focused tests. Cover exact endpoint/body minimization, HTTP and identity validation, forbidden/conflict/uncertain responses, human approval even with procedure auto-approval enabled, inapplicable states, task/mode/session changes, checkpoint failure, and truthful no-op/terminal result display. Include the normal parser/tool route rather than a new direct UI mutation path.

Run focused tests, then the existing complete host/webview matrix and production build. Render the real control request/result card at narrow and wide widths. Package separately and retain the previous installed VSIX as rollback if the full gate passes. Source tests, packaged startup, installed bytes, authenticated runtime control and business outcome evidence remain separate. No live control canary until the release owner grants that lifecycle; no active user window reload or public marketplace publishing.

## Local delivery evidence

Implemented the three controls through the existing native agent tool and its typed host context. The initial regressions produced seven host failures and three card failures; the subsequent full gate caught a missing `control` member in the host's existing client interface, which was repaired there. The final complete matrix passes 1,648 tests with 38 existing skips. Five package-audit tests also pass, for 1,653 checks. Typecheck, lint and the canonical production build pass.

The actual card rendered in twelve isolated browser cases across 360px and 760px, without horizontal overflow, page errors or backend calls. Request explanations, unchanged/terminal returned states and uncertain-control references are visible. This is component QA rather than an authenticated current-window interaction.

The 39-entry VSIX passes the runtime allowlist audit and all 37 source-file comparisons. The initial package verifier did not account for VSCE packaging source LICENSE as LICENSE.txt; that failure and the original archive hash are preserved. Correcting the source-name mapping verified the same archive without repackaging or rebuilding.

Isolated production-mode startup passed on the installed VS Code 1.133.0 with the exact bundle, registered commands, canonical prompt/dependency/worker readiness and zero authenticated handoff requests. The official local CLI installed the candidate, and all 37 installed files match (with normal readme/license names and VS Code's added manifest metadata accounted for). Version remains 3.20.976. Extension SHA-256: c75b612a3f66f96c20f134802ac4c279012c3a9e2a1cf242011ae51173182c02. VSIX SHA-256: 955f4cdfae3de66d5c545c2f63f8ee066308bf94a38ef3891e28d0c75d3e3ab4.

Rollback is the previous Procedure discovery VSIX, SHA-256 393f20270b262730b59ce264a6df5cd759766acc093d975d4c0b28cf2062816f. No active window was force-reloaded. Authenticated live control from ValorIDE, current-window activation and public marketplace publication remain unverified. The release owner has explicitly retained the live control canary until a deliberately disposable execution is available.

Evidence directory: `ValkyrAI/work/deployment/20260907-valoride-procedure-control/`. Control methodology is stored in GrayMatter as a983209b-4aac-408c-97c9-f8cb30d573f3 with exact readback. The strategy refinement queued during deployment is now stored and verified as 96ef3523-0ad8-48d2-85df-fd13280906b0.


## Immutable execution version continuity — 8 September 2026

Procedure dispatch rejects a supplied execution version that is malformed or differs from the top-level immutable WorkflowVersion. UUID comparison ignores casing. The result remains an unknown dispatch outcome; the client neither retries nor launches an agent fallback. Exact status reads preserve a valid observed version and reject malformed supplied version evidence. An omitted or null legacy version stays absent, rather than being inferred from another record. This is client contract validation, separate from server authorization and business-output correctness.

Focused regressions were red first. Shared source acceptance is recorded in ValkyrAI/work/deployment/20260908-procedure-version-continuity. GrayMatter private adapter/mirror and ValorIDE source changes do not establish installed-plugin, extension activation, backend deployment or new live Procedure execution.
