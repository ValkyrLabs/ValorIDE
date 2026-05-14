import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CapabilityCommandCenter from "./CapabilityCommandCenter";

const mockUseExtensionState = vi.fn();

vi.mock("@thorapi/context/ExtensionStateContext", () => ({
  useExtensionState: () => mockUseExtensionState(),
}));

describe("CapabilityCommandCenter", () => {
  beforeEach(() => {
    mockUseExtensionState.mockReset();
  });

  it("summarizes authenticated agentic connections and recent command audit", () => {
    mockUseExtensionState.mockReturnValue({
      apiConfiguration: {
        apiProvider: "openai-native",
        apiModelId: "gpt-5.5",
        valkyraiHost: "https://api-0.valkyrlabs.com/v1",
      },
      authenticatedUser: {
        username: "jm",
        email: "john@example.com",
      },
      userInfo: {
        username: "ignored",
      },
      grayMatterSession: {
        status: "ready",
        baseUrl: "https://api-0.valkyrlabs.com/v1",
        capabilities: {
          memoryQuery: true,
          memoryWrite: true,
          swarmOps: true,
          swarmGraph: true,
        },
        checkedAt: "2026-05-13T17:00:00.000Z",
      },
      mcpServers: [
        {
          name: "filesystem",
          config: "{}",
          status: "connected",
          tools: [{ name: "read_file" }],
        },
        {
          name: "broken",
          config: "{}",
          status: "disconnected",
          error: "missing token",
        },
      ],
      agenticState: {
        approvalPolicy: "ask",
        swarm: {
          status: "online",
          instanceId: "valoride-local-1",
          lastAckAt: "2026-05-13T17:01:00.000Z",
          capabilities: ["graymatter.memory", "terminal.execute"],
        },
        recentCommands: [
          {
            commandId: "cmd-1",
            capabilityId: "terminal.execute",
            source: "swarm",
            status: "completed",
            startedAt: "2026-05-13T17:00:30.000Z",
            completedAt: "2026-05-13T17:00:31.000Z",
            elapsedMs: 1000,
            approved: true,
            requiresApproval: true,
            toolLabel: "Shell",
          },
        ],
      },
    });

    render(<CapabilityCommandCenter />);

    expect(screen.getByText("jm")).toBeInTheDocument();
    expect(screen.getByText("api-0.valkyrlabs.com")).toBeInTheDocument();
    expect(screen.getByText("openai-native / gpt-5.5")).toBeInTheDocument();
    expect(screen.getByText("GrayMatter Ready")).toBeInTheDocument();
    expect(
      screen.getByText("memory query, memory write, swarm ops, swarm graph"),
    ).toBeInTheDocument();
    expect(screen.getByText("SWARM Online")).toBeInTheDocument();
    expect(screen.getByText("valoride-local-1")).toBeInTheDocument();
    expect(screen.getByText("MCP 1/2")).toBeInTheDocument();
    expect(screen.getByText("terminal.execute")).toBeInTheDocument();
    expect(screen.getByText("completed in 1.0s")).toBeInTheDocument();
  });

  it("renders degraded statuses without crashing when extension state is partial", () => {
    mockUseExtensionState.mockReturnValue({
      apiConfiguration: {
        apiProvider: "ollama",
        ollamaModelId: "gemma4:26b",
      },
      grayMatterSession: {
        status: "unauthenticated",
        capabilities: {
          memoryQuery: false,
          memoryWrite: false,
          swarmOps: false,
          swarmGraph: false,
        },
        checkedAt: "2026-05-13T17:00:00.000Z",
      },
      mcpServers: undefined,
      agenticState: undefined,
    });

    render(<CapabilityCommandCenter />);

    expect(screen.getByText("Not signed in")).toBeInTheDocument();
    expect(screen.getByText("ollama / gemma4:26b")).toBeInTheDocument();
    expect(screen.getByText("GrayMatter Sign in needed")).toBeInTheDocument();
    expect(screen.getByText("SWARM Offline")).toBeInTheDocument();
    expect(screen.getByText("MCP 0/0")).toBeInTheDocument();
    expect(screen.getByText("No recent remote commands")).toBeInTheDocument();
  });
});
