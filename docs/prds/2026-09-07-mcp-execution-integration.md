# MCP execution through the shared native runtime

## Problem and product outcome

ValorIDE currently runs pre-tool hooks before handing MCP calls back to a legacy Task switch. Hook input overrides are discarded at that boundary and the actual MCP response never reaches PostToolUse. A response-card failure is also reported as an execution error after a potentially successful remote action. Agents using GrayMatter and generated APIs need one consistent approval, execution and evidence path.

## Plan before implementation

1. Add regression tests through the real ToolExecutionEngine and ToolManager for MCP tools and resources, with the existing MCP transport stubbed. Prove the current missing-handler failures.
2. Extract both legacy cases into one McpToolHandler registered with ToolManager; remove the two duplicate Task cases. Preserve shared server/tool validation, GrayMatter workspace scoping, existing messages, images, per-tool autoapproval, manual feedback and checkpoint barriers. Hook overrides must be validated and approved as the actual input.
3. Return explicit tool-operation outcomes: protocol isError is failed; a valid normal response is succeeded for the MCP call only; transport uncertainty is unknown. Local pre-dispatch failures are blocked and denial is rejected. Streaming partials are handled without consuming the final tool invocation. Recheck task activity after approval/checkpoint and before dispatch. Do not automatically retry.
4. Preserve received response content if response-card delivery or post-call checkpoint fails, adding clear inspection guidance rather than suggesting re-execution. Keep raw exception details out of agent guidance. Pending business work inside a successful MCP response remains pending according to that response; MCP success is not business completion.
5. Run focused tests, full consumer checks, production build, VSIX audit, isolated installed extension activation and exact local installation parity before claiming installed acceptance. Keep source, tests, installation, current-window activation and real authenticated execution distinct.

## Boundaries and invariants

Work is scoped to ValorIDE rc-6 in the existing dirty checkout. Root thread owns ValkyrAI dashboard/backend release work. No generated surfaces, public GrayMatter package changes, live business dispatch, new execution runtime, synthetic canonical trace IDs or ExecModule metadata fields. ExecModule configuration and eligibility remain ABI-only. This change supplies native execution evidence; hosted arbitrary trace capture remains a separate canonical backend integration.

GrayMatter preflight was ready with complete bounded pagination (38 pages, 3603 rows, 126 matching invariants, zero omitted). Relevant rules: 65c3c75f-5d19-41f3-a35d-8a8975851b1c (checkpoint barrier), 9429c5af-274a-490a-949e-6e246c4a83cc (explicit observed outcomes), and the user's ABI-only correction.

## Verification status

Implemented the shared McpToolHandler and removed both legacy Task cases. The engine now preserves received outcomes across feedback-display errors, and the ToolContext mistake counter writes through to Task. Streaming preview delivery failures leave the final invocation available.

Validation: 32 new regressions; the original 25 failed before implementation, and three additional recovery regressions failed before the follow-up fixes. Focused suite: 56 passed. Full consumer gate: 1734 passed (921 Jest, 97 host Vitest, 6 Node, 231 actual VS Code, 479 webview), 38 existing skips. Type checking, lint, production build and five package-audit tests passed. The first full attempt exposed a test-file global-scope collision; the new test now has an explicit module boundary and the final full run passed. The exact VSIX passed audit and 37-file parity, activated in isolated VS Code 1.133.0, and was installed into the default local extension directory with all 37 runtime files read back. Total checks: 1739. No active-window reload was forced; current-window activation, authenticated native MCP/Procedure execution, hosted trace ingestion, marketplace publication and measured savings remain unverified.

The received MCP protocol result is an operation-level fact, not a claim that downstream business work is complete. Optional hooks remain optional and this change does not upload arbitrary agent traces or enable learning promotion. MCPHub remains the transport authority and can add infrastructure workspace scope; PostToolUse parameters reflect validated hook input, not a newly claimed canonical remote trace.

Durable methodology: GrayMatter 686bc6af-b9dc-437d-99ca-c5b1bd612e3e, exact ID/type/text/sourceMessageId/sourceUrl readback verified.

Evidence directory: ValkyrAI/work/deployment/20260907-valoride-mcp-execution/.

Installed bundle SHA-256: `ad58476c81b1bfe76c135a816bee3e1cbda456b7b2a7d65abfe42ef68e39d0ea`. VSIX SHA-256: `29e651f7871247649276f80f6527e89a654b0dcd7729b3d3bc07a3a0ee36304e`.
