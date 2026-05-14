import {
  McpServer,
  McpServerLogEntry,
  McpServerLogLevel,
  McpServerLogSource,
} from "@shared/mcp";

const MAX_MCP_LOG_ENTRIES = 50;

export interface AppendMcpServerLogInput {
  level: McpServerLogLevel;
  message: string;
  source: McpServerLogSource;
}

export const appendMcpServerLog = (
  server: McpServer,
  input: AppendMcpServerLogInput,
  now: () => string = () => new Date().toISOString(),
): McpServer => {
  const entry: McpServerLogEntry = {
    ...input,
    message: input.message.trim(),
    timestamp: now(),
  };
  const logs = [...(server.logs ?? []), entry].slice(-MAX_MCP_LOG_ENTRIES);
  return {
    ...server,
    error:
      input.level === "error"
        ? [server.error, entry.message].filter(Boolean).join("\n")
        : server.error,
    logs,
  };
};

export const markMcpServerStatus = (
  server: McpServer,
  status: McpServer["status"],
  now: () => string = () => new Date().toISOString(),
): McpServer => {
  const timestamp = now();
  return {
    ...server,
    lastConnectedAt:
      status === "connected" ? timestamp : server.lastConnectedAt,
    lastDisconnectedAt:
      status === "disconnected" ? timestamp : server.lastDisconnectedAt,
    lastStartedAt: status === "connecting" ? timestamp : server.lastStartedAt,
    status,
  };
};
