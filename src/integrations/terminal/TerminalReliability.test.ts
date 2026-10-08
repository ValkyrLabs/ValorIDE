import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
const mockEnds = new Set<(event: any) => void>();
const mockReady = new Set<(event: any) => void>();
const mockCloses = new Set<(event: any) => void>();
jest.mock("vscode", () => ({
  window: {
    onDidEndTerminalShellExecution: (fn: any) => {
      mockEnds.add(fn);
      return { dispose: () => mockEnds.delete(fn) };
    },
    onDidChangeTerminalShellIntegration: (fn: any) => {
      mockReady.add(fn);
      return { dispose: () => mockReady.delete(fn) };
    },
    onDidCloseTerminal: (fn: any) => {
      mockCloses.add(fn);
      return { dispose: () => mockCloses.delete(fn) };
    },
  },
  Uri: { file: (fsPath: string) => ({ fsPath }) },
}));
import { TerminalManager } from "./TerminalManager";
import { TerminalProcess, TERMINAL_OUTPUT_LIMIT } from "./TerminalProcess";
import { normalizeModelCommand } from "@utils/string";
import { awaitAskWithTimeout } from "@core/task/utils/askWithTimeout";

const managers: TerminalManager[] = [];
function manager(
  limits: {
    foregroundTimeoutMs?: number;
    shellIntegrationTimeoutMs?: number;
  } = {},
) {
  const value = new TerminalManager(limits);
  managers.push(value);
  return value;
}
function execution() {
  const iterator = {
    next: jest.fn(() => new Promise<IteratorResult<string>>(() => {})),
    return: jest.fn(async () => ({ done: true, value: undefined })),
  };
  return {
    read: jest.fn(() => ({ [Symbol.asyncIterator]: () => iterator })),
    iterator,
  };
}
function info(commandExecution?: any) {
  return {
    id: 99,
    busy: false,
    lastCommand: "",
    terminal: {
      shellIntegration: commandExecution
        ? { executeCommand: jest.fn(() => commandExecution) }
        : undefined,
      sendText: jest.fn(),
      dispose: jest.fn(),
      exitStatus: undefined,
    },
  } as any;
}
async function tick() {
  await Promise.resolve();
  await Promise.resolve();
}
beforeEach(() => jest.useFakeTimers({ doNotFake: ["queueMicrotask"] }));
afterEach(() => {
  for (const value of managers.splice(0)) value.disposeAll();
  jest.useRealTimers();
  mockEnds.clear();
  mockReady.clear();
  mockCloses.clear();
});

