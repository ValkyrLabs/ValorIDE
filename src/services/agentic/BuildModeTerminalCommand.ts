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

export interface BuildModeNativeTerminalCommandEvaluation {
  allowed: boolean;
  reason?: string;
}

const SAFE_SCRIPT_NAME =
  /^(?:test|build|lint|check|typecheck|verify|unit|e2e)(?:[:.-][A-Za-z0-9_.-]+)?$/i;
const SAFE_NPX_TOOL = /^(?:jest|vitest|tsc|eslint|playwright|cypress)$/i;
const SAFE_SIMPLE_ARG = /^[A-Za-z0-9_./:@+=,-]+$/;
const SHELL_CONTROL_PATTERN = /[\n\r;&|<>`$\\]/;

const nativeTerminalDecision = (
  allowed: boolean,
  reason: string,
): BuildModeNativeTerminalCommandEvaluation =>
  allowed ? { allowed: true } : { allowed: false, reason };

export const evaluateBuildModeNativeTerminalCommand = (
  command: string,
  kind: string,
): BuildModeNativeTerminalCommandEvaluation => {
  if (kind !== "test" && kind !== "build") {
    return {
      allowed: false,
      reason: "Native terminal execution only handles test/build commands.",
    };
  }

  const normalized = command.trim();
  if (!normalized) {
    return {
      allowed: false,
      reason: "Native terminal execution requires a command.",
    };
  }
  if (SHELL_CONTROL_PATTERN.test(normalized)) {
    return {
      allowed: false,
      reason:
        "Native terminal execution does not run shell control operators, redirection, expansions, or command chaining.",
    };
  }

  const tokens = normalized.split(/\s+/);
  if (!tokens.every((token) => SAFE_SIMPLE_ARG.test(token))) {
    return {
      allowed: false,
      reason: "Native terminal execution only accepts simple command tokens.",
    };
  }

  const [binary, subcommand, scriptOrGoal] = tokens;
  if ((binary === "npm" || binary === "pnpm") && subcommand === "run") {
    return nativeTerminalDecision(
      Boolean(scriptOrGoal && SAFE_SCRIPT_NAME.test(scriptOrGoal)),
      `Native terminal execution does not allow npm script: ${scriptOrGoal ?? "<missing>"}.`,
    );
  }
  if (binary === "npm" || binary === "pnpm" || binary === "yarn") {
    return nativeTerminalDecision(
      Boolean(subcommand && SAFE_SCRIPT_NAME.test(subcommand)),
      `Native terminal execution does not allow package script: ${subcommand ?? "<missing>"}.`,
    );
  }
  if (binary === "npx") {
    const allowed =
      SAFE_NPX_TOOL.test(subcommand ?? "") &&
      (subcommand !== "playwright" || scriptOrGoal === "test") &&
      (subcommand !== "cypress" || scriptOrGoal === "run");
    return nativeTerminalDecision(
      allowed,
      `Native terminal execution does not allow npx tool: ${subcommand ?? "<missing>"}.`,
    );
  }
  if (binary === "mvn" || binary === "mvnw" || binary === "./mvnw") {
    const allowed = tokens.some((token) =>
      /^(?:test|verify|package)$/i.test(token),
    );
    return nativeTerminalDecision(
      allowed,
      "Native terminal execution only allows Maven test, verify, or package goals.",
    );
  }
  if (binary === "cargo") {
    return nativeTerminalDecision(
      /^(?:test|build|check)$/i.test(subcommand ?? ""),
      `Native terminal execution does not allow cargo command: ${subcommand ?? "<missing>"}.`,
    );
  }
  if (binary === "go") {
    return nativeTerminalDecision(
      subcommand === "test",
      `Native terminal execution does not allow go command: ${subcommand ?? "<missing>"}.`,
    );
  }
  if (binary === "gradle" || binary === "./gradlew") {
    const allowed = tokens.some((token) => /^(?:test|build|check)$/i.test(token));
    return nativeTerminalDecision(
      allowed,
      "Native terminal execution only allows Gradle test, build, or check tasks.",
    );
  }
  if (binary === "./vaix") {
    return nativeTerminalDecision(
      subcommand === "test",
      `Native terminal execution does not allow vaix command: ${subcommand ?? "<missing>"}.`,
    );
  }

  return {
    allowed: false,
    reason: `Native terminal execution does not allow command launcher: ${binary}.`,
  };
};

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
