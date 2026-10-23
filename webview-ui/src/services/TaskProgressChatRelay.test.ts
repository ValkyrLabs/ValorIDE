import { describe, expect, it } from "vitest";
import type { ValorIDEMessage } from "@shared/ExtensionMessage";
import { TaskProgressChatRelay } from "./TaskProgressChatRelay";

const taskMessage = (ts = 1): ValorIDEMessage => ({
  ts,
  type: "say",
  say: "text",
  text: "Fix the progress relay",
});

describe("TaskProgressChatRelay", () => {
  it("hydrates silently, then emits one concise phase update", () => {
    const relay = new TaskProgressChatRelay();
    const task = taskMessage();
    expect(relay.acceptSnapshot([task], "task-1")).toEqual([]);

    const apiStarted: ValorIDEMessage = {
      ts: 2,
      type: "say",
      say: "api_req_started",
      text: JSON.stringify({ request: "large provider payload" }),
    };
    expect(relay.acceptSnapshot([task, apiStarted], "task-1")).toEqual([
      expect.objectContaining({
        content: "Analyzing the task.",
        kind: "phase",
        phase: "analyze",
        taskId: "task-1",
      }),
    ]);
    expect(relay.acceptSnapshot([task, apiStarted], "task-1")).toEqual([]);
  });

  it("deduplicates partial tool chatter and reports start and completion", () => {
    const relay = new TaskProgressChatRelay();
    const task = taskMessage();
    relay.acceptSnapshot([task], "task-2");

    const partialTool: ValorIDEMessage = {
      ts: 3,
      type: "say",
      say: "tool",
      partial: true,
      text: JSON.stringify({
        tool: "editedExistingFile",
        path: "src/App.tsx",
        diff: "first token",
      }),
    };
    expect(relay.acceptSnapshot([task, partialTool], "task-2")).toEqual([
      expect.objectContaining({
        content: "Updating src/App.tsx.",
        kind: "action-start",
      }),
    ]);

    const laterPartial = {
      ...partialTool,
      text: JSON.stringify({
        tool: "editedExistingFile",
        path: "src/App.tsx",
        diff: "many more streamed tokens",
      }),
    };
    expect(relay.acceptSnapshot([task, laterPartial], "task-2")).toEqual([]);

    const completed = { ...laterPartial, partial: false };
    expect(relay.acceptSnapshot([task, completed], "task-2")).toEqual([
      expect.objectContaining({
        content: "Updated src/App.tsx.",
        kind: "action-complete",
        phase: "verify",
      }),
    ]);
  });

  it("suppresses command output and closes an active command on the next model turn", () => {
    const relay = new TaskProgressChatRelay();
    const task = taskMessage();
    relay.acceptSnapshot([task], "task-3");

    const command: ValorIDEMessage = {
      ts: 4,
      type: "say",
      say: "command",
      text: "npm test -- --runInBand",
    };
    expect(relay.acceptSnapshot([task, command], "task-3")).toEqual([
      expect.objectContaining({
        content: "Running a shell command.",
        kind: "action-start",
      }),
    ]);

    const output: ValorIDEMessage = {
      ts: 5,
      type: "say",
      say: "command_output",
      text: "thousands of noisy test output tokens",
    };
    expect(relay.acceptSnapshot([task, command, output], "task-3")).toEqual([]);

    const nextTurn: ValorIDEMessage = {
      ts: 6,
      type: "say",
      say: "api_req_started",
      text: "{}",
    };
    expect(
      relay.acceptSnapshot([task, command, output, nextTurn], "task-3"),
    ).toEqual([
      expect.objectContaining({
        content: "Finished running the shell command. Reviewing the result.",
        kind: "action-complete",
      }),
    ]);
  });

  it("surfaces approval blockers without relaying command contents", () => {
    const relay = new TaskProgressChatRelay();
    const task = taskMessage();
    relay.acceptSnapshot([task], "task-4");

    const approval: ValorIDEMessage = {
      ts: 7,
      type: "ask",
      ask: "command",
      partial: false,
      text: "deploy --token top-secret",
    };
    const updates = relay.acceptSnapshot([task, approval], "task-4");
    expect(updates).toEqual([
      expect.objectContaining({
        content: "Approval needed before running a shell command.",
        kind: "blocker",
        phase: "blocked",
      }),
    ]);
    expect(updates[0].content).not.toContain("top-secret");
  });

  it("waits for complete assistant text and terminal results", () => {
    const relay = new TaskProgressChatRelay();
    const task = taskMessage();
    relay.acceptSnapshot([task], "task-5");

    const partialText: ValorIDEMessage = {
      ts: 8,
      type: "say",
      say: "text",
      partial: true,
      text: "I found",
    };
    expect(relay.acceptSnapshot([task, partialText], "task-5")).toEqual([]);

    const completedText = {
      ...partialText,
      partial: false,
      text: "I found the bridge boundary. I am patching it now.",
    };
    expect(relay.acceptSnapshot([task, completedText], "task-5")).toEqual([
      expect.objectContaining({
        content: "Update: I found the bridge boundary.",
        kind: "phase",
      }),
    ]);

    const partialResult: ValorIDEMessage = {
      ts: 9,
      type: "ask",
      ask: "completion_result",
      partial: true,
      text: "Fixed",
    };
    expect(
      relay.acceptSnapshot([task, completedText, partialResult], "task-5"),
    ).toEqual([]);

    const completedResult = {
      ...partialResult,
      partial: false,
      text: "Fixed the bridge and verified the focused tests.",
    };
    expect(
      relay.acceptSnapshot([task, completedText, completedResult], "task-5"),
    ).toEqual([
      expect.objectContaining({
        content: "Completed: Fixed the bridge and verified the focused tests.",
        kind: "terminal",
        phase: "done",
      }),
    ]);
  });

  it("does not replay an existing task when the task identity changes", () => {
    const relay = new TaskProgressChatRelay();
    relay.acceptSnapshot([taskMessage(1)], "task-old");
    relay.acceptSnapshot(
      [
        taskMessage(10),
        {
          ts: 11,
          type: "ask",
          ask: "completion_result",
          text: "Historical result",
        },
      ],
      "task-new",
    );

    expect(
      relay.acceptSnapshot(
        [
          taskMessage(10),
          {
            ts: 11,
            type: "ask",
            ask: "completion_result",
            text: "Historical result",
          },
        ],
        "task-new",
      ),
    ).toEqual([]);
  });

  it("targets progress at the originating SWARM task without resetting during history persistence", () => {
    const relay = new TaskProgressChatRelay();
    const correlation = {
      commandId: "command-1",
      correlationId: "correlation-1",
      localTaskId: "local-task-1",
      sessionId: "codex-session-1",
      taskId: "codex-task-1",
    };

    expect(
      relay.acceptExtensionMessage({
        type: "state",
        state: {
          currentTaskId: "local-task-1",
          taskProgressCorrelation: correlation,
          valorideMessages: [],
        } as any,
      }),
    ).toEqual([]);

    const task = taskMessage();
    expect(
      relay.acceptExtensionMessage({
        type: "state",
        state: {
          currentTaskId: "local-task-1",
          taskProgressCorrelation: correlation,
          valorideMessages: [task],
        } as any,
      }),
    ).toEqual([]);

    const apiStarted: ValorIDEMessage = {
      ts: 2,
      type: "say",
      say: "api_req_started",
      text: "{}",
    };
    expect(
      relay.acceptExtensionMessage({
        type: "state",
        state: {
          currentTaskId: "local-task-1",
          currentTaskItem: { id: "local-task-1" },
          taskProgressCorrelation: correlation,
          valorideMessages: [task, apiStarted],
        } as any,
      }),
    ).toEqual([
      expect.objectContaining({
        content: "Analyzing the task.",
        correlation,
        taskId: "codex-task-1",
      }),
    ]);
  });
});
