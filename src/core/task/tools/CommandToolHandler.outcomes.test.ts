import { it } from "@jest/globals";
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
    consecutiveAutoApprovedRequestsCount: 0,
    removeLastPartialMessageIfExistsWithType: jest.fn(),
    api: { getModel: () => ({ id: "test" }) },
    valorideIgnoreController: { validateCommand: () => undefined },
    shouldAutoApproveTool: () => false,
    ask: jest.fn(async () => ({ response: "yesButtonClicked" })),
    say: jest.fn(async () => undefined),
    saveCheckpoint: jest.fn(async () => undefined),
    recordCommandEvidence: jest.fn(),
    workspaceTracker: { populateFilePaths: jest.fn() },
    terminalManager: {
      getOrCreateTerminal: jest.fn(async () => ({
        terminal: { show: jest.fn() },
      })),
      runCommand: jest.fn((_terminal, _command, options) => { options?.beforeDispatch?.(); return process; }),
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
      if (outcome === "succeeded") {
        expect(context.recordCommandEvidence).toHaveBeenCalledWith(
          "fixture-only",
          expect.stringContaining("exit code 0"),
        );
      } else {
        expect(context.recordCommandEvidence).not.toHaveBeenCalled();
      }
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


describe("governed local command authority", () => {
  const block = (approval = "false") => ({
    type: "tool_use" as const, name: "execute_command" as const, partial: false,
    params: { command: "npm run build", requires_approval: approval },
  });

  it("honors a governed denial even when ordinary command preferences are broad", async () => {
    const { handler, context } = fixture(true, 0);
    Object.assign(context, {
      shouldAutoApproveTool: () => [true, true],
      shouldAutoApproveCommand: jest.fn(() => false),
      ask: jest.fn(async () => ({ response: "noButtonClicked" })),
    });
    expect((await handler.execute(block(), false)).outcome).toBe("rejected");
    expect(context.ask).toHaveBeenCalledTimes(1);
    expect(context.terminalManager.runCommand).not.toHaveBeenCalled();
  });

  it("reuses a valid exact local command decision without another approval prompt", async () => {
    const { handler, context } = fixture(true, 0);
    Object.assign(context, {
      shouldAutoApproveTool: () => [true, false],
      shouldAutoApproveCommand: jest.fn(() => true),
      consecutiveAutoApprovedRequestsCount: 0,
      removeLastPartialMessageIfExistsWithType: jest.fn(),
      ask: jest.fn(async () => ({ response: "noButtonClicked" })),
    });
    expect((await handler.execute(block("true"), false)).outcome).toBe("succeeded");
    expect(context.ask).not.toHaveBeenCalled();
    expect(context.consecutiveAutoApprovedRequestsCount).toBe(1);
  });

  it.each(["yesButtonClicked", "noButtonClicked"])("records the user's exact %s decision", async (response) => {
    const { handler, context } = fixture(true, 0);
    const recordCommandApproval = jest.fn();
    Object.assign(context, { recordCommandApproval,
      ask: jest.fn(async () => ({ response })),
    });
    await handler.execute(block("true"), false);
    expect(recordCommandApproval).toHaveBeenCalledWith("npm run build", response === "yesButtonClicked");
  });

  it("records uncertain terminal completion so it cannot silently authorize another execution", async () => {
    const { handler, context } = fixture(true);
    const recordCommandOutcome = jest.fn();
    Object.assign(context, { recordCommandOutcome });
    expect((await handler.execute(block("true"), false)).outcome).toBe("unknown");
    expect(recordCommandOutcome).toHaveBeenCalledWith("npm run build", "unknown");
  });
});


describe("command authority immediately before dispatch", () => {
  it("does not run or charge an automatic request after local authority changes while the terminal opens", async () => {
    const { handler, context } = fixture(true, 0);
    let allowed = true;
    Object.assign(context, { shouldAutoApproveTool: () => [true, false],
      shouldAutoApproveCommand: () => allowed });
    context.terminalManager.getOrCreateTerminal.mockImplementation(async () => {
      allowed = false; return { terminal: { show: jest.fn() } };
    });
    const result = await handler.execute({ type: "tool_use", name: "execute_command", partial: false,
      params: { command: "pwd", requires_approval: "false" } }, false);
    expect(result.outcome).toBe("blocked");
    expect(context.terminalManager.runCommand).not.toHaveBeenCalled();
    expect(context.consecutiveAutoApprovedRequestsCount).toBe(0);
  });

  it("does not dispatch an explicit decision after its task is cancelled during the approval prompt", async () => {
    const { handler, context } = fixture(true, 0);
    let active = true;
    Object.assign(context, { isTaskActive: () => active });
    context.ask.mockImplementation(async () => { active = false; return { response: "yesButtonClicked" }; });
    const result = await handler.execute({ type: "tool_use", name: "execute_command", partial: false,
      params: { command: "pwd", requires_approval: "true" } }, false);
    expect(result.outcome).toBe("blocked");
    expect(context.terminalManager.runCommand).not.toHaveBeenCalled();
  });
});
