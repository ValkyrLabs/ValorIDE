import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CapabilityCommandCenter from "./CapabilityCommandCenter";

const mockUseExtensionState = vi.fn();
const mockPostMessage = vi.fn();

vi.mock("@thorapi/context/ExtensionStateContext", () => ({
  useExtensionState: () => mockUseExtensionState(),
}));

vi.mock("@thorapi/utils/vscode", () => ({
  vscode: {
    postMessage: (...args: unknown[]) => mockPostMessage(...args),
  },
}));

describe("CapabilityCommandCenter", () => {
  beforeEach(() => {
    mockUseExtensionState.mockReset();
    mockPostMessage.mockReset();
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

    expect(screen.queryByText("jm")).not.toBeInTheDocument();
    expect(screen.queryByText("api-0.valkyrlabs.com")).not.toBeInTheDocument();
    expect(screen.queryByText("openai-native / gpt-5.5")).not.toBeInTheDocument();
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

    expect(screen.queryByText("Not signed in")).not.toBeInTheDocument();
    expect(screen.queryByText("ollama / gemma4:26b")).not.toBeInTheDocument();
    expect(screen.getByText("GrayMatter Sign in needed")).toBeInTheDocument();
    expect(screen.getByText("SWARM Offline")).toBeInTheDocument();
    expect(screen.getByText("MCP 0/0")).toBeInTheDocument();
    expect(screen.queryByText("No recent remote commands")).not.toBeInTheDocument();
  });

  it("turns GrayMatter quota blocks into recharge, upgrade, and usage recovery actions", async () => {
    const user = userEvent.setup();
    mockUseExtensionState.mockReturnValue({
      apiConfiguration: {
        apiProvider: "openai-native",
        apiModelId: "gpt-5.5",
        valkyraiHost: "https://api-0.valkyrlabs.com/v1",
      },
      authenticatedUser: {
        username: "jm",
      },
      grayMatterSession: {
        status: "quota",
        balanceCredits: 0,
        estimatedUnlockCredits: 25,
        lastBlockedAction: {
          capabilityId: "graymatter.memory",
          commandId: "cmd-quota-1",
          label: "Recall project memory",
        },
        capabilities: {
          memoryQuery: true,
          memoryWrite: true,
        },
        checkedAt: "2026-05-13T17:00:00.000Z",
      },
      mcpServers: [],
      agenticState: {
        swarm: { status: "online" },
        recentCommands: [
          {
            commandId: "cmd-fallback",
            capabilityId: "terminal.execute",
            source: "swarm",
            status: "failed",
            startedAt: "2026-05-13T17:00:30.000Z",
            approved: true,
            requiresApproval: true,
            toolLabel: "Shell",
          },
        ],
      },
    });

    render(<CapabilityCommandCenter />);

    expect(screen.getByText("GrayMatter Quota blocked")).toBeInTheDocument();
    expect(
      screen.getByText(/GrayMatter is waiting on credits for/i),
    ).toHaveTextContent(
      "GrayMatter is waiting on credits for graymatter.memory. Balance: 0 credits. Estimated unlock: 25 credits.",
    );

    await user.click(screen.getByRole("button", { name: "Recharge credits" }));
    expect(mockPostMessage).toHaveBeenLastCalledWith({
      type: "openInBrowser",
      url: "https://api-0.valkyrlabs.com/buy-credits?source=valoride-graymatter-quota&intent=resume-blocked-action&capability=graymatter.memory&resumeCommand=cmd-quota-1&action=Recall+project+memory",
    });

    await user.click(screen.getByRole("button", { name: "Upgrade plan" }));
    expect(mockPostMessage).toHaveBeenLastCalledWith({
      type: "openInBrowser",
      url: "https://api-0.valkyrlabs.com/pricing?source=valoride-graymatter-quota&intent=resume-blocked-action&capability=graymatter.memory&resumeCommand=cmd-quota-1&action=Recall+project+memory",
    });

    await user.click(screen.getByRole("button", { name: "View usage" }));
    expect(mockPostMessage).toHaveBeenLastCalledWith({
      type: "showAccountViewClicked",
    });
  });

  it("shows sign-in and workspace recovery actions for unauthenticated sessions", async () => {
    const user = userEvent.setup();
    mockUseExtensionState.mockReturnValue({
      apiConfiguration: {
        valkyraiHost: "https://api-0.valkyrlabs.com/v1",
      },
      grayMatterSession: {
        status: "unauthenticated",
      },
      mcpServers: [],
    });

    render(<CapabilityCommandCenter />);

    await user.click(screen.getByRole("button", { name: "Sign in to ValkyrAI" }));
    expect(mockPostMessage).toHaveBeenLastCalledWith({
      type: "accountLoginClicked",
    });

    await user.click(screen.getByRole("button", { name: "Create workspace" }));
    expect(mockPostMessage).toHaveBeenLastCalledWith({
      type: "openInBrowser",
      url: "https://api-0.valkyrlabs.com/signup?source=valoride-graymatter-workspace",
    });
  });

  it("surfaces RBAC, unavailable, and MCP recovery actions", async () => {
    const user = userEvent.setup();
    mockUseExtensionState.mockReturnValue({
      apiConfiguration: {
        valkyraiHost: "https://api-0.valkyrlabs.com/v1",
      },
      grayMatterSession: {
        status: "forbidden",
      },
      mcpServers: [{ name: "broken", status: "disconnected", disabled: false }],
    });

    render(<CapabilityCommandCenter />);

    await user.click(screen.getByRole("button", { name: "Request access" }));
    expect(mockPostMessage).toHaveBeenLastCalledWith({
      type: "openInBrowser",
      url: "https://api-0.valkyrlabs.com/account?source=valoride-graymatter-rbac-request",
    });

    await user.click(screen.getByRole("button", { name: "Open admin RBAC" }));
    expect(mockPostMessage).toHaveBeenLastCalledWith({
      type: "openInBrowser",
      url: "https://api-0.valkyrlabs.com/admin/rbac?source=valoride-graymatter-rbac-admin",
    });

    await user.click(screen.getByRole("button", { name: "Retry discovery" }));
    expect(mockPostMessage).toHaveBeenLastCalledWith({
      type: "fetchLatestMcpServersFromHub",
    });

    await user.click(screen.getByRole("button", { name: "Open MCP setup" }));
    expect(mockPostMessage).toHaveBeenLastCalledWith({
      type: "showMcpView",
      tab: "installed",
    });
  });
});
