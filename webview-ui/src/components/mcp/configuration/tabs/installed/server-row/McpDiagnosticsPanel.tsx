import React from "react";
import { McpServer, McpServerLogEntry } from "@shared/mcp";

const formatTimestamp = (value?: string): string => {
  if (!value) {
    return "Not recorded";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const lifecycleRows = (server: McpServer) => [
  ["Started", server.lastStartedAt],
  ["Connected", server.lastConnectedAt],
  ["Disconnected", server.lastDisconnectedAt],
  ["Timeout", server.timeout ? `${server.timeout} seconds` : "Default timeout"],
];

const logColor = (level: McpServerLogEntry["level"]) => {
  switch (level) {
    case "error":
      return "var(--vscode-testing-iconFailed)";
    case "warn":
      return "var(--vscode-charts-yellow)";
    case "info":
      return "var(--vscode-descriptionForeground)";
  }
};

const McpDiagnosticsPanel = ({ server }: { server: McpServer }) => {
  const logs = server.logs ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div
        style={{
          display: "grid",
          gap: 6,
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          marginTop: 8,
        }}
      >
        {lifecycleRows(server).map(([label, value]) => (
          <div
            key={label}
            style={{
              border: "1px solid var(--vscode-input-border)",
              borderRadius: 4,
              padding: "6px 8px",
            }}
          >
            <div style={{ color: "var(--vscode-descriptionForeground)" }}>
              {label}
            </div>
            <div style={{ overflowWrap: "anywhere" }}>
              {label === "Timeout" ? value : formatTimestamp(value)}
            </div>
          </div>
        ))}
      </div>

      {logs.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {logs.map((log, index) => (
            <div
              key={`${log.timestamp}-${index}`}
              style={{
                borderLeft: `3px solid ${logColor(log.level)}`,
                padding: "4px 8px",
              }}
            >
              <div
                style={{
                  color: "var(--vscode-descriptionForeground)",
                  display: "flex",
                  gap: 8,
                }}
              >
                <span>{formatTimestamp(log.timestamp)}</span>
                <span>{log.source}</span>
                <span>{log.level}</span>
              </div>
              <div style={{ overflowWrap: "anywhere", whiteSpace: "pre-wrap" }}>
                {log.message}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            color: "var(--vscode-descriptionForeground)",
            padding: "10px 0",
          }}
        >
          No diagnostic logs recorded
        </div>
      )}
    </div>
  );
};

export default McpDiagnosticsPanel;
