import * as vscode from "vscode";

export interface OpenUrlDeps {
  commands: Pick<typeof vscode.commands, "executeCommand">;
  env: Pick<typeof vscode.env, "openExternal">;
  Uri: Pick<typeof vscode.Uri, "parse">;
}

const DEFAULT_DEPS: OpenUrlDeps = {
  commands: vscode.commands,
  env: vscode.env,
  Uri: vscode.Uri,
};

export function normalizeUrl(rawUrl: string): string | null {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();

  // Disallow javascript: and other non-http(s) schemes
  if (/^javascript:/i.test(trimmed)) return null;

  const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed);
  const urlToParse = hasScheme ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(urlToParse);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.toString();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Attempt to open a URL inside VS Code's Simple Browser, falling back to the system browser.
 * Returns true if a navigation attempt was made, false if the URL was invalid.
 */
export async function openUrlWithSimpleBrowser(
  rawUrl: string,
  title?: string,
  deps: OpenUrlDeps = DEFAULT_DEPS,
): Promise<boolean> {
  const normalized = normalizeUrl(rawUrl);
  if (!normalized) {
    return false;
  }

  const commandCandidates = ["simpleBrowser.open", "simpleBrowser.show"];

  for (const command of commandCandidates) {
    try {
      await deps.commands.executeCommand(command, normalized, title);
      return true;
    } catch {
      // Try the next command
    }
  }

  try {
    await deps.env.openExternal(deps.Uri.parse(normalized));
    return true;
  } catch (error) {
    console.error("Failed to open URL", normalized, error);
    return false;
  }
}
