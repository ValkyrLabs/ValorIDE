import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import CapabilityRecoveryActions, {
  getCapabilityRecoveryActions,
  sanitizeCapabilityText,
} from "./CapabilityRecoveryActions";

const postMessage = vi.fn();

vi.mock("@thorapi/utils/vscode", () => ({
  vscode: {
    postMessage: (...args: unknown[]) => postMessage(...args),
  },
}));

describe("CapabilityRecoveryActions", () => {
  beforeEach(() => {
    postMessage.mockClear();
  });

  it.each([
    ["unauthenticated", "Sign in", "activation"],
    ["rbac_denied", "Request team access", "upsell"],
    ["quota_blocked", "Buy credits", "upsell"],
    ["low_credit", "Buy credits", "upsell"],
    ["unavailable", "Retry memory check", "retry"],
  ] as const)(
    "maps GrayMatter %s status to %s action",
    (status, actionLabel, telemetryIntent) => {
      render(<CapabilityRecoveryActions capability="graymatter" status={status} />);

      const region = screen.getByRole("region", {
        name: /graymatter recovery actions/i,
      });
      const action = within(region).getByRole("button", { name: actionLabel });

      expect(action).toHaveAttribute("data-intent", telemetryIntent);
    },
  );

  it("wires MCP disconnected state to marketplace and diagnostics actions", () => {
    const actions = getCapabilityRecoveryActions("mcp", "disconnected");

    expect(actions.map((action) => action.command)).toEqual([
      "valoride.mcp.openMarketplace",
      "valoride.diagnostics.open",
    ]);
  });

  it("wires SWARM offline state to reconnect and diagnostics actions", () => {
    const actions = getCapabilityRecoveryActions("swarm", "offline");

    expect(actions.map((action) => action.command)).toEqual([
      "valoride.swarm.reconnect",
      "valoride.diagnostics.open",
    ]);
  });

  it("sends token-safe recovery telemetry when an action is clicked", () => {
    render(
      <CapabilityRecoveryActions
        capability="graymatter"
        status="unauthenticated"
        latestFailure={{
          code: "AUTH_REQUIRED",
          message:
            "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.superSecretPayload.superSecretSignature failed",
        }}
      />,
    );

    expect(screen.getByText(/\[redacted\] failed/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(postMessage).toHaveBeenCalledWith({
      type: "capabilityRecoveryActionClicked",
      payload: expect.objectContaining({
        actionId: "graymatter-sign-in",
        capability: "graymatter",
        command: "valoride.account.signIn",
        failureCode: "AUTH_REQUIRED",
        intent: "activation",
        route: "account:login",
        source: "capability-command-center",
        status: "unauthenticated",
      }),
    });
    expect(JSON.stringify(postMessage.mock.calls)).not.toContain("superSecretPayload");
  });

  it("does not render actions for healthy capabilities", () => {
    const { container } = render(
      <CapabilityRecoveryActions capability="graymatter" status="ready" />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("redacts common secret forms from failure details", () => {
    expect(sanitizeCapabilityText("token ghp_abcdefghijklmnopqrstuvwxyz123456"))
      .toBe("token [redacted]");
    expect(sanitizeCapabilityText("key sk_live_1234567890abcdef"))
      .toBe("key [redacted]");
  });
});
