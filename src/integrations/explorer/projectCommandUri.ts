import type { Uri } from "vscode";

type ProjectCommandTarget = {
  uri?: unknown;
  resourceUri?: unknown;
};

function isUri(value: unknown): value is Uri {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<Uri>;
  return (
    typeof candidate.scheme === "string" &&
    typeof candidate.fsPath === "string"
  );
}

/**
 * Tree item context commands receive the underlying tree element, while
 * programmatic command calls commonly pass a Uri directly.
 */
export function resolveProjectCommandUri(
  ...candidates: unknown[]
): Uri | undefined {
  for (const candidate of candidates) {
    if (isUri(candidate)) return candidate;
    if (!candidate || typeof candidate !== "object") continue;

    const target = candidate as ProjectCommandTarget;
    if (isUri(target.uri)) return target.uri;
    if (isUri(target.resourceUri)) return target.resourceUri;
  }

  return undefined;
}
