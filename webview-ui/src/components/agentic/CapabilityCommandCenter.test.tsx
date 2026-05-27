import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import CapabilityCommandCenter, {
  getRecoveryActions,
  type AgenticCapability,
} from "./CapabilityCommandCenter";
import * as vscodeModule from "../../utils/vscode";

vi.mock("../../utils/vscode", () => ({
  vscode: { postMessage: vi.fn() },
}));

const degradedCapabilities: AgenticCapability[] = [
  {
    id: "memory",
    label: "GrayMatter",
    status: "unauthenticated",
    workspaceId: "ws_123",
  },
  { id: "credits", label: "Credits", status: "quota", projectId: "proj_456" },
  { id: "rbac", label: "Team access", status: "forbidden" },
  { id: "mcp", label: "MCP", status: "mcp_disconnected" },
  { id: "swarm", label: "SWARM", status: "swarm_error" },
  { id: "api", label: "ValkyrAI API", status: "unavailable" },
];

describe("CapabilityCommandCenter", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders at least one recovery action for every degraded status", () => {
    for (const capability of degradedCapabilities) {
      expect(getRecoveryActions(capability)).not.toHaveLength(0);
    }
  });

  it.each([
    ["unauthenticated", "Sign in", { type: "accountLoginClicked" }],
    ["quota", "Buy credits", { type: "openInBrowser", url: "/buy-credits" }],
    [
      "forbidden",
      "Request access",
      { type: "openInBrowser", url: "/valoride/access-request" },
    ],
    ["mcp_disconnected", "Retry MCP", { type: "fetchLatestMcpServersFromHub" }],
    [
      "swarm_error",
      "Run diagnostics",
      { type: "displayVSCodeInfo", text: "Run ValorIDE diagnostics" },
    ],
    [
      "unavailable",
      "Run diagnostics",
      { type: "displayVSCodeInfo", text: "Run ValorIDE diagnostics" },
    ],
  ] as const)(
    "dispatches primary recovery for %s capabilities",
    (_status, label, expectedMessage) => {
      const capability = degradedCapabilities.find(
        (candidate) => candidate.status === _status,
      );
      expect(capability).toBeDefined();
      render(
        <CapabilityCommandCenter
          capabilities={[capability!]}
          returnTo="valoride://task/abc"
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: label }));
      expect(vscodeModule.vscode.postMessage).toHaveBeenCalledWith(
        expect.objectContaining(
          Object.fromEntries(
            Object.entries(expectedMessage).map(([key, value]) => [
              key,
              key === "url" || key === "text"
                ? expect.stringContaining(value)
                : value,
            ]),
          ),
        ),
      );
    },
  );

  it("routes quota failures to buy credits with ValorIDE context", () => {
    render(
      <CapabilityCommandCenter
        capabilities={[degradedCapabilities[1]]}
        returnTo="valoride://task/abc"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Buy credits" }));
    expect(vscodeModule.vscode.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining("projectId=proj_456"),
      }),
    );
    expect(vscodeModule.vscode.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining("source=valoride"),
      }),
    );
  });

  it("renders compact CTAs for MCP, SWARM, RBAC, and unavailable states", () => {
    render(
      <CapabilityCommandCenter capabilities={degradedCapabilities.slice(2)} />,
    );
    expect(
      screen.getByRole("button", { name: "Request access" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Retry MCP" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Run diagnostics" }),
    ).toHaveLength(2);
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type React from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@vscode/webview-ui-toolkit/react", () => ({
  VSCodeButton: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

import CapabilityCommandCenter, {
  CapabilitySnapshot,
  deriveCapabilityCards,
} from "./CapabilityCommandCenter";

const degradedSnapshots: CapabilitySnapshot[] = [
  { id: "graymatter", label: "GrayMatter", status: "unauthenticated" },
  { id: "graymatter", label: "GrayMatter RBAC", status: "rbacDenied" },
  { id: "graymatter", label: "GrayMatter quota", status: "quotaBlocked" },
  { id: "graymatter", label: "GrayMatter unavailable", status: "unavailable" },
  { id: "mcp", label: "MCP", status: "disconnected" },
  { id: "swarm", label: "SWARM", status: "offline" },
];

describe("CapabilityCommandCenter", () => {
  it("maps every degraded capability state to a recovery or upsell action", () => {
    const cards = deriveCapabilityCards(degradedSnapshots);

    const unauthenticatedCard = cards.find(
      (card) => card.status === "unauthenticated",
    );

    expect(unauthenticatedCard?.actions.map((action) => action.action)).toContain(
      "signIn",
    );
    expect(unauthenticatedCard?.actions.map((action) => action.label)).toEqual(
      expect.arrayContaining(["Sign in to ValkyrAI", "Create workspace"]),
    );
    expect(
      cards
        .find((card) => card.status === "rbacDenied")
        ?.actions.map((action) => action.action),
    ).toContain("teamPlan");
    expect(
      cards
        .find((card) => card.status === "quotaBlocked")
        ?.actions.map((action) => action.action),
    ).toContain("buyCredits");
    expect(
      cards
        .find((card) => card.status === "unavailable")
        ?.actions.map((action) => action.action),
    ).toContain("openDiagnostics");
    expect(
      cards
        .find((card) => card.status === "disconnected")
        ?.actions.map((action) => action.action),
    ).toContain("openMcpMarketplace");
    expect(
      cards
        .find((card) => card.status === "offline")
        ?.actions.map((action) => action.action),
    ).toContain("openDiagnostics");
  });

  it("renders latest command failure detail without secret-looking payloads", () => {
    render(
      <CapabilityCommandCenter
        snapshots={[
          {
            id: "graymatter",
            label: "GrayMatter",
            status: "quotaBlocked",
            latestFailure: {
              command: "memory.write",
              message: "Quota exceeded. Retry after adding credits.",
            },
          },
        ]}
        onAction={() => undefined}
      />,
    );

    expect(screen.getByText(/Latest failure:/)).toBeInTheDocument();
    expect(screen.getByText(/memory.write/)).toBeInTheDocument();
    expect(screen.queryByText(/jwt|token|secret/i)).not.toBeInTheDocument();
  });

  it("emits attributed action context when a recovery button is clicked", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();

    render(
      <CapabilityCommandCenter
        snapshots={[{ id: "mcp", label: "MCP", status: "disconnected" }]}
        onAction={onAction}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /Open MCP marketplace/i }),
    );

    expect(onAction).toHaveBeenCalledWith(
      "openMcpMarketplace",
      expect.objectContaining({ id: "mcp", status: "disconnected" }),
    );
  });
});
