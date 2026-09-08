# MCP recovery visible to humans and agents

## Problem

The shared MCP handler reports blocked or unknown outcomes to the model but does not consistently emit a terminal chat message. After a transport failure, the last visible MCP event can remain request-started. The human cannot reliably steer work if the agent knows an outcome is uncertain while the chat still indicates progress. The previous MCP integration acceptance covers execution outcomes; this is a newly identified UI-delivery gap.

## Plan

1. Add regressions through the real shared engine for unknown transport, local validation, checkpoint failure, revoked approval and cancellation. Require a bounded terminal chat report as well as the existing agent outcome; failing UI delivery must preserve the outcome and must not cause dispatch or replay.
2. Reuse mcp_server_response for sanitized, explicit local reports: Not sent and Outcome unknown. Preserve original received responses, manual approval, checkpoint barriers and transport ownership. Report post-call checkpoint recovery to the human without changing the received operation outcome.
3. Treat a terminal MCP response as visible progress in shared chat loading state and render the existing response component in tests. No separate client runtime, authorizing metadata fields, or new backend contract.
4. Run focused regressions, full consumer tests, production build, exact package audit, isolated packaged startup and local installation parity. Preserve the preceding VSIX as rollback and do not force an active-window reload.

## Boundaries

GrayMatter preflight ready: 38 pages, 3606 records, 127 matching invariants, zero omitted. Shared MCP execution rule 686bc6af-b9dc-437d-99ca-c5b1bd612e3e and explicit outcomes rule 9429c5af-274a-490a-949e-6e246c4a83cc apply. Human-readable reports must not expose raw exceptions or recommend replay of uncertain writes. Current-window activation, authenticated business execution and hosted arbitrary trace ingress remain separate evidence. ExecModules use ABI only. Root owner retains ValkyrAI dashboard/backend release work.

## Status

Plan recorded before implementation. Evidence: ValkyrAI/work/deployment/20260907-valoride-mcp-recovery-ux/.

## Test-runner diagnosis and plan extension

Two full webview runs hit the unchanged five-second deadline in valkyraiHost, thorBridge and ExtensionStateContextProvider. All six tests in those three files passed with two workers and unchanged deadlines. At diagnosis, system load was 28.27 and a concurrent Java build used roughly eight CPU cores. Run the entire webview suite with two workers; if all coverage passes, cap the normal Vitest worker count at two and rerun the standard full consumer command. Preserve all tests, isolation and deadlines. This addresses test-runner resource contention without weakening assertions or excluding coverage.

## Verified source and browser result

Twelve new tests cover terminal human reports, unchanged observed outcomes, no repeat dispatch, loading-state completion and the existing response row. Eleven host/loading regressions failed before the fix. Focused host checks: 68 passed; ChatRow rendering: 26 passed. The browser fixture used the actual McpResponseDisplay component at 1280 by 720 and showed all three report states with no captured console errors. This fixture does not establish native authenticated execution.

The normal npm test command passed with 1746 tests (932 Jest, 97 host Vitest, 6 Node, 231 actual VS Code, 480 webview) and 38 existing skips. Test deadlines and test inventory were preserved. Five package-audit tests passed. Production build, exact VSIX audit and 37-file archive parity passed. The archive activated in isolated VS Code 1.133.0 and was installed locally with 37 runtime files read back. Total checks: 1751. No forced active-window reload, authenticated native execution, hosted trace ingress, backend release, business Workflow write or measured savings claim.

GrayMatter recovery rule ad703d8a-3796-4c75-9e48-020ea1cd4711 and test-concurrency methodology be7497ae-ad2f-4c33-b157-7cf567c3caef were written and verified by exact ID/type/text/sourceMessageId/sourceUrl readback.

Installed bundle SHA-256: `b9f74c12ad96b765e7c50a68c9a30839a891d53b2e431316ba30d9459eaddc57`. VSIX SHA-256: `c1390abf83e9539d3f98ab72b9ccb52b234832b8603c5cd3f763ab752819a155`.
