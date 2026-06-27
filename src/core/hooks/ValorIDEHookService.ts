import { spawn } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { basename, extname, join } from "node:path";
import * as vscode from "vscode";

export type ValorIDEHookName =
  | "TaskStart"
  | "TaskResume"
  | "TaskCancel"
  | "TaskComplete"
  | "TaskError"
  | "PreToolUse"
  | "PostToolUse"
  | "UserPromptSubmit"
  | "PreCompact"
  | "SessionShutdown";

export interface ValorIDEHookControl {
  cancel?: boolean;
  review?: boolean;
  context?: string;
  overrideInput?: unknown;
}

export interface ValorIDEHookPayload {
  valorideVersion?: string;
  hookName: ValorIDEHookName;
  timestamp: string;
  taskId: string;
  workspaceRoots: string[];
  userId: string;
  preToolUse?: {
    toolName: string;
    parameters: Record<string, string>;
  };
  postToolUse?: {
    toolName: string;
    parameters: Record<string, string>;
    result: string;
    success: boolean;
    executionTimeMs: number;
  };
  taskMetadata?: Record<string, string>;
}

export interface ValorIDEHookServiceOptions {
  cwd: string;
  taskId: string;
  enabled?: boolean;
  timeoutMs?: number;
  extraHookDirs?: string[];
}

const supportedHookExtensions = new Set([
  "",
  ".sh",
  ".bash",
  ".zsh",
  ".js",
  ".mjs",
  ".cjs",
  ".py",
]);

const hookNames: ValorIDEHookName[] = [
  "TaskStart",
  "TaskResume",
  "TaskCancel",
  "TaskComplete",
  "TaskError",
  "PreToolUse",
  "PostToolUse",
  "UserPromptSubmit",
  "PreCompact",
  "SessionShutdown",
];

const hookNameLookup = new Map(
  hookNames.map((name) => [name.toLowerCase(), name]),
);

