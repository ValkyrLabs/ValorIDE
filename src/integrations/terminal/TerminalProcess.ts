import { EventEmitter } from "events";
import { stripAnsi } from "./ansiUtils";
import type * as vscode from "vscode";

export interface TerminalProcessEvents {
  line: [line: string];
  continue: [];
  completed: [];
  error: [error: Error];
  no_shell_integration: [];
}

const PROCESS_HOT_TIMEOUT_NORMAL = 2_000;
const PROCESS_HOT_TIMEOUT_COMPILING = 15_000;
export const TERMINAL_FOREGROUND_TIMEOUT_MS = 15_000;
export const TERMINAL_OUTPUT_LIMIT = 512 * 1024;
const MAX_DISPLAY_LINE_LENGTH = 16 * 1024;

export class TerminalProcess extends EventEmitter<TerminalProcessEvents> {
  waitForShellIntegration = true;
  private isListening = true;
  private buffer = "";
  private fullOutput = "";
  private lastRetrievedIndex = 0;
  private outputTruncated = false;
  isHot = false;
  private hotTimer: NodeJS.Timeout | undefined;
  private foregroundTimer: NodeJS.Timeout | undefined;
  private shellEndTimer: NodeJS.Timeout | undefined;
  private hasFinished = false;
  private hasEmittedContinue = false;
  private exitCode: number | undefined;
  private execution: vscode.TerminalShellExecution | undefined;
  private stopReader: (() => void) | undefined;
  private state: "running" | "completed" | "unknown" | "cancelled" | "blocked" =
    "running";

  constructor(
    private readonly foregroundTimeoutMs = TERMINAL_FOREGROUND_TIMEOUT_MS,
  ) {
    super();
  }

  private clearHotState() {
    clearTimeout(this.hotTimer);
    this.hotTimer = undefined;
    this.isHot = false;
  }

  private emitContinueOnce() {
    if (this.hasEmittedContinue) return;
    this.hasEmittedContinue = true;
    clearTimeout(this.foregroundTimer);
    this.foregroundTimer = undefined;
    this.emit("continue");
  }

  private finalize(
    options: {
      exitCode?: number;
      error?: unknown;
      unknown?: boolean;
      cancelled?: boolean;
      blocked?: boolean;
    } = {},
  ) {
    if ("exitCode" in options) this.exitCode = options.exitCode;
    if (this.hasFinished) return;
    this.hasFinished = true;
    this.state = options.blocked
      ? "blocked"
      : options.cancelled
        ? "cancelled"
        : options.unknown || options.error
          ? "unknown"
          : "completed";
    this.clearHotState();
    clearTimeout(this.shellEndTimer);
    clearTimeout(this.foregroundTimer);
    this.stopReader?.();
    this.emitRemainingBufferIfListening();
    if (options.unknown || options.error) this.emit("no_shell_integration");
    // An output-capture failure or cancellation does not prove command completion.
    if (this.state === "completed") this.emit("completed");
    if (options.error) {
      const error =
        options.error instanceof Error
          ? options.error
          : new Error(String(options.error));
      if (this.listenerCount("error")) this.emit("error", error);
    }
    this.emitContinueOnce();
  }

  isActive() {
    return !this.hasFinished;
  }
  block() {
    this.finalize({ blocked: true });
  }
  fail(error: unknown) {
    this.finalize({ error });
  }
  getState() {
    return this.state;
  }
  matchesExecution(execution: unknown) {
    return !!this.execution && execution === this.execution;
  }

  async run(terminal: vscode.Terminal, command: string) {
    if (this.hasFinished) return;
    if (!terminal.shellIntegration?.executeCommand) {
      try {
        terminal.sendText(command, true);
        this.finalize({ unknown: true });
      } catch (error) {
        this.finalize({ error });
      }
      return;
    }

    let iterator: AsyncIterator<string> | undefined;
    try {
      this.execution = terminal.shellIntegration.executeCommand(command);
      // Subscribe immediately to this execution, once; never read unrelated ones.
      iterator = this.execution.read()[Symbol.asyncIterator]();
      const stopped = new Promise<IteratorResult<string>>((resolve) => {
        this.stopReader = () => resolve({ done: true, value: undefined });
      });
      this.foregroundTimer = setTimeout(() => {
        if (this.hasFinished || this.hasEmittedContinue) return;
        this.emit(
          "line",
          `[Command has not completed after ${Math.round(this.foregroundTimeoutMs / 1000)}s. Continuing in the background; inspect the terminal before repeating this command.]`,
        );
        this.continue();
      }, this.foregroundTimeoutMs);

      let skipEcho = true;
      while (!this.hasFinished) {
        const next = await Promise.race([iterator.next(), stopped]);
        if (next.done || this.hasFinished) break;
        this.captureExitCodeFromShellIntegration(next.value);
        const data = stripAnsi(next.value);
        if (!data) continue;
        this.appendOutput(data);
        this.markHot(data);
        if (this.isListening) {
          this.buffer += data;
          let end: number;
          while ((end = this.buffer.indexOf("\n")) !== -1) {
            const line = this.buffer.slice(0, end).replace(/\r$/, "");
            this.buffer = this.buffer.slice(end + 1);
            // Only an exact echoed command is metadata. Real output may share
            // words/characters with the command (echo, Unicode, JSON, etc.).
            if (skipEcho && line.trim() === command.trim()) {
              skipEcho = false;
              continue;
            }
            if (line.trim()) skipEcho = false;
            this.emitDisplayLine(line);
          }
          if (this.buffer.length > MAX_DISPLAY_LINE_LENGTH) {
            this.emitDisplayLine(this.buffer);
            this.buffer = "";
          }
          this.lastRetrievedIndex = Math.max(
            0,
            this.fullOutput.length - this.buffer.length,
          );
        }
      }
      if (!this.hasFinished) this.finalize();
    } catch (error) {
      // executeCommand may already have caused side effects. Never sendText or
      // execute it again merely because its stream failed.
      this.finalize({
        error: new Error(
          `Terminal output tracking failed. The command may have run; inspect the terminal before retrying. ${error instanceof Error ? error.message : String(error)}`,
        ),
      });
    } finally {
      this.stopReader = undefined;
      // Some integrations leave next() pending forever. Release our reader
      // without waiting on that implementation during task cancellation.
      try {
        if (iterator?.return)
          void Promise.resolve(iterator.return()).catch(() => {});
      } catch {
        // A broken reader must not prevent cancellation or repeat dispatch.
      }
    }
  }

