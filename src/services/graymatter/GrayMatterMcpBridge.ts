import { constants as fsConstants } from "node:fs";
import { access, readdir, readFile } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import * as vscode from "vscode";
import { McpHub, McpServerConfig } from "@services/mcp/McpHub";

export interface GrayMatterMcpBridgeOptions {
  logger?: Pick<vscode.OutputChannel, "appendLine">;
  token?: string;
}

const SERVER_NAME = "graymatter-memory";
const LAUNCHER_RELATIVE_PATH = path.join("scripts", "gm-mcp-launcher");

const READ_ONLY_TOOLS = [
  "memory_read",
  "memory_query",
  "memory_retrieve_with_receipt",
  "retrieval_receipt_get",
  "retrieval_receipt_query",
  "graymatter_invariant_preflight",
  "graymatter_status",
  "schema_summary",
];

const canExecute = async (candidate: string): Promise<boolean> => {
  try {
    await access(
      candidate,
      process.platform === "win32" ? fsConstants.F_OK : fsConstants.X_OK,
    );
    return true;
  } catch {
    return false;
  }
};

const pluginRootsFromVersionDirectory = async (
  directory: string,
): Promise<string[]> => {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(directory, entry.name))
      .sort((left, right) => right.localeCompare(left));
  } catch {
    return [];
  }
};

export const grayMatterPluginRootCandidates = async (
  home = os.homedir(),
): Promise<string[]> => {
  const explicit = [
    process.env.VALORIDE_GRAYMATTER_PLUGIN_ROOT,
    process.env.GRAYMATTER_PLUGIN_ROOT,
    process.env.GRAYMATTER_HOME,
  ].filter((value): value is string => Boolean(value));
  const codexVersions = await pluginRootsFromVersionDirectory(
    path.join(home, ".codex", "plugins", "cache", "graymatter", "graymatter"),
  );
  return [
    ...explicit,
    ...codexVersions,
    path.join(home, ".openclaw", "skills", "graymatter"),
    path.join(home, ".claude", "skills", "graymatter"),
    path.join(home, ".valoride", "plugins", "graymatter"),
    path.join(home, "GrayMatter"),
  ];
};

export const findGrayMatterMcpLauncher = async (
  roots?: string[],
): Promise<string | undefined> => {
  for (const root of roots ?? (await grayMatterPluginRootCandidates())) {
    const launcher = path.join(root, LAUNCHER_RELATIVE_PATH);
    if (await canExecute(launcher)) return launcher;
  }
  return undefined;
};

export const grayMatterMcpConfig = (launcher: string): McpServerConfig => ({
  args: ["--stdio"],
  autoApprove: READ_ONLY_TOOLS,
  command: launcher,
  disabled: false,
  timeout: 60,
  transportType: "stdio",
});

const isBrokenLegacyConfig = (value: unknown): boolean => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { command?: unknown; args?: unknown };
  return (
    candidate.command === "npx" &&
    Array.isArray(candidate.args) &&
    candidate.args[0] === "gm-activate"
  );
};

const deleteBrokenLegacyConfig = async (hub: McpHub): Promise<boolean> => {
  const settingsPath = await hub.getMcpSettingsFilePath();
  try {
    const settings = JSON.parse(await readFile(settingsPath, "utf8"));
    if (isBrokenLegacyConfig(settings?.mcpServers?.[SERVER_NAME])) {
      await hub.deleteServer(SERVER_NAME);
      return true;
    }
  } catch {
    // McpHub owns malformed-settings reporting; do not overwrite user data here.
  }
  return false;
};

export class GrayMatterMcpBridge {
  private registered = false;

  constructor(private readonly options: GrayMatterMcpBridgeOptions = {}) {}

  async register(hub: McpHub): Promise<void> {
    if (
      !vscode.workspace
        .getConfiguration("valoride.graymatter")
        .get("mcpEnabled", true)
    ) {
      return;
    }

    const launcher = await findGrayMatterMcpLauncher();
    if (!launcher) {
      const repaired = await deleteBrokenLegacyConfig(hub);
      const message =
        "GrayMatter MCP is not installed. Install the GrayMatter plugin/skill, then retry; ValorIDE will use scripts/gm-mcp-launcher --stdio.";
      this.options.logger?.appendLine(
        `[GrayMatterMcpBridge] ${message}${repaired ? " Removed obsolete npx gm-activate configuration." : ""}`,
      );
      void vscode.window.showWarningMessage(message);
      return;
    }

    await hub.upsertServerConfig(SERVER_NAME, grayMatterMcpConfig(launcher));
    this.registered = true;
    this.options.logger?.appendLine(
      `[GrayMatterMcpBridge] Registered canonical GrayMatter MCP launcher: ${launcher}`,
    );
  }

  async unregister(hub: McpHub): Promise<void> {
    await hub.deleteServer(SERVER_NAME);
    this.registered = false;
  }

  isRegistered(): boolean {
    return this.registered;
  }
}
