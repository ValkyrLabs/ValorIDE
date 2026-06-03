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
  buildCapabilityRecoveryUrl,
  deriveCapabilityCards,
} from "./CapabilityCommandCenter";

const degradedSnapshots: CapabilitySnapshot[] = [
  { id: "graymatter", label: "GrayMatter", status: "unauthenticated" },
  { id: "graymatter", label: "GrayMatter RBAC", status: "rbacDenied" },
  {
    id: "graymatter",
    label: "GrayMatter quota",
    status: "quotaBlocked",
    balanceCredits: 0,
    estimatedUnlockCredits: 5,
    blockedAction: "memory.write",
  },
  { id: "graymatter", label: "GrayMatter unavailable", status: "unavailable" },
  { id: "mcp", label: "MCP", status: "disconnected" },
  { id: "swarm", label: "SWARM", status: "offline" },
];

describe("CapabilityCommandCenter", () => {
  it("maps every degraded capability state to a recovery or upsell action", () => {
    const cards = deriveCapabilityCards(degradedSnapshots);

    expect(
      cards
        .find((card) => card.status === "unauthenticated")
        ?.actions.map((action) => action.action),
    ).toContain("signIn");
    expect(
      cards
        .find((card) => card.status === "unauthenticated")
        ?.actions.map((action) => action.label),
    ).toEqual(expect.arrayContaining(["Sign in to ValkyrAI", "Create workspace"]));
    expect(
      cards
        .find((card) => card.status === "rbacDenied")
        ?.actions.map((action) => action.action),
    ).toContain("upgradePlan");
    expect(
      cards
        .find((card) => card.status === "quotaBlocked")
        ?.actions.map((action) => action.action),
    ).toEqual(
      expect.arrayContaining([
        "rechargeCredits",
        "upgradePlan",
        "viewUsage",
        "retryAfterRecharge",
      ]),
    );
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

  it("renders quota balance, unlock cost, and recharge CTAs", () => {
    render(
      <CapabilityCommandCenter
        snapshots={[degradedSnapshots[2]]}
        onAction={() => undefined}
      />,
    );

    expect(screen.getByText(/memory\.write is paused/i)).toBeInTheDocument();
    expect(screen.getByText(/Balance: 0 credits/i)).toBeInTheDocument();
    expect(screen.getByText(/Estimated unlock: 5 credits/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Recharge credits/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Upgrade plan/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /View usage/i })).toBeInTheDocument();
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
              message: "Quota exceeded with token: abc123. Retry after adding credits.",
            },
          },
        ]}
        onAction={() => undefined}
      />,
    );

    expect(screen.getByText(/Latest failure:/)).toBeInTheDocument();
    expect(screen.getByText(/memory.write/)).toBeInTheDocument();
    expect(screen.getByText(/token=\[redacted\]/i)).toBeInTheDocument();
    expect(screen.queryByText(/abc123/i)).not.toBeInTheDocument();
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

  it("keeps ready capabilities refreshable from the first screen", () => {
    render(
      <CapabilityCommandCenter
        snapshots={[
          { id: "graymatter", label: "GrayMatter", status: "ready" },
          { id: "mcp", label: "MCP", status: "ready" },
          { id: "swarm", label: "SWARM", status: "ready" },
        ]}
        onAction={() => undefined}
      />,
    );

    expect(screen.getAllByRole("button", { name: "Refresh" })).toHaveLength(3);
  });

  it("builds safe recovery URLs with deep-link return context", () => {
    const url = new URL(
      buildCapabilityRecoveryUrl("rechargeCredits", {
        id: "graymatter",
        status: "quotaBlocked",
      }) ?? "",
    );

    expect(url.origin).toBe("https://valkyrlabs.com");
    expect(url.pathname).toBe("/buy-credits");
    expect(url.searchParams.get("intent")).toBe("credit-recovery");
    expect(url.searchParams.get("capability")).toBe("graymatter");
    expect(url.searchParams.get("blockedState")).toBe("quotaBlocked");
    expect(url.searchParams.get("returnTo")).toBe(
      "valoride://capability-command-center",
    );
    expect(url.toString()).not.toMatch(/token|jwt|secret|api[_-]?key/i);
  });

  it("keeps local-only recovery actions off external URLs", () => {
    expect(
      buildCapabilityRecoveryUrl("retry", {
        id: "mcp",
        status: "disconnected",
      }),
    ).toBeUndefined();
    expect(
      buildCapabilityRecoveryUrl("openDiagnostics", {
        id: "swarm",
        status: "offline",
      }),
    ).toBeUndefined();
    expect(
      buildCapabilityRecoveryUrl("viewUsage", {
        id: "graymatter",
        status: "quotaBlocked",
      }),
    ).toBeUndefined();
  });

  it("emits the blocked action context when retry-after-recharge is clicked", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();

    render(
      <CapabilityCommandCenter
        snapshots={[degradedSnapshots[2]]}
        onAction={onAction}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /Retry after recharge/i }),
    );

    expect(onAction).toHaveBeenCalledWith(
      "retryAfterRecharge",
      expect.objectContaining({
        id: "graymatter",
        blockedAction: "memory.write",
        status: "quotaBlocked",
      }),
    );
  });
});