  private appendOutput(data: string) {
    this.fullOutput += data;
    if (this.fullOutput.length > TERMINAL_OUTPUT_LIMIT) {
      const dropped = this.fullOutput.length - TERMINAL_OUTPUT_LIMIT;
      this.fullOutput = this.fullOutput.slice(dropped);
      this.lastRetrievedIndex = Math.max(0, this.lastRetrievedIndex - dropped);
      this.outputTruncated = true;
    }
  }

  private markHot(data: string) {
    this.isHot = true;
    clearTimeout(this.hotTimer);
    const lower = data.toLowerCase();
    const compiling =
      [
        "compiling",
        "building",
        "bundling",
        "transpiling",
        "generating",
        "starting",
      ].some((x) => lower.includes(x)) &&
      ![
        "compiled",
        "success",
        "finish",
        "complete",
        "succeed",
        "done",
        "end",
        "stop",
        "exit",
        "terminate",
        "error",
        "fail",
      ].some((x) => lower.includes(x));
    this.hotTimer = setTimeout(
      () => {
        this.isHot = false;
      },
      compiling ? PROCESS_HOT_TIMEOUT_COMPILING : PROCESS_HOT_TIMEOUT_NORMAL,
    );
  }

  private emitDisplayLine(line: string) {
    const bounded =
      line.length > MAX_DISPLAY_LINE_LENGTH
        ? `${line.slice(0, MAX_DISPLAY_LINE_LENGTH / 2)}\n[Long terminal line truncated]\n${line.slice(-MAX_DISPLAY_LINE_LENGTH / 2)}`
        : line;
    this.emit("line", bounded);
  }

  // Retained for callers/tests that feed already-normalized output.
  private emitIfEol(chunk: string) {
    this.buffer += chunk;
    let end: number;
    while ((end = this.buffer.indexOf("\n")) !== -1) {
      this.emitDisplayLine(this.buffer.slice(0, end).replace(/\r$/, ""));
      this.buffer = this.buffer.slice(end + 1);
    }
  }

  private emitRemainingBufferIfListening() {
    if (this.buffer && this.isListening) {
      this.emitDisplayLine(this.buffer);
      this.buffer = "";
      this.lastRetrievedIndex = this.fullOutput.length;
    }
  }

  continue() {
    this.emitRemainingBufferIfListening();
    this.isListening = false;
    this.removeAllListeners("line");
    this.emitContinueOnce();
  }

  cancel() {
    this.finalize({ cancelled: true });
    this.isListening = false;
    this.removeAllListeners("line");
  }

  handleShellExecutionEnd(exitCode?: number) {
    this.exitCode = exitCode;
    if (this.hasFinished) return;
    // Let buffered output drain first, but also settle broken read streams.
    clearTimeout(this.shellEndTimer);
    this.shellEndTimer = setTimeout(() => this.finalize({ exitCode }), 100);
  }

  handleTerminalClosed() {
    this.finalize({ unknown: true });
  }

  getUnretrievedOutput(): string {
    const output = this.fullOutput.slice(this.lastRetrievedIndex);
    this.lastRetrievedIndex = this.fullOutput.length;
    const prefix = this.outputTruncated
      ? "[Earlier terminal output truncated; retained latest output]\n"
      : "";
    this.outputTruncated = false;
    return prefix + output;
  }

  getExitCode(): number | undefined {
    return this.exitCode;
  }

  private captureExitCodeFromShellIntegration(output: string) {
    for (const match of output.matchAll(/\]633;D(?:;(-?\d+))?/g)) {
      if (match[1] !== undefined) this.exitCode = Number.parseInt(match[1], 10);
    }
  }

  removeLastLineArtifacts(output: string) {
    const lines = output.trimEnd().split("\n");
    if (lines.length)
      lines[lines.length - 1] = lines[lines.length - 1].replace(
        /[%$#>]\s*$/,
        "",
      );
    return lines.join("\n").trimEnd();
  }
}

export type TerminalProcessResultPromise = TerminalProcess & Promise<void>;

export function mergePromise(
  process: TerminalProcess,
  promise: Promise<void>,
): TerminalProcessResultPromise {
  const nativePromisePrototype = (async () => {})().constructor.prototype;
  for (const property of ["then", "catch", "finally"]) {
    const descriptor = Reflect.getOwnPropertyDescriptor(
      nativePromisePrototype,
      property,
    );
    if (descriptor)
      Reflect.defineProperty(process, property, {
        ...descriptor,
        value: descriptor.value.bind(promise),
      });
  }
  return process as TerminalProcessResultPromise;
}
