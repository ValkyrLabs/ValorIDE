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