describe("agent terminal recovery", () => {
  it("dispatches once when readiness arrives before the fallback timer, including repeated ready events", async () => {
    const m = manager({ shellIntegrationTimeoutMs: 20 }),
      t = info(),
      e = {
        read: jest.fn(() => ({
          async *[Symbol.asyncIterator]() {
            yield "ready\n";
          },
        })),
      };
    const p = m.runCommand(t, "fixture");
    await tick();
    const ready = [...mockReady];
    t.terminal.shellIntegration = { executeCommand: jest.fn(() => e) };
    for (const fn of ready)
      fn({
        terminal: t.terminal,
        shellIntegration: t.terminal.shellIntegration,
      });
    for (const fn of ready)
      fn({
        terminal: t.terminal,
        shellIntegration: t.terminal.shellIntegration,
      });
    await p;
    await jest.advanceTimersByTimeAsync(30);
    expect(t.terminal.shellIntegration.executeCommand).toHaveBeenCalledTimes(1);
    expect(t.terminal.sendText).not.toHaveBeenCalled();
    expect(e.read).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });
  it.each([
    ["cd /tmp &amp;&amp; git log", "cd /tmp && git log"],
    [
      "printf &quot;ready&amp;done&quot; &gt; output",
      'printf "ready&done" > output',
    ],
    [
      "printf 'literal &amp; &gt; &quot;'",
      "printf 'literal &amp; &gt; &quot;'",
    ],
    ['printf "literal &amp;"', 'printf "literal &amp;"'],
    ["printf escaped\\&amp;", "printf escaped\\&amp;"],
    ["true &amp;&amp; rm -rf /tmp/fixture", "true && rm -rf /tmp/fixture"],
  ])(
    "normalizes shell syntax before approval while preserving literals: %s",
    (raw, expected) => {
      expect(normalizeModelCommand(raw)).toBe(expected);
    },
  );

  it("releases silent foreground waits without claiming completion or reusing the busy terminal", async () => {
    const m = manager({ foregroundTimeoutMs: 50 }),
      e = execution(),
      t = info(e);
    const p = m.runCommand(t, "silent");
    const completed = jest.fn();
    p.on("completed", completed);
    await tick();
    await jest.advanceTimersByTimeAsync(60);
    await p;
    expect(completed).not.toHaveBeenCalled();
    expect(t.busy).toBe(true);
    expect(p.getState()).toBe("running");
    expect(e.read).toHaveBeenCalledTimes(1);
    m.disposeAll();
    expect(jest.getTimerCount()).toBe(0);
  });

  it("ignores unrelated execution ends and releases a broken reader on the exact execution end", async () => {
    const m = manager(),
      e = execution(),
      t = info(e),
      p = m.runCommand(t, "fixture");
    await tick();
    expect(mockEnds.size).toBe(1);
    expect(p.matchesExecution(e)).toBe(true);
    for (const fn of mockEnds)
      fn({ terminal: t.terminal, execution: {}, exitCode: 0 });
    await jest.advanceTimersByTimeAsync(200);
    expect(p.getState()).toBe("running");
    for (const fn of mockEnds)
      fn({ terminal: t.terminal, execution: e, exitCode: 7 });
    await jest.advanceTimersByTimeAsync(110);
    await p;
    expect(p.getExitCode()).toBe(7);
    expect(t.busy).toBe(false);
    expect(e.read).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  it("does not replay a command after its output reader fails", async () => {
    const e = {
      read: () => ({
        async *[Symbol.asyncIterator]() {
          yield "partial\n";
          throw new Error("broken reader");
        },
      }),
    };
    const m = manager(),
      t = info(e),
      p = m.runCommand(t, "side effects possible");
    await expect(p).rejects.toThrow("inspect the terminal before retrying");
    expect(t.terminal.shellIntegration.executeCommand).toHaveBeenCalledTimes(1);
    expect(t.terminal.sendText).not.toHaveBeenCalled();
    expect(p.getState()).toBe("unknown");
    expect(jest.getTimerCount()).toBe(0);
  });

  it("sends once after the readiness deadline and reports unavailable completion honestly", async () => {
    const m = manager({ shellIntegrationTimeoutMs: 20 }),
      t = info(),
      p = m.runCommand(t, "fallback");
    const completed = jest.fn();
    p.on("completed", completed);
    await tick();
    await jest.advanceTimersByTimeAsync(25);
    await p;
    expect(t.terminal.sendText).toHaveBeenCalledTimes(1);
    expect(completed).not.toHaveBeenCalled();
    expect(p.getState()).toBe("unknown");
    expect(jest.getTimerCount()).toBe(0);
  });

  it("cancels pending readiness without dispatching later or closing the terminal", async () => {
    const m = manager(),
      t = info(),
      p = m.runCommand(t, "must not run");
    await tick();
    m.disposeAll();
    await p;
    await jest.advanceTimersByTimeAsync(5000);
    expect(t.terminal.sendText).not.toHaveBeenCalled();
    expect(t.terminal.dispose).not.toHaveBeenCalled();
    expect(p.getState()).toBe("cancelled");
    expect(jest.getTimerCount()).toBe(0);
  });

  it("rechecks authority after shell readiness and leaves blocked commands undispatched", async () => {
    const m = manager({ shellIntegrationTimeoutMs: 20 }),
      t = info(),
      gate = jest.fn(() => false),
      p = m.runCommand(t, "must not run", { beforeDispatch: gate });
    await tick();
    await jest.advanceTimersByTimeAsync(25);
    await p;
    expect(gate).toHaveBeenCalledTimes(1);
    expect(t.terminal.sendText).not.toHaveBeenCalled();
    expect(p.getState()).toBe("blocked");
    expect(t.busy).toBe(false);
    expect(jest.getTimerCount()).toBe(0);
  });

  it("settles when the final authority check throws", async () => {
    const m = manager(),
      t = info(execution()),
      p = m.runCommand(t, "must not run", {
        beforeDispatch: () => {
          throw new Error("authority unavailable");
        },
      });
    await expect(p).rejects.toThrow("authority unavailable");
    expect(t.terminal.shellIntegration.executeCommand).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  it("releases an active reader during cancellation and preserves the terminal", async () => {
    const m = manager(),
      t = info(execution()),
      p = m.runCommand(t, "long command");
    await tick();
    m.disposeAll();
    await p;
    expect(p.getState()).toBe("cancelled");
    expect(t.terminal.dispose).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  it("bounds retained and displayed output while preserving Unicode, echo text and trailing characters", async () => {
    const p = new TerminalProcess(),
      lines: string[] = [];
    p.on("line", (line) => lines.push(line));
    const e = {
      read: () => ({
        async *[Symbol.asyncIterator]() {
          yield "hello\nαβγ >\n";
          yield "x".repeat(TERMINAL_OUTPUT_LIMIT * 3);
        },
      }),
    };
    await p.run(info(e).terminal, "echo hello");
    expect(lines).toContain("hello");
    expect(lines).toContain("αβγ >");
    expect((p as any).fullOutput.length).toBeLessThanOrEqual(
      TERMINAL_OUTPUT_LIMIT,
    );
    expect(lines.every((line) => line.length < 17000)).toBe(true);
    expect(jest.getTimerCount()).toBe(0);
  });

  it("clears the losing output-acknowledgment timer on success and failure", async () => {
    await expect(
      awaitAskWithTimeout(
        Promise.resolve({ response: "yesButtonClicked" as const }),
      ),
    ).resolves.toEqual({ response: "yesButtonClicked" });
    expect(jest.getTimerCount()).toBe(0);
    await expect(
      awaitAskWithTimeout(Promise.reject(new Error("closed"))),
    ).rejects.toThrow("closed");
    expect(jest.getTimerCount()).toBe(0);
  });
});
