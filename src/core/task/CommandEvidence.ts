import { createHash } from "node:crypto";
import type { TaskVerificationGate } from "@shared/TaskSummary";

/** Only the runtime's leading result line can supply an exit code. Output/prose cannot. */
export const commandResultExitCode = (result: unknown): number | undefined => {
  if (typeof result !== "string") return undefined;
  const match = result.match(
    /^Command (?:executed|completed)(?: \([^\n]*\))? with exit code (-?\d+)\.(?:\r?\n|$)/,
  );
  return match ? Number(match[1]) : undefined;
};

/** A compound shell command cannot prove separate quality gates. */
export const verificationGateForCommand = (
  command: string,
): TaskVerificationGate | undefined => {
  const normalized = command.trim();
  if (/[;&|`<>\n]|\$\(/.test(normalized)) return undefined;
  const script = normalized.match(
    /^(?:npm|pnpm|yarn)\s+(?:run\s+)?(test(?::[\w-]+)?|build(?::[\w-]+)?|compile|typecheck|check-types(?::[\w-]+)?|lint)\b/,
  )?.[1];
  if (
    script?.startsWith("test") ||
    /^(?:npx\s+)?(?:jest|vitest|pytest|playwright)\b/.test(normalized)
  )
    return "tests";
  if (script?.startsWith("build") || script === "compile") return "build";
  if (
    script?.startsWith("check-types") ||
    script === "typecheck" ||
    /^(?:npx\s+)?tsc\b/.test(normalized)
  )
    return "typecheck";
  if (script === "lint" || /^(?:npx\s+)?eslint\b/.test(normalized))
    return "lint";
  return undefined;
};

const canonicalResult = (result: unknown): string =>
  typeof result === "string" ? result : JSON.stringify(result ?? null);

/**
 * Builds an opaque reference to one command result observed by the runtime.
 * The command and output remain in the task history; only their digest crosses
 * the SWARM terminal boundary.
 */
export const buildCommandEvidenceRef = (
  command: string,
  result: unknown,
): string => {
  const digest = createHash("sha256")
    .update(command.trim(), "utf8")
    .update("\0", "utf8")
    .update(canonicalResult(result), "utf8")
    .digest("hex");
  return `valoride-command:${digest}`;
};
