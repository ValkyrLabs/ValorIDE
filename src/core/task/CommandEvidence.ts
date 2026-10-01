import { createHash } from "node:crypto";

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
