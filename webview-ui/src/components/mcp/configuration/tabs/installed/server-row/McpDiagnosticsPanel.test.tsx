import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { McpServer } from "@shared/mcp";
import McpDiagnosticsPanel from "./McpDiagnosticsPanel";

describe("McpDiagnosticsPanel", () => {
  it("renders MCP lifecycle timestamps and recent logs", () => {
    const server: McpServer = {
      config: "{}",
      lastConnectedAt: "2026-05-13T19:01:00.000Z",
      lastStartedAt: "2026-05-13T19:00:00.000Z",
      logs: [
        {
          level: "info",
          message: "Starting MCP server",
          source: "lifecycle",
          timestamp: "2026-05-13T19:00:00.000Z",
        },
        {
          level: "error",
          message: "missing token",
          source: "stderr",
          timestamp: "2026-05-13T19:00:03.000Z",
        },
      ],
      name: "github",
      status: "connected",
      timeout: 60,
    };

    render(<McpDiagnosticsPanel server={server} />);

    expect(screen.getByText("Started")).toBeInTheDocument();
    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(screen.getByText("60 seconds")).toBeInTheDocument();
    expect(screen.getByText("Starting MCP server")).toBeInTheDocument();
    expect(screen.getByText("missing token")).toBeInTheDocument();
    expect(screen.getByText("stderr")).toBeInTheDocument();
  });

  it("shows an empty-state when no diagnostics have been recorded", () => {
    render(
      <McpDiagnosticsPanel
        server={{
          config: "{}",
          name: "empty",
          status: "disconnected",
        }}
      />,
    );

    expect(screen.getByText("No diagnostic logs recorded")).toBeInTheDocument();
  });
});
