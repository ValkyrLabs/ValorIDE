# Cline Current Sync Review

Reviewed upstream `cline/cline` at `bd662d8` from 2026-06-24.

## Upstream Innovations Worth Tracking

- Monorepo split into reusable SDK packages: shared primitives, LLM/provider
  catalog, stateless agent loop, and stateful core runtime.
- First-class CLI with interactive TUI, one-shot/headless JSON mode, `--yolo`,
  `--zen` background hub dispatch, doctor commands, auth flows, and MCP
  management.
- Hub daemon and dashboard for long-running/background sessions.
- Lifecycle hooks for task start/resume/cancel/complete, prompt submission,
  tool calls/results, compaction, and shutdown.
- Plugin and SDK extension surfaces for custom tools, lifecycle hooks, and
  subagent/team orchestration.
- Cron/event automation examples for recurring agent workflows.
- Cline-compatible rules/skills/plugins as portable project context.

## Ported In This Pass

ValorIDE now has a Cline-compatible hook runtime with:

- `~/.valoride/hooks`
- workspace `.valoride/hooks`
- workspace `.clinerules/hooks`
- JSON payloads on stdin
- raw JSON or `HOOK_CONTROL\t{...}` control output on stdout
- `PreToolUse` and `PostToolUse` integration in the refactored tool execution
  path
- hook-driven context injection, input overrides, and explicit tool blocking

This was selected first because it improves Chat UX, tools, context handling,
and agentic policy enforcement without replacing ValorIDE's ThorAPI,
GrayMatter, RBAC, or generated-code surfaces.

## Deliberately Not Ported Blindly

- Cline's SDK/monorepo split: valuable, but it would conflict with ValorIDE's
  ThorAPI/GrayMatter architecture unless planned as a larger package boundary
  migration.
- Cline's CLI/hub runtime: important, but ValorIDE already has `packages/valor-cli`
  and SWARM/GrayMatter coordination; direct adoption should be a mapped merge,
  not a replacement.
- Cline provider/model catalogs: ValorIDE just moved to official current
  OpenAI/Anthropic IDs and has ValkyrAI-hosted LLMDetails.
- Cline UI settings/provider components: useful patterns, but ValorIDE's
  settings are currently intertwined with account, GrayMatter, and API-0 flows.

## Next Safe Candidates

- Task lifecycle hook calls: `TaskStart`, `TaskComplete`, `TaskError`,
  `UserPromptSubmit`, and `PreCompact`.
- A chat-visible `HookMessage` row so hook execution is visible, collapsible,
  and auditable like Cline.
- A ValorIDE CLI `--json` event stream that mirrors hook/tool/task events for
  CI and SWARM automation.
- Cline-style doctor command for endpoint/auth/MCP/SWARM health checks.
- Hub/SWARM bridge: map Cline's hub session concepts onto GrayMatter SwarmOps
  records instead of adding a separate coordination brain.
