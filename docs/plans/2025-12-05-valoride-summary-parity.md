# ValorIDE Summary & Parity Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver ValorIDE parity upgrades: rich Markdown task summaries (inline + side tab), merged VALKYRAI provider entry with LLMDetails-powered model list, a Task List widget, Gemini 3 streaming polish, and the chat-header “thermometer” indicator.

**Architecture:** Extend core task result payload with deterministic `summaryMarkdown`, surface it in chat inline + dedicated Summary tab using shared store selectors, consolidate provider config to a single VALKYRAI entry wired to LLMDetails, add a Task List widget backed by task state, and enhance streaming/UX (Gemini 3 + thermometer) in chat header using existing status signals.

**Tech Stack:** TypeScript, VS Code extension API, React (webview-ui), Yarn, Jest/React Testing Library (webview-ui tests), ESLint/Prettier, Thor/ValkyrAI LLMDetails services.

---

### Task 1: Add task summary generator and payload wiring

**Files:**

- Create: `src/core/task/summary/TaskSummaryBuilder.ts`
- Modify: `src/core/task/ToolExecutionEngine.ts`, `src/core/task/tools/ToolManager.ts`, `src/shared/TaskSummary.ts` (or add), `src/core/controller/index.ts`
- Tests: `src/core/task/summary/__tests__/TaskSummaryBuilder.test.ts`

**Step 1: Write the failing test**

```ts
// src/core/task/summary/__tests__/TaskSummaryBuilder.test.ts
it("builds markdown with title, status, checkpoints, change table, decisions, todos", () => {
  const markdown = buildTaskSummary(sampleTaskResult);
  expect(markdown).toContain("# Task: sample title");
  expect(markdown).toContain("## Changes");
  expect(markdown).toContain("- [x] decision A");
  expect(markdown).toContain("docs/foo.md");
});
```

**Step 2: Run test to verify it fails**

Run: `yarn test --watch src/core/task/summary/__tests__/TaskSummaryBuilder.test.ts`  
Expected: FAIL (builder not implemented).

**Step 3: Write minimal implementation**

Implement `buildTaskSummary` to accept task result (title/status/checkpoints/changes/decisions/todos/screenshots) and return deterministic Markdown (headings, lists, optional tables). Wire `ToolExecutionEngine` to attach `summaryMarkdown` on completion, and emit to webview payload.

**Step 4: Run test to verify it passes**

Run: `yarn test --watch src/core/task/summary/__tests__/TaskSummaryBuilder.test.ts`  
Expected: PASS.

**Step 5: Commit**

`git add src/core/task/summary src/core/task/ToolExecutionEngine.ts src/shared/TaskSummary.ts src/core/controller/index.ts`  
`git commit -m "feat: add task summary builder and payload wiring"`

---

### Task 2: Inline Summary card + Summary side tab (shared Markdown renderer)

**Files:**

- Create: `webview-ui/src/components/chat/TaskSummaryCard.tsx`, `webview-ui/src/components/chat/TaskSummaryTab.tsx`
- Modify: `webview-ui/src/components/chat/ChatView.tsx`, `webview-ui/src/components/chat/TaskView.tsx`, `webview-ui/src/state/chat/chatSlice.ts` (or equivalent store), `webview-ui/src/components/chat/ChatTextArea.tsx` (inject inline card), `webview-ui/src/components/history/HistoryView.tsx` (tab routing)
- Tests: `webview-ui/src/components/chat/__tests__/TaskSummaryCard.test.tsx`

**Step 1: Write the failing test**

```tsx
// TaskSummaryCard.test.tsx
render(<TaskSummaryCard summary={markdown} onOpenTab={fn} />);
expect(screen.getByText("Summary")).toBeInTheDocument();
expect(screen.getByRole("button", { name: /Open in Summary/i })).toBeEnabled();
```

**Step 2: Run test to verify it fails**

Run: `yarn test:webview -- TaskSummaryCard`  
Expected: FAIL (component missing).

**Step 3: Write minimal implementation**

- Add store key for `summaryMarkdown` on task.
- Render collapsible inline card after task completion in `ChatView/TaskView`.
- Add Summary tab/panel consuming same markdown; include copy button and open-diff/file links.
- Handle empty state with “Regenerate summary” CTA posting message to extension.

**Step 4: Run test to verify it passes**

Run: `yarn test:webview -- TaskSummaryCard`  
Expected: PASS.

**Step 5: Commit**

`git add webview-ui/src/components/chat webview-ui/src/state/chat`  
`git commit -m "feat: add inline and tabbed task summaries"`

---

### Task 3: Merge API Provider entries into single “VALKYRAI” with LLMDetails models

**Files:**

- Modify: `webview-ui/src/components/settings/ApiOptions.tsx`, `webview-ui/src/components/chat/ChatTextArea.tsx` (model display), `src/core/controller/index.ts` (provider mapping, login handling), `src/shared/ExtensionMessage.ts` (if provider names enumerated), `webview-ui/src/components/settings/SettingsView.tsx`
- Tests: `webview-ui/src/components/settings/__tests__/ApiOptions.test.tsx`

**Step 1: Write the failing test**

```tsx
render(<ApiOptions ... />);
expect(screen.queryByText(/Valkyrai \(LLM Details\)/i)).not.toBeInTheDocument();
expect(screen.getByText("VALKYRAI")).toBeInTheDocument();
```

**Step 2: Run test to verify it fails**

Run: `yarn test:webview -- ApiOptions`  
Expected: FAIL (old options).

**Step 3: Write minimal implementation**

- Collapse `valkyrai` + `valoride` providers into single `valkyrai` option labeled “VALKYRAI”.
- Reuse existing ValorIDE login card; display LLMDetails model list (via store) under same provider.
- Ensure provider selection persists and populates chat header model pill.
- Update controller to treat `valkyrai` provider as both login + LLMDetails fetch.

