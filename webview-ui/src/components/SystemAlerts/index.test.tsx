import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

let SystemAlerts: typeof import("./index").default;

const mockUseGetAccountBalanceQuery = vi.fn();
const mockIsInsufficientFunds = vi.fn();
const mockUseExtensionState = vi.fn();
const mockGetApiMetrics = vi.fn();

vi.mock("@/context/ExtensionStateContext", () => ({
  useExtensionState: () => mockUseExtensionState(),
}));

vi.mock("@/services/creditsApi", () => ({
  useGetAccountBalanceQuery: (...args: any[]) =>
    mockUseGetAccountBalanceQuery(...args),
  isInsufficientFunds: (...args: any[]) => mockIsInsufficientFunds(...args),
}));

vi.mock("@shared/getApiMetrics", () => ({
  getApiMetrics: (...args: any[]) => mockGetApiMetrics(...args),
}));

vi.mock("@/components/BuyCredits", () => ({
  __esModule: true,
  default: () => <div data-testid="buy-credits-component" />,
}));

vi.mock("react-bootstrap", () => ({
  __esModule: true,
  Alert: ({ children }: any) => <div data-testid="alert">{children}</div>,
  Modal: Object.assign(
    ({ show, children }: any) =>
      show ? <div data-testid="buy-credits-modal">{children}</div> : null,
    {
      Header: ({ children }: any) => (
        <div data-testid="modal-header">{children}</div>
      ),
      Title: ({ children }: any) => (
        <div data-testid="modal-title">{children}</div>
      ),
      Body: ({ children }: any) => (
        <div data-testid="modal-body">{children}</div>
      ),
    },
  ),
}));

const baseExtensionState = {
  valorideMessages: [],
  jwtToken: "token",
  advancedSettings: {
    budgetAlerts: {
      depletedThreshold: 0,
      criticalThreshold: 5,
      lowThreshold: 10,
      alertThreshold: 20,
    },
  },
  authenticatedUser: { id: "user-123" },
  userInfo: { id: "user-123" },
};

describe("SystemAlerts - Buy Credits modal visibility", () => {
  beforeEach(async () => {
    mockUseExtensionState.mockReturnValue(baseExtensionState);
    mockUseGetAccountBalanceQuery.mockReturnValue({
      data: { currentBalance: 20 },
      isLoading: false,
    });
    mockIsInsufficientFunds.mockReturnValue(true);
    mockGetApiMetrics.mockReturnValue({ totalCost: 0 });

    vi.resetModules();
    ({ default: SystemAlerts } = await import("./index"));
  });

  it("hides Buy Credits modal when balance is above the critical threshold", async () => {
    mockUseExtensionState.mockReturnValue({
      ...baseExtensionState,
      valorideMessages: [
        {
          type: "ask",
          ask: "api_req_failed",
          text: "insufficient funds",
          ts: 123,
        },
      ],
    });

    mockUseGetAccountBalanceQuery.mockReturnValue({
      data: { currentBalance: 20 },
      isLoading: false,
    });

    render(<SystemAlerts />);

    await waitFor(() =>
      expect(screen.getByText(/Insufficient Credits/i)).toBeInTheDocument(),
    );

    expect(screen.queryByTestId("buy-credits-modal")).not.toBeInTheDocument();
  });

  it("shows Buy Credits modal when balance is at or below the critical threshold", async () => {
    mockUseExtensionState.mockReturnValue({
      ...baseExtensionState,
      valorideMessages: [
        {
          type: "ask",
          ask: "api_req_failed",
          text: "insufficient funds",
          ts: 456,
        },
      ],
    });

    mockUseGetAccountBalanceQuery.mockReturnValue({
      data: { currentBalance: 1 },
      isLoading: false,
    });

    render(<SystemAlerts />);

    await waitFor(() =>
      expect(screen.getByText(/Insufficient Credits/i)).toBeInTheDocument(),
    );

    await waitFor(() =>
      expect(screen.getByTestId("buy-credits-modal")).toBeInTheDocument(),
    );
  });
});
