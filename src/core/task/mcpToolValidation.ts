import type { McpServer, McpTool } from "@shared/mcp";

export type McpToolValidationResult =
  | {
      ok: true;
      server: McpServer;
      tool: McpTool;
    }
  | {
      ok: false;
      error: string;
    };

export function validateMcpToolCall(
  servers: McpServer[],
  serverName: string,
  toolName: string,
  toolArguments?: Record<string, unknown>,
): McpToolValidationResult {
  const server = servers.find((entry) => entry.name === serverName);
  if (!server) {
    const connectedServers = servers
      .filter((entry) => entry.status === "connected" && !entry.disabled)
      .map((entry) => entry.name);
    const available =
      connectedServers.length > 0
        ? `Connected servers: ${connectedServers.join(", ")}.`
        : "No MCP servers are connected.";
    return {
      ok: false,
      error: `Unknown MCP server "${serverName}". ${available}`,
    };
  }

  if (!server.tools || server.tools.length === 0) {
    return {
      ok: false,
      error: `MCP server "${serverName}" has no available tools.`,
    };
  }

  const tool = server.tools.find((entry) => entry.name === toolName);
  if (!tool) {
    const availableTools = server.tools.map((entry) => entry.name);
    return {
      ok: false,
      error: `Unknown MCP tool "${toolName}" for server "${serverName}". Available tools: ${availableTools.join(", ")}.`,
    };
  }

  const missingArgs = getMissingRequiredArgs(tool.inputSchema, toolArguments);
  if (missingArgs.length > 0) {
    return {
      ok: false,
      error: `Missing required arguments for "${toolName}" on "${serverName}": ${missingArgs.join(", ")}.`,
    };
  }

  return {
    ok: true,
    server,
    tool,
  };
}

const getMissingRequiredArgs = (
  inputSchema: McpTool["inputSchema"],
  toolArguments?: Record<string, unknown>,
): string[] => {
  if (!inputSchema || typeof inputSchema !== "object") {
    return [];
  }

  const required = Array.isArray((inputSchema as { required?: unknown }).required)
    ? ((inputSchema as { required?: unknown }).required as unknown[])
    : [];
  const requiredKeys = required.filter((key) => typeof key === "string") as string[];
  if (requiredKeys.length === 0) {
    return [];
  }

  const args = toolArguments ?? {};
  return requiredKeys.filter((key) => !(key in args));
};
