import { spawn } from "child_process";

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_OUTPUT_BYTES = 64 * 1024;

export interface BuildModeTerminalCommandExecution {
  command: string;
  timeoutMs?: number;
  workspaceRoot: string;
}

export interface BuildModeTerminalCommandResult {
  completed: boolean;
  exitCode?: number;
  stderr?: string;
  stdout?: string;
  timedOut?: boolean;
}

export const executeBuildModeTerminalCommand = async ({
  command,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  workspaceRoot,
}: BuildModeTerminalCommandExecution): Promise<BuildModeTerminalCommandResult> => {
  return new Promise((resolve) => {
    const child = spawn(command, {
      cwd: workspaceRoot,
      shell: true,
      windowsHide: true,
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let settled = false;
    const finish = (result: BuildModeTerminalCommandResult) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeoutHandle);
      resolve(result);
    };
    const timeoutHandle = setTimeout(() => {
      child.kill("SIGKILL");
      finish({
        completed: false,
        exitCode: 124,
        stderr: "Command timeout after 30s.",
        timedOut: true,
      });
    }, timeoutMs);

    child.stdout?.on("data", (chunk) => stdout.push(Buffer.from(chunk)));
    child.stderr?.on("data", (chunk) => stderr.push(Buffer.from(chunk)));
    child.on("error", (error) => {
      finish({
        completed: false,
        stderr: error.message,
        timedOut: false,
      });
    });
    child.on("close", (code) => {
      finish({
        completed: true,
        exitCode: code ?? 0,
        stderr: truncateOutput(Buffer.concat(stderr).toString("utf8")),
        stdout: truncateOutput(Buffer.concat(stdout).toString("utf8")),
        timedOut: false,
      });
    });
  });
};

const truncateOutput = (value: string | undefined): string | undefined => {
  if (!value) {
    return undefined;
  }
  const buffer = Buffer.from(value, "utf8");
  if (buffer.byteLength <= MAX_OUTPUT_BYTES) {
    return value;
  }
  return `${buffer.subarray(0, MAX_OUTPUT_BYTES).toString("utf8")}\n[output truncated]`;
};
