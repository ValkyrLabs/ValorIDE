import { jsx as _jsx } from "react/jsx-runtime";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
let SystemAlerts;
const mockUseGetAccountBalanceQuery = vi.fn();
const mockIsInsufficientFunds = vi.fn();
const mockUseExtensionState = vi.fn();
const mockGetApiMetrics = vi.fn();
vi.mock("@thorapi/context/ExtensionStateContext", () => ({
  useExtensionState: () => mockUseExtensionState(),
}));
vi.mock("@thorapi/services/creditsApi", () => ({
  useGetAccountBalanceQuery: (...args) =>
    mockUseGetAccountBalanceQuery(...args),
  isInsufficientFunds: (...args) => mockIsInsufficientFunds(...args),
}));
vi.mock("@shared/getApiMetrics", () => ({
  getApiMetrics: (...args) => mockGetApiMetrics(...args),
}));
vi.mock("@thorapi/components/BuyCredits", () => ({
  __esModule: true,
  default: () => _jsx("div", { "data-testid": "buy-credits-component" }),
}));
vi.mock("react-bootstrap", () => ({
  __esModule: true,
  Alert: ({ children }) =>
    _jsx("div", { "data-testid": "alert", children: children }),
  Modal: Object.assign(
    ({ show, children }) =>
      show
        ? _jsx("div", {
            "data-testid": "buy-credits-modal",
            children: children,
          })
        : null,
    {
      Header: ({ children }) =>
        _jsx("div", { "data-testid": "modal-header", children: children }),
      Title: ({ children }) =>
        _jsx("div", { "data-testid": "modal-title", children: children }),
      Body: ({ children }) =>
        _jsx("div", { "data-testid": "modal-body", children: children }),
    }
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
    render(_jsx(SystemAlerts, {}));
    await waitFor(() =>
      expect(screen.getByText(/Insufficient Credits/i)).toBeInTheDocument()
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
    render(_jsx(SystemAlerts, {}));
    await waitFor(() =>
      expect(screen.getByText(/Insufficient Credits/i)).toBeInTheDocument()
    );
    await waitFor(() =>
      expect(screen.getByTestId("buy-credits-modal")).toBeInTheDocument()
    );
  });
});
//# sourceMappingURL=index.test.js.map
