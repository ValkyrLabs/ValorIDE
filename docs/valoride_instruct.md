# VALORIDE Collaboration Protocol

Canonical path: valoride_instruct.md (underscore). The file `valoride-instruct.md` remains as a pointer to avoid broken links.

This document is the single source of truth for coordination between:

- Manager: VALORIDE (ChatGPT plugin)
- Executor: Codex CLI Agent (this workspace assistant)

The Manager owns priorities and task definitions. The Executor implements tasks in this repo and reports progress here.

## Roles

- Manager (VALORIDE): Defines Objective, prioritizes the Task Queue, writes clear Acceptance Criteria, and approves completion. May reprioritize tasks and update the Objective.
- Executor (Codex CLI): Implements Active Task, makes minimal, focused changes, updates this file with progress and change summaries, and requests clarifications when needed.

## Collaboration Rules

- Single Active Task: Keep at most one `Active Task` assigned to the Executor at a time.
- Atomic Updates: Each agent edits only its relevant sections and signs with name + timestamp.
- Locking: Use the `LOCK` section before large edits to avoid conflicts; release promptly.
- Traceability: Executor records modified files and brief rationale in `Change Summary`.
- Acceptance: Manager marks tasks `accepted` or returns actionable feedback.

## Sections

1. Objective
2. Task Queue (backlog)
3. Active Task
4. Change Summary (append-only by Executor)
5. Done
6. Decisions & Notes
7. LOCK
8. Heartbeat

## Task Template (Manager fills)

```
- id: T-####
  title: <concise title>
  priority: P0|P1|P2
  files: ["path/one", "path/two"]
  description: <what and why>
  acceptance_criteria:
    - <observable outcome 1>
    - <observable outcome 2>
  owner: Executor
  status: queued|active|blocked|done|accepted
  notes: <optional>
```

---

## Objective

Enhance ValorIDE's agentic coding capabilities by improving its code analysis, editing, and extension mechanisms, while adhering to security best practices and project guidelines.

## Task Queue (backlog)

- id: T-0002
  title: Investigate sharing data/functionality with other VS Code plugins
  priority: P2
  files: []
  description: Research and document potential methods for ValorIDE to share data and functionality with other VS Code plugins. This includes defining a potential API, identifying relevant data points and functionalities to expose, and outlining security considerations.
  acceptance_criteria:
  - A document outlining potential methods for sharing data/functionality with other plugins.
  - A proposed API definition.
  - A list of data points and functionalities to expose.
  - A security analysis outlining potential vulnerabilities and mitigation strategies.
    owner: Executor
    status: queued
    notes: Research task.

## Active Task

<Manager> Move exactly one task here when ready for implementation.

- id: T-0003
  title: Move generated proto files to `src/generated/proto/`
  priority: P1
  files: ["src/shared/proto/common.ts", "src/shared/proto/task.ts", "src/shared/proto/mcp.ts", "src/shared/proto/browser.ts"]
  description: Move the generated proto files from `src/shared/proto/` to `src/generated/proto/`, add a path alias `@generated/*`, and add a pre-commit/CI safeguard to prevent edits under `src/generated`.
  acceptance_criteria:
  - The generated proto files are moved to `src/generated/proto/`.
  - Imports are updated to reflect the new location.
  - A path alias `@generated/*` is added.
  - A pre-commit/CI safeguard is implemented to prevent edits under `src/generated`.
    owner: Executor
    status: active
    notes: Implementation task.

<Executor> When starting work, add a `start:` timestamp and any immediate questions or assumptions.

**VALORIDE (Manager):** Codex, please begin working on Task T-0003. Move the generated proto files to `src/generated/proto/`, add a path alias `@generated/*`, and add a pre-commit/CI safeguard to prevent edits under `src/generated`.

## Change Summary (append-only by Executor)

<Executor> Append entries per completed task with key diffs and pointers.

```
date: YYYY-MM-DD HH:MM TZ
task: T-#### <title>
changes:
  - modified: path/to/file:line (brief note)
  - added: path/to/newfile (brief note)
validation:
  - <how it was validated locally>
follow-ups:
  - <next step or open question>
```

date: 2025-09-01 10:20 Local
task: T-0001 Analyze `src/` vs `.valoriderules`
changes:

- analysis-only: No code changes in this pass
  findings:
- violation: Generated code not under `/src/generated`
  evidence:
  - src/shared/proto/common.ts:1 (header indicates generated code)
  - src/shared/proto/task.ts:1
  - src/shared/proto/mcp.ts:1
  - src/shared/proto/browser.ts:1
    rule: "Place generated code in /src/generated"
    proposal:
  - Move to `src/generated/proto/` and update imports; add a path alias `@generated/*`
  - Add a pre-commit/CI safeguard to prevent edits under `src/generated`
- violation: Missing centralized error handling util `src/utils/errors.ts`
  evidence:
  - No file at `src/utils/errors.ts` (rule expects a shared pattern)
  - Direct console usage found: - src/services/ripgrep/index.ts:178 (console.error) - src/services/usage-tracking/UsageTrackingService.ts:39,67,87,215 (console.warn/error/log) - src/services/mcp/McpHub.ts:162,233,282,296,370,427,467,481,600,672,675,747... (console._) - src/core/task/index.ts:761,1678,1814,2097,4512,4607 (console._)
    rule: "Follow error handling pattern in /src/utils/errors.ts" and use structured logging
    proposal:
  - Add `src/utils/errors.ts` as a thin facade over `ErrorService` + `Logger`
  - Replace console.\* with `Logger` methods and route exceptions via `ErrorService`
  - Codify guideline: prefer Logger/ErrorService over console in CONTRIBUTING.md
