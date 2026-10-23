import * as path from "node:path";

const GRAYMATTER_SERVER_NAMES = new Set(["graymatter", "graymatter-memory"]);
const INVARIANT_PREFLIGHT_TOOL = "graymatter_invariant_preflight";

const nonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

export const deriveGrayMatterWorkspaceKey = (
  workspaceRoots: readonly string[] = [],
): string | undefined => {
  const root = workspaceRoots.find(nonEmptyString);
  if (!root) return undefined;
  const resolved = path.resolve(root);
  const workspaceKey = path.basename(resolved).trim();
  return workspaceKey || undefined;
};

/**
 * GrayMatter invariant preflight accepts either workspaceKey or sourceChannel.
 * JSON Schema cannot mark one specific alternative required, so small/local
 * models may legally emit an empty argument object. The host already knows the
 * active workspace and should supply that infrastructure scope deterministically.
 */
export const scopeGrayMatterMcpArguments = (
  serverName: string,
  toolName: string,
  toolArguments: Record<string, unknown> | undefined,
  workspaceRoots: readonly string[] = [],
): Record<string, unknown> | undefined => {
  if (
    !GRAYMATTER_SERVER_NAMES.has(serverName) ||
    toolName !== INVARIANT_PREFLIGHT_TOOL
  ) {
    return toolArguments;
  }

  const args = { ...(toolArguments ?? {}) };
  if (nonEmptyString(args.workspaceKey) || nonEmptyString(args.sourceChannel)) {
    return args;
  }

  const workspaceKey = deriveGrayMatterWorkspaceKey(workspaceRoots);
  return workspaceKey ? { ...args, workspaceKey } : args;
};
