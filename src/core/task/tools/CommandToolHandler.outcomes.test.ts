jest.mock("execa", () => ({ execa: jest.fn() }));
jest.mock("@integrations/notifications", () => ({
  showSystemNotification: jest.fn(),
}));
jest.mock("@services/logging/Logger", () => ({
  Logger: { info: jest.fn(), error: jest.fn() },
}));
jest.mock("@services/output-filter/OutputFilterService", () => ({
  OutputFilterService: { filterCommandOutput: (value: string) => value },
}));
jest.mock("@services/test/TestMode", () => ({ isInTestMode: () => false }));
jest.mock("node:timers/promises", () => ({
  setTimeout: async () => undefined,
}));
import { EventEmitter } from "node:events";
import { execa } from "execa";
import { CommandToolHandler } from "./CommandToolHandler";

function fixture(completed: boolean, exitCode?: number) {
  const process = new EventEmitter() as any;
  process.getExitCode = () => exitCode;
  process.then = (resolve: () => void) => {
    if (completed) process.emit("completed");
    resolve();
  };
  const context = {
    cwd: "/tmp",
    taskId: "task-1",
    autoApprovalSettings: { enabled: false },
    consecutiveMistakeCount: 0,
    api: { getModel: () => ({ id: "test" }) },
    valorideIgnoreController: { validateCommand: () => undefined },
    shouldAutoApproveTool: () => false,
    ask: jest.fn(async () => ({ response: "yesButtonClicked" })),
    say: jest.fn(async () => undefined),
    saveCheckpoint: jest.fn(async () => undefined),
    workspaceTracker: { populateFilePaths: jest.fn() },
    terminalManager: {
      getOrCreateTerminal: jest.fn(async () => ({
        terminal: { show: jest.fn() },
      })),
      runCommand: jest.fn(() => process),
    },
  };
  return { handler: new CommandToolHandler(context as any), context };
}

describe("command execution outcome evidence", () => {
  for (const [completed, exitCode, outcome] of [
    [true, 0, "succeeded"],
    [true, 7, "failed"],
    [true, undefined, "unknown"],
    [false, undefined, "pending"],
  ] as const) {
    it(`reports completed=${completed}, exit=${exitCode} as ${outcome}`, async () => {
      const { handler, context } = fixture(completed, exitCode);
      const result = await handler.execute(
        {
          type: "tool_use",
          name: "execute_command",
          partial: false,
          params: { command: "fixture-only", requires_approval: "true" },
        },
        false,
      );
      expect(result.outcome).toBe(outcome);
      expect(result.toolResponse).toContain(
        !completed
          ? "still running"
          : exitCode === undefined
            ? "exit status is unavailable"
            : `exit code ${exitCode}`,
      );
      expect(context.terminalManager.runCommand).toHaveBeenCalledTimes(1);
    });
  }

  for (const [exitCode, outcome] of [
    [0, "succeeded"],
    [3, "failed"],
  ] as const) {
    it(`preserves Node exit=${exitCode} and clears its completion deadline`, async () => {
      jest.useFakeTimers();
      try {
        (execa as jest.Mock).mockReturnValue(
          Promise.resolve({ exitCode, stdout: "fixture output" }),
        );
        const { handler } = fixture(true, exitCode);
        const result = await (handler as any).executeCommandInNode(
          "fixture-only",
        );
        expect(result[2]).toBe(outcome);
        expect(jest.getTimerCount()).toBe(0);
      } finally {
        jest.useRealTimers();
      }
    });
  }
});
