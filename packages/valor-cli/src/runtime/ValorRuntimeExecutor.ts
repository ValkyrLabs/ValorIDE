import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import process from "node:process";

export type ValorRuntimeMode = "plan" | "act";

export type ValorRuntimeResult = {
  eventCount: number;
  output: string;
  status: "completed";
  terminalMessage?: string;
};

const MAX_CAPTURE_CHARS = 1_000_000;

function commandPath(name: string): string | null {
  const lookup = spawnSync(process.platform === "win32" ? "where" : "which", [name], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return lookup.status === 0
    ? lookup.stdout.trim().split(/\r?\n/)[0] || null
    : null;
}

export function discoverRuntimeExecutable(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  if (env.VALOR_RUNTIME_EXECUTABLE) return env.VALOR_RUNTIME_EXECUTABLE;
  const desktopCodex = "/Applications/ChatGPT.app/Contents/Resources/codex";
  if (process.platform === "darwin" && fs.existsSync(desktopCodex)) return desktopCodex;
  return commandPath("codex");
}

export function buildRuntimeInvocation({
  description,
  executable,
  mode,
  workspace,
}: {
  description: string;
  executable: string;
  mode: ValorRuntimeMode;
  workspace: string;
}): { executable: string; args: string[] } {
  const guard = [
    "Execute this task as the headless ValorIDE runtime.",
    mode === "plan"
      ? "Plan and inspect only. Do not modify the workspace."
      : "Execute the requested task within the workspace.",
    "Never send outbound messages, deploy to production, or merge changes without a separately correlated human approval receipt.",
    "Preserve unrelated changes and return concise verification evidence.",
    "",
    description,
  ].join("\n");
  return {
    executable,
    args: [
      "exec",
      "--json",
      "--ephemeral",
      "--sandbox",
      mode === "plan" ? "read-only" : "workspace-write",
      "--skip-git-repo-check",
      "-C",
      workspace,
      guard,
    ],
  };
}

function appendBounded(current: string, next: string): string {
  const combined = `${current}${next}`;
  return combined.length <= MAX_CAPTURE_CHARS
    ? combined
    : combined.slice(combined.length - MAX_CAPTURE_CHARS);
}

function terminalAgentMessage(output: string): { eventCount: number; text?: string } {
  let eventCount = 0;
  let text: string | undefined;
  for (const line of output.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line);
      eventCount += 1;
      if (event?.type === "item.completed" && event?.item?.type === "agent_message") {
        text = String(event.item.text ?? "").trim() || text;
      }
    } catch {
      // Raw provider output is still streamed to the caller.
    }
  }
  return { eventCount, text };
}

export class ValorRuntimeExecutor {
  constructor(
    private readonly env: NodeJS.ProcessEnv = process.env,
    private readonly spawnImpl: typeof spawn = spawn,
  ) {}

  async execute(
    description: string,
    mode: ValorRuntimeMode,
    workspace = process.cwd(),
  ): Promise<ValorRuntimeResult> {
    const executable = discoverRuntimeExecutable(this.env);
    if (!executable) {
      throw new Error(
        "No supported ValorIDE model runtime is installed; install Codex or set VALOR_RUNTIME_EXECUTABLE",
      );
    }
    const invocation = buildRuntimeInvocation({ description, executable, mode, workspace });
    const timeoutSeconds = Math.max(
      30,
      Math.min(3_600, Number(this.env.VALOR_RUNTIME_TIMEOUT_SECONDS) || 600),
    );

    return new Promise((resolve, reject) => {
      const child = this.spawnImpl(invocation.executable, invocation.args, {
        cwd: workspace,
        env: this.env,
        stdio: ["ignore", "pipe", "pipe"],
      });
      let stdout = "";
      let stderr = "";
      const timer = setTimeout(() => child.kill("SIGTERM"), timeoutSeconds * 1_000);
      child.stdout.on("data", (chunk) => {
        const text = String(chunk);
        stdout = appendBounded(stdout, text);
        process.stdout.write(text);
      });
      child.stderr.on("data", (chunk) => {
        const text = String(chunk);
        stderr = appendBounded(stderr, text);
        process.stderr.write(text);
      });
      child.once("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.once("close", (code, signal) => {
        clearTimeout(timer);
        if (code !== 0) {
          reject(
            new Error(
              `Valor runtime exited ${code ?? signal ?? "unknown"}: ${stderr.slice(-500)}`,
            ),
          );
          return;
        }
        const terminal = terminalAgentMessage(stdout);
        resolve({
          eventCount: terminal.eventCount,
          output: stdout,
          status: "completed",
          terminalMessage: terminal.text,
        });
      });
    });
  }
}
