# Chat Summary + Thermometer + Gemini 3 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restore and upgrade ValorIDE’s ChatView completion reporting (changes summary + diff viewer), add the Cline-style task progress “thermometer” card with auto-context control, and modernize Gemini 3 handling to match/beat Cline.

**Architecture:** Keep the existing ValorIDE pipeline (CheckpointTracker → task completion_result → webview ChatRow) but enrich it with the full changes report UX and a task-progress panel in TaskHeader. Reuse/adapt Cline’s focus chain components for the thermometer. Align Gemini provider and prompts with Cline’s latest Gemini 3 flow (caching, native thinking config, error handling).

**Tech Stack:** VS Code extension (TypeScript), React webview (Vite/Styled Components), simple-git for checkpoint diffs, @google/genai for Gemini.

---

### Task 1: Restore/Pump ChatView Completion Summary & Diff Report

**Files**

- Modify: `src/core/task/index.ts` (completion_result flow, changesSummary handling, flags)
- Modify: `src/core/controller/index.ts` (message handlers for view changes/file diff)
- Modify: `src/integrations/checkpoints/CheckpointTracker.ts` (ensure diff summary/diff set parity)
- Modify: `webview-ui/src/components/chat/ChatRow.tsx` (ChangesSummary panel, buttons, “View changes” UX)
- Modify: `webview-ui/src/components/chat/TaskView.tsx` (ensure completion_result groups preserved)
- Modify: `src/shared/ExtensionMessage.tsx` (types if needed)

**Steps**

1. Ensure `attempt_completion` updates `changesSummary` and appends/removes the `COMPLETION_RESULT_CHANGES_FLAG` consistently (compare to Cline logic; fix any missing save/post updates).
2. Confirm `getLatestTaskCompletionChangesSummary` uses the right checkpoint pair (last completion vs first checkpoint) and returns binary markers; add telemetry/logging parity if needed.
3. Harden `presentMultifileDiff`/`presentFileDiff` to gracefully handle missing checkpoints or binary files; surface user-facing errors and always relinquish control.
4. Refresh `ChatRow` rendering: keep inline “Changes Summary” panel; add “View changes” primary CTA (like Cline) and ensure disable-state toggles via `relinquishControl`. Preserve per-file diff click.
5. Wire controller message handlers to call `taskCompletionViewChanges`/`taskCompletionOpenFileDiff` reliably for both new-changes and since-snapshot flows.
6. Quick manual run: start a task, create edits, invoke attempt_completion, click “View changes” and per-file rows to confirm multi-diff and single diff open.

**Verification**

- Run: `yarn test --watch=false src/core/task` (or targeted test suite if available).
- Manual: complete a task with edits; ensure inline summary shows counts and diff views open; no stale disabled buttons after completion.

---

### Task 2: Add Cline-Style Task Progress “Thermometer” Panel (Focus/Todo)

**Files**

- Add/Modify: `webview-ui/src/components/chat/task-header/ContextWindow.tsx` (port/adapt Cline’s progress bar with auto-condense marker; hook to ValorIDE data)
- Add: `webview-ui/src/components/chat/task-header/FocusChain.tsx` + small subcomponents (list UI, counts, expand/collapse)
- Modify: `webview-ui/src/components/chat/TaskHeader.tsx` (embed new context window + focus chain panel; compute counts)
- Modify: `src/core/task/focus-chain` (ensure `task_progress` messages persisted and exposed to webview state)
- Modify: `webview-ui/src/components/chat/ChatView.tsx` / `TaskView.tsx` (pass last `task_progress` and token stats)

**Steps**

1. Lift Cline `ContextWindow` + `AutoCondenseMarker` into ValorIDE, but source data from existing `lastApiReqTotalTokens`/model context window; gate auto-condense UI if not supported.
2. Port Cline `FocusChain` component (compact todo list with counts, expand button, status text “0 out of N tasks completed”); style to match screenshot.
3. Wire `task_progress` data: ensure core writes focus chain updates to state and webview; in `ChatView` compute latest progress payload to feed header.
4. Add “Auto context”/compact control row (button to trigger `/compact` or `condense` ask) with disabled state when busy.
5. Validate with sample `task_progress` message: render list, mark completed items, counts update as new progress arrives.

**Verification**

- Manual: send synthetic `task_progress` message via dev tools or real task; ensure list renders, expand works, counts correct, auto-context button present.

---

### Task 3: Enhance Gemini 3 Handling (Parity+)

**Files**

- Modify: `src/api/providers/gemini.ts` (error handling, cache behavior, thinkingConfig for Gemini 3)
- Modify: `src/core/prompts/system-prompt/variants/*` or `src/core/prompts/system.ts` (ensure Gemini 3 variant selection + native tool-calling config mirrors Cline)
- Modify: `src/utils/model-utils.ts` or equivalent (helpers `isGemini3ModelFamily`, cache pricing)
- Modify: `src/core/api/transform/gemini-format.ts` (if needed for thought/unescape)

**Steps**

1. Diff ValorIDE `GeminiHandler` against Cline: port retries/backoff, cache token accounting, thinkingConfig defaults, and Vertex vs API key setup.
2. Ensure usage metadata surfaces cacheRead/cacheWrite tokens and cost is recorded in `getApiMetrics`.
3. Align prompt variant selection: add/update Gemini 3 variant registry so Gemini 3 models use the correct system template and native tool calling where available.
4. Smoke test with a small Gemini 3 completion (streaming reasoning + text) to confirm no ESM import issues and usage metrics appear in chat header.

**Verification**

- Run: targeted unit/integration (if any) around `src/api/providers/gemini.ts`; else manual API smoke via extension (with a safe prompt) and check logs/usage chips.

---

### Task 4: Polish & Documentation

**Files**

- Modify: `docs/PHASE_COMPLETION_SUMMARY.md` or new note in `docs/cline-parity.md` (document restored summary + focus panel)
- Modify: `AMAZING_QUALITY_SUMMARY.md` or `README.md` (brief “Chat completion report & focus panel restored” blurb)

**Steps**

1. Document the new completion summary behavior, diff viewer buttons, and task progress panel usage.
2. Note Gemini 3 improvements and any config flags (API key vs Vertex).
3. Add screenshots if time allows (optional).

**Verification**

- Markdown lint pass (optional): `yarn lint:md` if available.

---

### Execution Options

1. Subagent-Driven (this session): run superpowers:executing-plans, tackle tasks in order with checkpoints.
2. Parallel Session: spin a new session/worktree and execute with the same plan using executing-plans.