const stringifyValue = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }
  if (value === undefined) {
    return "";
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const logHookWarning = (message: string) => {
  console.warn(message);
};

const mapParams = (input: unknown): Record<string, string> => {
  if (!input || typeof input !== "object") {
    return {};
  }
  return Object.fromEntries(
    Object.entries(input as Record<string, unknown>).map(([key, value]) => [
      key,
      stringifyValue(value),
    ]),
  );
};

const normalizeHookName = (fileName: string): ValorIDEHookName | undefined => {
  const extension = extname(fileName).toLowerCase();
  if (!supportedHookExtensions.has(extension)) {
    return undefined;
  }
  return hookNameLookup.get(basename(fileName, extension).toLowerCase());
};

const parseHookControl = (stdout: string): ValorIDEHookControl | undefined => {
  const trimmed = stdout.trim();
  if (!trimmed) {
    return undefined;
  }
  const lines = trimmed
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const prefixed = lines
    .filter((line) => line.startsWith("HOOK_CONTROL\t"))
    .map((line) => line.slice("HOOK_CONTROL\t".length));
  const candidate =
    prefixed.length > 0 ? prefixed[prefixed.length - 1] : trimmed;

  try {
    const parsed = JSON.parse(candidate) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") {
      return undefined;
    }
    return {
      cancel: typeof parsed.cancel === "boolean" ? parsed.cancel : undefined,
      review: typeof parsed.review === "boolean" ? parsed.review : undefined,
      context:
        typeof parsed.context === "string"
          ? parsed.context
          : typeof parsed.contextModification === "string"
            ? parsed.contextModification
            : typeof parsed.errorMessage === "string"
              ? parsed.errorMessage
              : undefined,
      overrideInput: Object.hasOwn(parsed, "overrideInput")
        ? parsed.overrideInput
        : undefined,
    };
  } catch (error) {
    logHookWarning(
      `[ValorIDEHookService] Ignoring non-JSON hook stdout: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return undefined;
  }
};

const mergeHookControls = (
  current: ValorIDEHookControl | undefined,
  next: ValorIDEHookControl | undefined,
): ValorIDEHookControl | undefined => {
  if (!next) {
    return current;
  }
  if (!current) {
    return { ...next };
  }
  const context = [current.context, next.context]
    .filter((value): value is string => Boolean(value))
    .join("\n");
  return {
    cancel: current.cancel === true || next.cancel === true || undefined,
    review: current.review === true || next.review === true || undefined,
    context: context || undefined,
    overrideInput:
      next.overrideInput !== undefined
        ? next.overrideInput
        : current.overrideInput,
  };
};

export class ValorIDEHookService {
  private readonly cwd: string;
  private readonly taskId: string;
  private readonly timeoutMs: number;
  private readonly extraHookDirs: string[];

  constructor(options: ValorIDEHookServiceOptions) {
    this.cwd = options.cwd;
    this.taskId = options.taskId;
    this.timeoutMs = options.timeoutMs ?? 5_000;
    this.extraHookDirs = options.extraHookDirs ?? [];
    this.enabled =
      options.enabled ?? getHooksEnabledFromConfiguration() ?? false;
  }

  private readonly enabled: boolean;

  async runPreToolUse(
    toolName: string,
    input: unknown,
  ): Promise<ValorIDEHookControl | undefined> {
    return this.runHook("PreToolUse", {
      preToolUse: { toolName, parameters: mapParams(input) },
    });
  }

  async runPostToolUse(input: {
    toolName: string;
    parameters: unknown;
    result: string;
    success: boolean;
    executionTimeMs: number;
  }): Promise<ValorIDEHookControl | undefined> {
    return this.runHook("PostToolUse", {
      postToolUse: {
        toolName: input.toolName,
        parameters: mapParams(input.parameters),
        result: input.result,
        success: input.success,
        executionTimeMs: input.executionTimeMs,
      },
    });
  }

  async runHook(
    hookName: ValorIDEHookName,
    payload: Partial<ValorIDEHookPayload> = {},
  ): Promise<ValorIDEHookControl | undefined> {
    if (!this.enabled) {
      return undefined;
    }
    const scripts = this.findHookScripts(hookName);
    if (scripts.length === 0) {
      return undefined;
    }

    const fullPayload: ValorIDEHookPayload = {
      hookName,
      timestamp: new Date().toISOString(),
      taskId: this.taskId,
      workspaceRoots: [this.cwd],
      userId: process.env.USER || "unknown",
      ...payload,
    };

    let control: ValorIDEHookControl | undefined;
    for (const script of scripts) {
      const next = await this.executeHookScript(script, fullPayload);
      control = mergeHookControls(control, next);
    }
    return control;
  }

  findHookScripts(hookName: ValorIDEHookName): string[] {
    if (!this.enabled) {
      return [];
    }
    const scripts: string[] = [];
    const seen = new Set<string>();
    for (const directory of this.resolveHookDirectories()) {
      if (!existsSync(directory)) {
        continue;
      }
      try {
        for (const entry of readdirSync(directory, { withFileTypes: true })) {
          if (!entry.isFile()) {
            continue;
          }
          if (normalizeHookName(entry.name) !== hookName) {
            continue;
          }
          const scriptPath = join(directory, entry.name);
          if (seen.has(scriptPath)) {
            continue;
          }
          seen.add(scriptPath);
          scripts.push(scriptPath);
        }
      } catch (error) {
        logHookWarning(
          `[ValorIDEHookService] Failed to read hook directory ${directory}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
    return scripts.sort((a, b) => a.localeCompare(b));
  }

  private resolveHookDirectories(): string[] {
    return [
      join(homedir(), ".valoride", "hooks"),
      join(this.cwd, ".valoride", "hooks"),
      join(this.cwd, ".clinerules", "hooks"),
      ...this.extraHookDirs,
    ];
  }

  private async executeHookScript(
    scriptPath: string,
    payload: ValorIDEHookPayload,
  ): Promise<ValorIDEHookControl | undefined> {
    const { command, args } = getHookCommand(scriptPath);
    const body = JSON.stringify(payload);

    return new Promise((resolve) => {
      const child = spawn(command, args, {
        cwd: this.cwd,
        env: {
          ...process.env,
          VALORIDE_HOOK_NAME: payload.hookName,
          VALORIDE_TASK_ID: payload.taskId,
          VALORIDE_WORKSPACE_ROOT: this.cwd,
        },
        stdio: ["pipe", "pipe", "pipe"],
      });
      let stdout = "";
      let stderr = "";
      let settled = false;
      const timeout = setTimeout(() => {
        if (settled) {
          return;
        }
        settled = true;
        child.kill("SIGTERM");
        logHookWarning(`[ValorIDEHookService] Hook timed out: ${scriptPath}`);
        resolve({
          context: `Hook ${payload.hookName} timed out after ${this.timeoutMs}ms.`,
        });
      }, this.timeoutMs);

      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
      child.on("error", (error) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeout);
        logHookWarning(
          `[ValorIDEHookService] Hook failed to start ${scriptPath}: ${error.message}`,
        );
        resolve({
          context: `Hook ${payload.hookName} failed to start: ${error.message}`,
        });
      });
      child.on("close", (code) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeout);
        if (code !== 0) {
          const detail = stderr.trim() || stdout.trim() || `exit code ${code}`;
          logHookWarning(
            `[ValorIDEHookService] Hook exited non-zero ${scriptPath}: ${detail}`,
          );
          resolve({
            context: `Hook ${payload.hookName} exited non-zero: ${detail}`,
          });
          return;
        }
        resolve(parseHookControl(stdout));
      });

      child.stdin.end(body);
    });
  }
}

const getHookCommand = (
  scriptPath: string,
): { command: string; args: string[] } => {
  const extension = extname(scriptPath).toLowerCase();
  switch (extension) {
    case ".js":
    case ".mjs":
    case ".cjs":
      return { command: process.execPath, args: [scriptPath] };
    case ".py":
      return { command: "python3", args: [scriptPath] };
    case ".sh":
    case ".bash":
      return { command: "bash", args: [scriptPath] };
    case ".zsh":
      return { command: "zsh", args: [scriptPath] };
    default:
      return { command: scriptPath, args: [] };
  }
};

const getHooksEnabledFromConfiguration = (): boolean | undefined => {
  try {
    return vscode.workspace
      .getConfiguration("valoride.hooks")
      .get<boolean>("enabled", false);
  } catch {
    return undefined;
  }
};
