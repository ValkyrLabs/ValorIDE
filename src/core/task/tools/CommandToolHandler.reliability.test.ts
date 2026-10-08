import { afterEach, expect, it } from "@jest/globals";
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
import { EventEmitter } from "node:events";
import { CommandToolHandler } from "./CommandToolHandler";

function fixture(state = "completed", output: string[] = ["hello", "αβγ >"]) {
  const p = new EventEmitter() as any;
  p.getExitCode = () => (state === "completed" ? 0 : undefined);
  p.getState = () => state;
  p.then = (resolve: () => void, reject: (error: Error) => void) => {
    for (const line of output) p.emit("line", line);
    if (state === "unknown") {
      p.emit("no_shell_integration");
      reject(new Error("output capture failed"));
    } else {
      if (state === "completed") p.emit("completed");
      resolve();
    }
  };
  const context: any = {
    cwd: "/tmp",
    taskId: "command-reliability",
    autoApprovalSettings: { enabled: true, enableNotifications: true },
    consecutiveMistakeCount: 0,
    consecutiveAutoApprovedRequestsCount: 0,
    api: { getModel: () => ({ id: "gpt-5.6-sol" }) },
    valorideIgnoreController: { validateCommand: jest.fn(() => undefined) },
    shouldAutoApproveTool: () => [true, false],
    isTaskActive: () => true,
    getChatMode: () => "act",
    ask: jest.fn(async () => ({ response: "yesButtonClicked" })),
    say: jest.fn(async () => undefined),
    removeLastPartialMessageIfExistsWithType: jest.fn(),
    saveCheckpoint: jest.fn(async () => undefined),
    workspaceTracker: { populateFilePaths: jest.fn() },
    recordCommandEvidence: jest.fn(),
    recordCommandOutcome: jest.fn(),
    terminalManager: {
      getOrCreateTerminal: jest.fn(async () => ({
        terminal: { show: jest.fn() },
      })),
      runCommand: jest.fn((_terminal, _command, options) => {
        options.beforeDispatch();
        return p;
      }),
    },
  };
  const execute = (command: string) =>
    new CommandToolHandler(context).execute(
      {
        type: "tool_use",
        name: "execute_command",
        partial: false,
        params: { command, requires_approval: "false" },
      },
      false,
    );
  return { p, context, execute };
}
afterEach(() => jest.useRealTimers());

it("uses the same decoded command for safety checks, user approval and physical dispatch", async () => {
  const f = fixture();
  await f.execute("echo hello &amp;&amp; touch /tmp/never-created-by-fixture");
  const decoded = "echo hello && touch /tmp/never-created-by-fixture";
  expect(
    f.context.valorideIgnoreController.validateCommand,
  ).toHaveBeenCalledWith(decoded);
  expect(f.context.ask.mock.calls[0][0]).toBe("command");
  expect(f.context.ask.mock.calls[0][1]).toContain(decoded);
  expect(f.context.terminalManager.runCommand.mock.calls[0][1]).toBe(decoded);
  expect(f.context.consecutiveAutoApprovedRequestsCount).toBe(0);
});

it("returns quick command output without extra approvals and clears notification/display timers", async () => {
  jest.useFakeTimers();
  const f = fixture();
  expect((await f.execute("echo hello")).outcome).toBe("succeeded");
  expect(f.context.ask).not.toHaveBeenCalled();
  expect(f.context.say).toHaveBeenCalledWith(
    "command_output",
    "hello\nαβγ >\n",
  );
  expect(f.context.consecutiveAutoApprovedRequestsCount).toBe(1);
  expect(jest.getTimerCount()).toBe(0);
});

it("reports lost output capture as unknown, records it and never replays the operation", async () => {
  jest.useFakeTimers();
  const f = fixture("unknown");
  const result = await f.execute("echo hello");
  expect(result.outcome).toBe("unknown");
  expect(result.toolResponse).toContain("Inspect the terminal before retrying");
  expect(f.context.recordCommandOutcome).toHaveBeenCalledWith(
    "echo hello",
    "unknown",
  );
  expect(f.context.recordCommandEvidence).not.toHaveBeenCalled();
  expect(f.context.terminalManager.runCommand).toHaveBeenCalledTimes(1);
  expect(jest.getTimerCount()).toBe(0);
});

it("does not let a missing output-display acknowledgment keep a completed operation waiting", async () => {
  jest.useFakeTimers();
  const f = fixture();
  f.context.say.mockImplementation((type: string) =>
    type === "command_output"
      ? new Promise(() => {})
      : Promise.resolve(undefined),
  );
  const result = f.execute("echo hello");
  await jest.advanceTimersByTimeAsync(1001);
  expect((await result).outcome).toBe("succeeded");
  expect(jest.getTimerCount()).toBe(0);
});

it("limits large output retained in the agent result and delivered to the chat", async () => {
  jest.useFakeTimers();
  const f = fixture(
    "completed",
    Array.from({ length: 30000 }, (_, n) => `${n}${"x".repeat(40)}`),
  );
  const result = await f.execute("fixture-output");
  expect(result.outcome).toBe("succeeded");
  expect(String(result.toolResponse).length).toBeLessThan(525000);
  expect(result.toolResponse).toContain("Earlier command output truncated");
  const outputs = f.context.say.mock.calls.filter(
    ([type]: [string]) => type === "command_output",
  );
  expect(outputs).toHaveLength(1);
  expect(outputs[0][1].length).toBeLessThan(32900);
  expect(jest.getTimerCount()).toBe(0);
});