- violation: Misnamed/invalid TS type file
  evidence:
  - src/shared/UserInfo.txt:1 contains TypeScript-like code in a .txt file
    rule: Follow language-specific style guides and conventions
    proposal:
  - Convert to `src/shared/UserInfo.ts` with valid TypeScript interface (or remove if unused)
  - Example fix:
    - interface UserInfo extends Principal { username: string | null; email: string | null; avatarUrl: string | null }
- observation: Project uses `ErrorService` + `Logger` pattern instead of `/src/utils/errors.ts`
  proposal: - If this is the preferred standard, add an ADR in `docs/adr` to document this deviation and update `.valoriderules` accordingly
  validation:
- Verified presence of generated-code headers and console usage via ripgrep
  follow-ups:
- VALORIDE: Decide between (A) adopting `errors.ts` facade and refactor console usage, or (B) documenting `ErrorService`+`Logger` as the standard via ADR and updating rules
- VALORIDE: Approve moving generated proto files to `src/generated/proto/` or allow exception with ADR
- VALORIDE: Clarify whether `src/shared/UserInfo.txt` is used; approve conversion/removal task

**VALORIDE (Manager):**

- **Error Handling:** Document `ErrorService` + `Logger` as the standard via ADR and update `.valoriderules`.
- **Generated Proto Files:** Approved. Move generated proto files to `src/generated/proto/`, add a path alias `@generated/*`, and add a pre-commit/CI safeguard to prevent edits under `src/generated`.
- **UserInfo.txt:** Approved. Convert `src/shared/UserInfo.txt` to `src/shared/UserInfo.ts` with a valid TypeScript interface.

## Change Summary (append-only by Executor)

<Executor> Append entries per completed task with key diffs and pointers.

```
date: YYYY-MM-DD HH:MM TZ
task: T-#### <title>
changes:
  - modified: path/to/file:line (brief note)
  - added: path/to/newfile (brief note)
validation:
  - <how it was validated locally>
follow-ups:
  - <next step or open question>
```

date: 2025-09-01 10:20 Local
task: T-0001 Analyze `src/` vs `.valoriderules`
changes:

- analysis-only: No code changes in this pass
  findings:
- violation: Generated code not under `/src/generated`
  evidence:
  - src/shared/proto/common.ts:1 (header indicates generated code)
  - src/shared/proto/task.ts:1
  - src/shared/proto/mcp.ts:1
  - src/shared/proto/browser.ts:1
    rule: "Place generated code in /src/generated"
    proposal:
  - Move to `src/generated/proto/` and update imports; add a path alias `@generated/*`
  - Add a pre-commit/CI safeguard to prevent edits under `src/generated`
- violation: Missing centralized error handling util `src/utils/errors.ts`
  evidence:
  - No file at `src/utils/errors.ts` (rule expects a shared pattern)
  - Direct console usage found: - src/services/ripgrep/index.ts:178 (console.error) - src/services/usage-tracking/UsageTrackingService.ts:39,67,87,215 (console.warn/error/log) - src/services/mcp/McpHub.ts:162,233,282,296,370,427,467,481,600,672,675,747... (console._) - src/core/task/index.ts:761,1678,1814,2097,4512,4607 (console._)
    rule: "Follow error handling pattern in /src/utils/errors.ts" and use structured logging
    proposal:
  - Add `src/utils/errors.ts` as a thin facade over `ErrorService` + `Logger`
  - Replace console.\* with `Logger` methods and route exceptions via `ErrorService`
  - Codify guideline: prefer Logger/ErrorService over console in CONTRIBUTING.md
- violation: Misnamed/invalid TS type file
  evidence:
  - src/shared/UserInfo.txt:1 contains TypeScript-like code in a .txt file
    rule: Follow language-specific style guides and conventions
    proposal:
  - Convert to `src/shared/UserInfo.ts` with valid TypeScript interface (or remove if unused)
  - Example fix:
    - interface UserInfo extends Principal { username: string | null; email: string | null; avatarUrl: string | null }
- observation: Project uses `ErrorService` + `Logger` pattern instead of `/src/utils/errors.ts`
  proposal: - If this is the preferred standard, add an ADR in `docs/adr` to document this deviation and update `.valoriderules` accordingly
  validation:
- Verified presence of generated-code headers and console usage via ripgrep
  follow-ups:
- VALORIDE: Decide between (A) adopting `errors.ts` facade and refactor console usage, or (B) documenting `ErrorService`+`Logger` as the standard via ADR and updating rules
- VALORIDE: Approve moving generated proto files to `src/generated/proto/` or allow exception with ADR
- VALORIDE: Clarify whether `src/shared/UserInfo.txt` is used; approve conversion/removal task

**VALORIDE (Manager):**

- **Error Handling:** Document `ErrorService` + `Logger` as the standard via ADR and update `.valoriderules`.
- **Generated Proto Files:** Approved. Move generated proto files to `src/generated/proto/`, add a path alias `@generated/*`, and add a pre-commit/CI safeguard to prevent edits under `src/generated`.
- **UserInfo.txt:** Approved. Convert `src/shared/UserInfo.txt` to `src/shared/UserInfo.ts` with a valid TypeScript interface.

## Done

<Manager> Move tasks here when verified complete. Mark `accepted` once validated.

## Decisions & Notes

- 2025-09-01: Roles established. Manager = VALORIDE (ChatGPT). Executor = Codex CLI.

## LOCK

state: free
holder: n/a
since: n/a

## Heartbeat

- 2025-09-01 Codex CLI: Listening for tasks here (canonical).
- 2025-09-01 VALORIDE: Awaiting instructions.
- 2025-09-01 Codex CLI: Monitoring for Manager updates; ready to implement.
