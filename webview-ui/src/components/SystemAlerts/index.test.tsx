import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

let SystemAlerts: typeof import("./index").default;

const mockUseGetAccountBalanceQuery = vi.fn();
const mockIsInsufficientFunds = vi.fn();
const mockUseExtensionState = vi.fn();
const mockGetApiMetrics = vi.fn();
const mockReduxState: any = {
  apiErrors: {
    lastError: null,
    showAccountBalance: false,
  },
};

vi.mock("@thorapi/context/ExtensionStateContext", () => ({
  useExtensionState: () => mockUseExtensionState(),
}));

vi.mock("@thorapi/services/creditsApi", () => ({
  useGetAccountBalanceQuery: (...args: any[]) =>
    mockUseGetAccountBalanceQuery(...args),
  isInsufficientFunds: (...args: any[]) => mockIsInsufficientFunds(...args),
}));

vi.mock("@shared/getApiMetrics", () => ({
  getApiMetrics: (...args: any[]) => mockGetApiMetrics(...args),
}));

vi.mock("react-redux", () => ({
  useSelector: (selector: any) => selector(mockReduxState),
  useDispatch: () => vi.fn(),
}));

vi.mock("@thorapi/components/BuyCredits", () => ({
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
      isFetching: false,
      isSuccess: true,
    });
    mockIsInsufficientFunds.mockReturnValue(true);
    mockGetApiMetrics.mockReturnValue({ totalCost: 0 });
    mockReduxState.apiErrors = {
      lastError: null,
      showAccountBalance: false,
    };

    vi.resetModules();
    ({ default: SystemAlerts } = await import("./index"));
  });

  it("does not show the top-up alert when validated balance covers the request", async () => {
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
      isFetching: false,
      isSuccess: true,
    });

    render(<SystemAlerts />);

    expect(screen.queryByText(/Credits need a top-up/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId("buy-credits-modal")).not.toBeInTheDocument();
  });

  it("does not show the top-up alert while balance is still loading", async () => {
    mockUseExtensionState.mockReturnValue({
      ...baseExtensionState,
      valorideMessages: [
        {
          type: "ask",
          ask: "api_req_failed",
          text: "insufficient funds",
          ts: 124,
        },
      ],
    });

    mockUseGetAccountBalanceQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: true,
      isSuccess: false,
    });

    render(<SystemAlerts />);

    expect(screen.queryByText(/Credits need a top-up/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId("buy-credits-modal")).not.toBeInTheDocument();
  });

  it("shows Buy Credits modal when validated balance cannot cover the operation", async () => {
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
    mockGetApiMetrics.mockReturnValue({ totalCost: 1 });

    mockUseGetAccountBalanceQuery.mockReturnValue({
      data: { currentBalance: 1 },
      isLoading: false,
      isFetching: false,
      isSuccess: true,
    });

    render(<SystemAlerts />);

    await waitFor(() =>
      expect(screen.getByText(/Credits need a top-up/i)).toBeInTheDocument(),
    );

    await waitFor(() =>
      expect(screen.getByTestId("buy-credits-modal")).toBeInTheDocument(),
    );
  });

  it("shows api error alert when apiErrors has lastError", async () => {
    mockUseExtensionState.mockReturnValue(baseExtensionState);
    mockUseGetAccountBalanceQuery.mockReturnValue({
      data: { currentBalance: 100 },
      isLoading: false,
      isFetching: false,
      isSuccess: true,
    });

    mockReduxState.apiErrors = {
      lastError: {
        id: "err-1",
        status: 500,
        endpointName: "getApplications",
        message: "Server exploded",
      },
      showAccountBalance: false,
    };

    render(<SystemAlerts />);

    await waitFor(() =>
      expect(screen.getByText(/Server exploded/i)).toBeInTheDocument(),
    );
  });

  it("strips html from api error alerts", async () => {
    mockUseExtensionState.mockReturnValue(baseExtensionState);
    mockReduxState.apiErrors = {
      lastError: {
        id: "err-html",
        status: 503,
        endpointName: "getApplications",
        message:
          '<!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML 2.0//EN"><html><head><title>503 Service Unavailable</title></head><body><h1>Service Unavailable</h1><p>The server is temporarily unable to service your request due to maintenance downtime or capacity problems. Please try again later.</p></body></html> (getApplications)',
      },
      showAccountBalance: false,
    };

    render(<SystemAlerts />);

    await waitFor(() =>
      expect(screen.getByText(/503 Service Unavailable/i)).toBeInTheDocument(),
    );
    expect(screen.getByText(/maintenance downtime/i)).toBeInTheDocument();
    expect(screen.queryByText(/<!DOCTYPE HTML/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/<html>/i)).not.toBeInTheDocument();
  });

  it("shows api error alert even when logged out", async () => {
    mockUseExtensionState.mockReturnValue({
      ...baseExtensionState,
      jwtToken: undefined,
      authenticatedUser: undefined,
      userInfo: undefined,
    });

    mockReduxState.apiErrors = {
      lastError: {
        id: "err-2",
        status: 500,
        endpointName: "getApplications",
        message: "Logged out error",
      },
      showAccountBalance: false,
    };

    render(<SystemAlerts />);

    await waitFor(() =>
      expect(screen.getByText(/Logged out error/i)).toBeInTheDocument(),
    );
  });
});
