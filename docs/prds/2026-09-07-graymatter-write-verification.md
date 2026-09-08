# Verify durable memory before reporting completion

## Findings and objective

The active Build Mode final-report path uses `GrayMatterMemoryService`. That service currently calls any resolved write `written`, including an undefined response without an ID. The current canonical backend explicitly returns HTTP 202 without a record for skipped low-signal writes. A response alone is therefore insufficient evidence for a completed memory artifact.

The source audit also found that `GrayMatterCaptureService` has no production caller and extracts prose decisions, not executable tool traces. Canonical backend memory persistence already calls SkillOptics continuous learning. Do not wire duplicate observations or claim that a stored report is a captured executable procedure. The complete agent-trace ingestion contract remains a separate integration requirement.

## Plan

1. Freeze the owned ValorIDE client, memory service, queue tests and final-report adapter files. Reproduce empty/202 write acceptance, invalid identity, readback mismatch/denial, session drift and uncertain replay behavior using the existing authenticated RTK transport and consumer tests.
2. In the existing GrayMatter client, keep one POST to the canonical write route, followed by one exact authorized GET. Bind both requests and the final verification to the initial token and effective tenant headers; do not persist credentials or supply new identity overrides. Require supported HTTP statuses, a valid UUID and matching returned ID/type/text. Compare the GET against the backend's normalized POST text rather than duplicate its normalization rules. Return only a bounded client verification receipt with content hashes and `write_verification` purpose.
3. In the existing memory service, report `written` only for that verified receipt bound to the submitted input. Preserve failures and unknown outcomes separately. Retain uncertain writes in the existing pending storage as verification-required records, carrying an exact memory ID when available. Never resend them during ordinary pending-write replay. This does not activate automatic replay or claim that legacy queue scope has been repaired.
4. Update the existing Build Mode result contract so unverified memory never becomes a ready/published final report. Keep the local artifact and safe memory reference available for operator review. No second queue, memory runtime, agent inference, generated schema edit or backend endpoint is added.
5. Run focused regressions first, then the full consumer matrix, production build and existing package/install readback workflow. Preserve the previous local VSIX as rollback; do not reload active windows. Record source, fixture, package, installed-host and live acceptance boundaries separately in GrayMatter.

Evidence: `ValkyrAI/work/deployment/20260907-valoride-memory-write-verification/`.

## Remaining full-loop requirements

Native arbitrary-agent trace capture must preserve observable calls, typed inputs/outputs, dependency provenance and failures through canonical SkillOptics/Workflow owners. Current prose capture and server memory-write observations do not establish this. Procedure nested input validation, compact business results, retired-module eligibility and the disposable control canary remain coordinated backend handoffs. No token/cost savings are inferred from this memory-delivery repair.

## Implementation and consumer validation

The seven-file change keeps unknown persistence separate from transport/session errors using a write-specific error type. The shared session and retrieval state contracts remain intact. Build Mode now accepts only explicit written/queued outcomes for its command receipt; final-report readiness continues to require written memory. Existing verification-required queue records preserve known IDs across storage reload and are not replayed. This does not activate replay or repair the legacy queue's broader account-scope contract.

Eighteen new regressions failed before the first implementation. The focused set passed 183 tests after adding storage/restart and input-hash coverage. The full gate then exposed an error-union integration issue, which was repaired by keeping unverified scoped to writes. The final full consumer gate passed 1,679 tests: 866 Jest, 97 host Vitest, six Node, 231 actual VS Code and 479 webview tests; 38 existing skips remain. Compile/typecheck/lint passed. Five package-audit tests also passed. Production build, exact VSIX packaging and installed-host evidence are tracked separately in the acceptance artifact.

John's September 7 correction applies to the mechanization handoff: ExecModules use canonical ABI only. No ExecModule metadata field or metadata/discoverability eligibility gate is added by this memory-delivery repair. The separate audit/handoff was corrected and the invariant was saved and verified in GrayMatter (`8489a92f-ceaa-4470-ae4f-71ce7987222a`).

## Local package and installation acceptance

Production build, 39-entry VSIX audit, all 37 runtime-file comparisons, isolated installed-host startup on VS Code 1.133.0, and default local extension installation/readback passed. The installed extension bundle is `64c9e9c37ba1ebe404c6d3f2cc7bee791cc200ba3392b3bf47f41980ecb88791`; VSIX is `d86b822ae49ff1b7da295ce05ef0100bf3c1aec1bf40e93e9577ef1b254f4640`. The prior result-delivery VSIX remains the verified rollback. No active window was forcibly reloaded. Authenticated memory writing from that window, legacy queue account scoping and arbitrary agent trace ingestion remain unverified or unimplemented, as recorded in `acceptance.json`. No backend release, business Workflow write, marketplace publication or savings claim is part of this increment.
