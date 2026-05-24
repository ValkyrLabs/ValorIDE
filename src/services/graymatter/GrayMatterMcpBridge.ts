import { spawn } from "node:child_process";
import * as vscode from "vscode";
import { McpHub, McpServerConfig } from "@services/mcp/McpHub";

export interface GrayMatterMcpBridgeOptions {
  logger?: Pick<vscode.OutputChannel, "appendLine">;
  token?: string;
}

const SERVER_NAME = "graymatter-memory";

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

    const config = await this.resolveServerConfig();
    await hub.upsertServerConfig(SERVER_NAME, config);
    this.registered = true;
    this.options.logger?.appendLine(
      "[GrayMatterMcpBridge] Registered built-in GrayMatter MCP server.",
    );
  }

  async unregister(hub: McpHub): Promise<void> {
    await hub.deleteServer(SERVER_NAME);
    this.registered = false;
  }

  isRegistered(): boolean {
    return this.registered;
  }

  private async resolveServerConfig(): Promise<McpServerConfig> {
    try {
      const activated = await runGrayMatterActivation();
      if (activated) {
        return activated;
      }
    } catch (error) {
      this.options.logger?.appendLine(
        `[GrayMatterMcpBridge] gm-activate unavailable, falling back to stdio config: ${String(error)}`,
      );
    }

    return {
      args: ["gm-activate", "--mode", "mcp", "--workspace", "auto"],
      autoApprove: [
        "mcp_graymatter_memory_read",
        "mcp_graymatter_memory_query",
        "mcp_graymatter_schema_summary",
        "mcp_graymatter_show_graymatter_overview",
      ],
      command: "npx",
      disabled: false,
      timeout: 30,
      transportType: "stdio",
    };
  }
}

const runGrayMatterActivation = async (): Promise<
  McpServerConfig | undefined
> =>
  new Promise((resolve, reject) => {
    const child = spawn(
      "gm-activate",
      ["--mode", "mcp", "--workspace", "auto"],
      {
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `gm-activate exited with code ${code}`));
        return;
      }
      try {
        const parsed = JSON.parse(stdout);
        const config = parsed?.mcpServers?.[SERVER_NAME] ?? parsed;
        resolve(config as McpServerConfig);
      } catch {
        resolve(undefined);
      }
    });
  });
