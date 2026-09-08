# Preserve procedure outcomes across chat delivery failures

## Problem and intended behavior

The native Procedure handler awaits its result card inside the same try/catch as remote dispatch. If the validated client response is returned and the subsequent local `say` call fails, the catch path replaces the known result with DISPATCH_OUTCOME_UNKNOWN or CONTROL_OUTCOME_UNKNOWN. A second failed error-card write can then throw out of the handler entirely. This loses useful execution evidence and may encourage an unnecessary remote retry.

Preserve the exact safe client projection in the agent tool result once the client has returned it. Report uncertain card delivery separately with a bounded presentation notice. The notice must not contain raw local/transport errors, imply that a remote operation failed, or authorize retry/fallback. Error results must also survive their own card-delivery failure. Approval, request-history and checkpoint failures before dispatch remain blocking.

## Plan

1. Snapshot the owned handler and its direct/shared-engine tests. Reproduce post-response card failure, error-card failure, and the real ToolExecutionEngine result path before implementation. Retain existing approval/session/checkpoint tests.
2. Add one private result-delivery helper inside the existing handler. It attempts the card once and always returns the already prepared bounded result to the tool engine, with a presentation notice only when delivery is unverified. Do not add a new runtime, storage queue, retry path or webview mutation.
3. Verify returned dispatch/control/read results, exact execution references, stable remote call counts, safe error projection, and blocking pre-dispatch request-card failure. Run focused tests, the complete consumer test matrix and the standard production build.
4. Package a distinct local candidate using the existing audited VSCE flow; verify archive bytes and isolated installed-host startup before local installation. Preserve the previous control VSIX as rollback and do not reload active user windows. No backend changes, production Workflow writes, public publication or current-window/live acceptance claims.
5. Record verified implementation and package/install evidence in GrayMatter with exact readback. Card delivery, agent tool-result delivery, server execution, persisted outcome and business correctness remain separate evidence boundaries.

Evidence: `ValkyrAI/work/deployment/20260907-valoride-procedure-result-delivery/`.

## Source acceptance

Ten regressions failed before the repair: result-card failure for all six actions, error-card failure for unknown dispatch and forbidden access, failed auto-approved request history, and known dispatch delivery through the real shared tool engine. The corrected helper preserves the client projection and adds only a bounded `presentation.status=unverified` notice when the card attempt throws. Approval, request-history and checkpoint behavior remains in the existing pre-dispatch path.

The first complete gate caught the mixed Jest/Mocha type environment rejecting `it.each`. Its log and exact test source are preserved; ordinary named tests now express the same cases. The replacement full gate passed: 845 host Jest, 97 host Vitest, 6 Node, 231 actual VS Code and 479 webview tests (1,658 passed, 38 existing skips), including extension type checks and lint. Five package-audit tests also passed. All three owned source files matched their recorded hashes after testing.

The shared-engine assertion establishes delivery into the in-memory agent tool-result collection. It does not simulate disk exhaustion recovery, guarantee later durable task-history persistence, or perform a live Procedure execution.

## Local delivery

The standard production build passed. The distinct 3.20.976 VSIX has SHA-256 `eaad4ef3011fd6c1f84e1f4548ee310b2b81aba20828ce089aa296c1349344db`; its extension bundle is `0c33cbbde1db32d7e81de28d64d9e159728493e721a9ffe9e693798e8912b466`. The archive audit passed and all 37 runtime files match their build inputs. An early audit call ran before the archive existed; that timing failure is preserved, and the original completed archive passed without rebuilding or repacking.

Isolated production-mode startup passed on the installed VS Code 1.133.0, including exact bundle identity, dependency readiness, three worker registrations, canonical prompt and Studio validation/session guidance. The fixture received no authenticated request and no handoff. Official local CLI installation then succeeded, and all 37 installed files matched, allowing only VSCE's standard license/readme filenames and VS Code's manifest metadata. The previous control VSIX remains the verified rollback. No active window was reloaded, no live Procedure was invoked, and no backend/public release occurred.

Acceptance: `ValkyrAI/work/deployment/20260907-valoride-procedure-result-delivery/acceptance.json`; 1,663 total checks passed, with 38 existing skips in the consumer matrix. GrayMatter methodology `43f899b4-f30c-4ffd-aa90-7e754d6d2c1f` has an exact readback.
