# Agent execution evidence for reusable workflows

## Full integration objective

Turn authorized observable agent tool calls into evidence that canonical SkillOptics can validate and compile through versioned Workflow ABI, then expose the resulting procedures for independent agent reuse. Preserve inputs, output references, dependencies, execution outcomes and provenance. A prose memory, successful HTTP acknowledgement or handled tool message does not establish successful reusable execution.

ExecModules use ABI only. Keep WorkflowExecutionService as durable execution ingress and Run as the existing ExecModule attempt ledger. Do not fabricate Workflow/Run identities for external agent calls, add ExecModule metadata fields, create a second execution bus, or duplicate the server's learning observers.

## Current evidence and boundaries

Native ToolExecutionEngine already invokes configured PreToolUse/PostToolUse hooks. Its current success predicate is handled && !rejected, so caught exceptions and formatted tool errors can be emitted as successful examples. Partial/unhandled legacy tools do not establish completed execution; hooks are optional and remain disabled by default. The hook's bounded text result is not a complete typed executable trace.

Backend EventLogSkillOpticsMonitorService consumes terminal EventLog outcomes linked to an existing route receipt, normalizes a bounded observation and invokes existing learning. SkillExperienceRuntimeService validates exact canonical source references and tenant/owner authority. Neither route proves arbitrary agent-trace ingestion. The backend owner is running a frozen release; this lane changes no backend/generated source and writes no business execution records.

## Plan

1. Reproduce false-positive hook outcomes using the existing shared execution engine and handlers: caught failure, validation failure, denied action, asynchronous workflow dispatch, known completed operation and unclassified result. Preserve existing checkpoint and approval behavior.
2. Extend the existing native tool result with an explicit outcome. Carry that outcome through ToolManager and ToolExecutionEngine into the existing PostToolUse payload. Emit success only for an explicitly successful operation; retain pending, blocked/rejected, failure and unknown states without parsing prose. Preserve the legacy success boolean for existing hook consumers, with an explicit outcome so false is not automatically treated as terminal failure.
3. Classify the existing File, Command, Browser and Procedure handler branches from actual execution facts. Use command exit evidence where available; absent shell exit status remains unknown, running work remains pending. Procedure dispatch is pending, and a lookup must not manufacture a completed business outcome. UI delivery failure must not undo a known remote result.
4. Test the affected consumers, run the full ValorIDE gate and production package/installed-host checks, and keep exact rollback/readback evidence. Do not enable user hooks, invoke user-installed scripts, start agent tasks or post external traces as part of verification. Existing isolated hook fixtures may test the payload contract.
5. Hand off the remaining authenticated trace-ingress contract to the canonical backend owner: scope-bound call correlation, typed ABI input/output references, dependency linkage, redaction, durability/idempotency and explicit capture coverage. Legacy tools, arbitrary Codex sessions, candidate generalization, held-out evaluation, independent reuse and economic benchmarking remain required parts of the full objective.

Evidence: `ValkyrAI/work/deployment/20260907-valoride-execution-evidence/`.

The explicit outcome records the tool operation, not whole-task success or proof that no side effect occurred. A successful status/search lookup is a successful read; its embedded workflow state remains authoritative. Dispatch/control stays pending. Existing userRejected flow control can also represent feedback after a command started, so it must not overwrite an explicit observed execution outcome.

## Consumer validation

The increment changes 13 native files and adds 23 tests. Eleven shared-engine regressions and six command regressions failed first. Review then reproduced three agent-facing command-result failures: completed native commands omitted nonzero or unavailable exit status from their returned text. Those results now expose the exit code or its absence, and feedback after completion no longer incorrectly says the command is still running.

The final focused gate passes 61 tests. The final full consumer gate passes 1,702 tests: 889 Jest, 97 host Vitest, six Node, 231 actual VS Code and 479 webview tests. There are 38 existing skips. Compile/typecheck/lint and five package-audit tests pass. A prior complete full gate is preserved before the final command-result correction; the final source was retested in full.

The existing Node command deadline is now cleared at completion. Browser close accepts the current API's void result. File operations explicitly distinguish complete edits, partial edits, no matching edits, failures and rejections. Command completion requires actual exit evidence. Procedure execution/control remains pending; successful search/status reads describe the read operation only. An uncertain dispatch retains unknown and is not retried.

The outcome is carried by the native hook payload, not an ExecModule metadata field. ABI remains the authoritative ExecModule contract. Legacy hook consumers must inspect outcome to distinguish pending/unknown/partial from terminal failure; success=false alone is insufficient. Hooks were not enabled for the user, and no production agent trace was ingested. Canonical source correlation, complete typed trace capture, legacy-tool coverage and end-to-end compilation/reuse remain part of the full integration objective.

## Local installation acceptance

Production packaging, the 39-entry VSIX audit, all 37 runtime-file comparisons, isolated production startup on VS Code 1.133.0 and default local installation/readback passed. The installed bundle is `b77256fddac83811cac494d5f954d9836f9ea4bb774e7f1e7c5d9783aaee85bd`; VSIX is `d525b7961a67f7fb3ac30a4b29db8c3571ea324992cf0131fac4c39f6972d649`. The prior memory-write-verification VSIX is the verified rollback. No active window was forced to reload, no user hooks were enabled, no agent task or business Workflow was dispatched, and no backend/marketplace release or savings measurement is claimed. Acceptance is recorded in `work/deployment/20260907-valoride-execution-evidence/acceptance.json`.