**Step 4: Run test to verify it passes**

Run: `yarn test:webview -- ApiOptions`  
Expected: PASS.

**Step 5: Commit**

`git add webview-ui/src/components/settings ApiOptions.tsx src/core/controller/index.ts src/shared/ExtensionMessage.ts`  
`git commit -m "feat: merge valkyrai/valoride provider into VALKYRAI"`

---

### Task 4: Add Task List display widget (task cards with status/progress)

**Files:**

- Create: `webview-ui/src/components/chat/TaskListWidget.tsx`
- Modify: `webview-ui/src/components/chat/TaskHeader.tsx` (inject widget trigger/slot), `webview-ui/src/state/chat/chatSlice.ts` (task list selector), `src/shared/WebviewMessage.ts` (message for task list fetch if needed), `src/core/controller/index.ts` (provide task list data)
- Tests: `webview-ui/src/components/chat/__tests__/TaskListWidget.test.tsx`

**Step 1: Write the failing test**

```tsx
render(
  <TaskListWidget tasks={[{ id: "1", title: "Do X", status: "completed" }]} />,
);
expect(screen.getByText("Do X")).toBeInTheDocument();
expect(screen.getByLabelText(/Task status/i)).toHaveTextContent("completed");
```

**Step 2: Run test to verify it fails**

Run: `yarn test:webview -- TaskListWidget`  
Expected: FAIL (widget missing).

**Step 3: Write minimal implementation**

- Add selector/state for recent tasks with status, progress, checkpoints.
- Render widget (list of cards with status pill, timestamps, open-task action).
- Wire message from extension to deliver task list; fall back to existing task store if available.

**Step 4: Run test to verify it passes**

Run: `yarn test:webview -- TaskListWidget`  
Expected: PASS.

**Step 5: Commit**

`git add webview-ui/src/components/chat webview-ui/src/state/chat src/core/controller/index.ts src/shared/WebviewMessage.ts`  
`git commit -m "feat: add task list widget to chat header"`

---

### Task 5: Gemini 3 + enhanced streaming handling

**Files:**

- Modify: `src/core/task/ToolExecutionEngine.ts`, `src/core/task/tools/BrowserToolHandler.ts` (streaming hooks), `webview-ui/src/components/chat/ChatTextArea.tsx` (streaming render), `webview-ui/src/components/chat/hooks/useChatMessages.ts` (if present), `src/shared/ExtensionMessage.ts`
- Tests: `src/core/task/__tests__/ToolExecutionEngine.streaming.test.ts`, `webview-ui/src/components/chat/__tests__/ChatTextArea.streaming.test.tsx`

**Step 1: Write the failing test**

```ts
// ToolExecutionEngine.streaming.test.ts
it("streams partials for gemini-3 models with tokens and tool transitions", async () => {
  // stub transport emits partials, expect forwarded events
});
```

**Step 2: Run test to verify it fails**

Run: `yarn test --watch src/core/task/__tests__/ToolExecutionEngine.streaming.test.ts`  
Expected: FAIL (no streaming support for Gemini 3 enhancements).

**Step 3: Write minimal implementation**

- Ensure Gemini 3 models use enhanced streaming path (token deltas, tool transition markers).
- Propagate partials to webview with consistent schema; update chat renderer to show smooth incremental text.
- Add backpressure/queue protection to avoid dropped tokens.

**Step 4: Run test to verify it passes**

Run: `yarn test --watch src/core/task/__tests__/ToolExecutionEngine.streaming.test.ts`  
Run: `yarn test:webview -- ChatTextArea.streaming`  
Expected: PASS.

**Step 5: Commit**

`git add src/core/task webview-ui/src/components/chat src/shared/ExtensionMessage.ts`  
`git commit -m "feat: enhance gemini-3 streaming path"`

---

### Task 6: Chat header “thermometer” progress indicator

**Files:**

- Create: `webview-ui/src/components/chat/ThermometerIndicator.tsx`
- Modify: `webview-ui/src/components/chat/TaskHeader.tsx`, `webview-ui/src/state/chat/chatSlice.ts` (progress state), `src/core/task/ToolExecutionEngine.ts` (emit progress/phase), `src/shared/WebviewMessage.ts`
- Tests: `webview-ui/src/components/chat/__tests__/ThermometerIndicator.test.tsx`

**Step 1: Write the failing test**

```tsx
render(<ThermometerIndicator progress={0.65} status="running" />);
expect(screen.getByText(/65%/i)).toBeInTheDocument();
```

**Step 2: Run test to verify it fails**

Run: `yarn test:webview -- ThermometerIndicator`  
Expected: FAIL (component missing).

**Step 3: Write minimal implementation**

- Add progress state derived from checkpoints/task status.
- Render slim header bar with percent + status; animate changes.
- Subscribe to task progress events from extension (reuse existing telemetry if present).

**Step 4: Run test to verify it passes**

Run: `yarn test:webview -- ThermometerIndicator`  
Expected: PASS.

**Step 5: Commit**

`git add webview-ui/src/components/chat webview-ui/src/state/chat src/core/task/ToolExecutionEngine.ts src/shared/WebviewMessage.ts`  
`git commit -m "feat: add chat header progress thermometer"`

---

### Final verification

- Run lint + type checks: `yarn lint && yarn check-types`
- Run tests: `yarn test:webview && yarn test`
- Build webview: `yarn build:webview && yarn compile`
- Smoke test in VS Code: start extension, run a task, verify summary inline + tab, VALKYRAI provider selection, task list widget, Gemini 3 streaming, thermometer updates.
