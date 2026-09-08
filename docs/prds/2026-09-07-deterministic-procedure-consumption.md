# Deterministic procedure consumption in ValorIDE

An agent should discover existing validated business capabilities before rebuilding a recurring process, invoke an eligible procedure through ValkyrAI, and distinguish dispatch from terminal success. Use the current shared agent tool engine, authentication, RTK transport, checkpoints, tool approvals and chat rendering. GrayMatter remains primary durable context; WorkflowExecutionService remains the execution authority.

Current checkout: rc-6 at 96ad817370eed2231b3f83f68939acf4598ae42f. Preserve existing package.json, submodule and note changes. GrayMatter's reviewer-facing source/archive and ValkyrAI backend/frontend build inputs are owned by coordinated release lanes and are not edited here.

## Plan

1. Add a typed procedure client under services/workflow using the existing ValkyrLabsRtkApi transport and centralized extension authentication. Discovery reads one bounded, generated ACL-filtered Procedure page using schema-defined query-by-example; return limited reference/contract information and explicit page coverage. Execution uses POST /skillopt_ops/execute; status uses exact GET /WorkflowExecution/{id}. Never accept caller identity/policy overrides, expose arbitrary server metadata or infer non-execution from a timeout.
2. Add one native use_procedure tool with search, execute and status actions to the existing parser, tool manager and prompt catalog. Derive stable dispatch identity from the current task plus an explicit logical operation reference. Preserve the pre-tool checkpoint and hook boundary. Execution requires existing tool approval handling or a new explicit default-off procedure auto-approval setting; backend approval floors remain authoritative. Reads and execution must never be disguised as shell or MCP calls.
3. Render concise procedure requests/results in the existing chat tool row and add the explicit approval preference to the existing menu. Show procedure/version/execution references and current state; keep inputs and credentials out of status/error projections. Do not equate a successful HTTP dispatch with a completed business outcome.
4. Test routing, malformed responses, unknown outcomes, task identity, denied/partial calls, bounded inputs/discovery, permissions and real parser-to-client integration. Run focused host/UI tests, type checks and the required broader gates, then build and verify the actual extension/webview bundle. Installation/live execution and independent-agent economic benchmarks remain separate proof points.

This is an adapter to the existing canonical API, not a second execution bus. Discovery is advisory: the server performs fresh eligibility, policy, authorization, receipt, immutable version and idempotency checks at execution. The client cannot promise exactly-once external effects or zero lifetime inference cost.

Live schema 0.9.27 exposes all three paths. GrayMatter preflight was complete over 3,421 rows/36 pages with 116 matching invariants and zero omissions. Relevant decisions: 237723b8-1a4d-4d22-a9a2-129461be80ff (mechanization direction), 4fbffb97-814d-4373-af79-8160ea5d7fde (canonical Workflow execution), c45d73b9-744a-432f-8011-d553e72ebc3e (honest procedure client), 996037ad-728c-4a1b-8ab7-26bffd09b61d (incremental resource limits), dd50b2f4-7b6a-47eb-b071-19b5e189edcb (shared UX/auth).

## Implemented agent contract

The native tool is `use_procedure`; it uses the existing agent parser, ToolExecutionEngine, ToolManager, tool approval dialog and chat row. Sign in using the standard ValorIDE account flow and select the intended ValkyrAI host. The optional **Use Valkyr procedures** auto-approval action defaults off, including for existing users who enabled MCP auto approval. Server-side authorization and human approval requirements still apply.

```xml
<use_procedure><action>search</action><arguments>{"taskType":"workflow","page":0}</arguments></use_procedure>
<use_procedure><action>execute</action><arguments>{"taskType":"workflow","operationRef":"reconcile-case-42","procedureHints":["EXACT_DISCOVERED_REF"],"inputs":{}}</arguments></use_procedure>
<use_procedure><action>status</action><arguments>{"executionId":"EXACT_RETURNED_UUID"}</arguments></use_procedure>
```

Use an actual discovered procedure reference and its declared input contract. Search examines one authorized page of 20 records; its results are candidates requiring runtime validation. Status returns the exact execution's state and references, without arbitrary business data or secret-bearing server metadata. A future declared output-contract projection is still needed for agents to consume completed business results directly through this tool.

The host derives dispatch identity from the current task and logical operation reference. Retry an ambiguous request only with the original reference and unchanged inputs; the client does not retry or launch fallback automatically. Starting a workflow is distinct from completing it. Plan mode, stopped tasks, changed sessions/hosts, malformed requests and failed checkpoint capture prevent dependent dispatch. Calls use the shared authenticated RTK transport; the adapter does not create an execution engine or inference path.

The checkpoint inspection found an existing asynchronous capture gap. Shared tool callbacks now request a barrier that awaits tracker initialization, actual commit and history persistence. Active pre-tool hooks use the same barrier. The existing checkpoint implementation and message history remain authoritative; an explicitly disabled tracker remains disabled. Tests cover waiting on capture/history, failures, hook ordering/cancellation, invalid hook overrides and stopping a task during capture.

The procedure approval/checkpoint methodology is recorded in GrayMatter as `62af13bc-0b41-45ad-bc49-5900b802bb24`, with exact ID/full-text readback. A resumed preflight covered 3,430 rows/36 pages, with all 116 matching invariants returned and no omissions.

## Local verification and remaining boundaries

- Focused host coverage: **33 passed across six suites**, including the real parser, ToolManager, authenticated client, shared execution engine and checkpoint barrier.
- Full webview: **470 passed, 34 skipped, zero failures**. This includes the actual ChatRow integration and explicit started/waiting/completed/fallback/error states.
- Canonical `npm run package`: **passed**, including webview TypeScript/Vite, root TypeScript, ESLint and the production extension build. The seven shipped webview files exactly match the build output, and both the extension procedure runtime and chat card are present in the built assets.
- Full host Jest: **764 passed, 24 failed; 93 passing suites and 46 failing suites**. An isolated checkout at the same starting commit using the same dependencies reproduced 47 failing suites and the same 24 failing tests. This increment introduced no new failing suite and repaired the existing ToolManager fixture's mock-loading order. The full host gate remains unclean; mixed test runners, ESM test setup and existing assertion failures require follow-up.
- Initial checkout integrity: **3,509 of 3,523 tracked files unchanged**; the other 14 are the intentional integration edits. Eight new source/test files and this plan were added. The user's existing package.json, submodule and note changes remain intact; the generated TypeScript build cache was restored to its initial content.

Production extension SHA-256: `fec324043d433ba920514abb5973d386215bdbe0818ff63cbce4a59962b49f0f`. Evidence and full baseline failure inventory: `ValkyrAI/work/deployment/20260907-valoride-procedures/`.

This is a locally built adapter. No VSIX was packaged, installed or published. The arbitrary-agent-trace compiler, live independent-agent producer/consumer test, business-output projection, and measured economic comparison remain outstanding. No token savings or end-to-end production completion is claimed.
