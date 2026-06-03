import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import CurrentBalance, { getCreditBalanceGuidance } from ".";

const mockUseGetAccountBalanceQuery = vi.fn();
const mockUseAccessControl = vi.fn();

vi.mock("../../services/creditsApi", () => ({
  useGetAccountBalanceQuery: (...args: any[]) =>
    mockUseGetAccountBalanceQuery(...args),
}));

vi.mock("../../utils/accessControl", () => ({
  useAccessControl: (...args: any[]) => mockUseAccessControl(...args),
}));

vi.mock("../LoadingSpinner", () => ({
  __esModule: true,
  default: () => <div data-testid="loading-spinner" />,
}));

vi.mock("../HelpTooltip", () => ({
  __esModule: true,
  default: () => <span data-testid="help-tooltip" />,
}));

vi.mock("../BuyCredits", () => ({
  __esModule: true,
  default: () => <div data-testid="buy-credits-panel" />,
}));

describe("getCreditBalanceGuidance", () => {
  it("classifies depleted, low, watch, and ready credit states", () => {
    expect(getCreditBalanceGuidance(0).status).toBe("depleted");
    expect(getCreditBalanceGuidance(4.5).status).toBe("low");
    expect(getCreditBalanceGuidance(8).status).toBe("watch");
    expect(getCreditBalanceGuidance(20).status).toBe("ready");
  });
});

describe("CurrentBalance", () => {
  beforeEach(() => {
    mockUseAccessControl.mockReturnValue({
      principal: { id: "principal-123", username: "casey" },
    });
    mockUseGetAccountBalanceQuery.mockReturnValue({
      data: { currentBalance: 25 },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it("surfaces a proactive low-credit top-up action", () => {
    mockUseGetAccountBalanceQuery.mockReturnValue({
      data: { currentBalance: 2 },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<CurrentBalance />);

    expect(screen.getByText("$2.00")).toBeInTheDocument();
    expect(screen.getByText("Low credits")).toBeInTheDocument();
    expect(
      screen.getByText("3.00 credits restores the starter safety buffer."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Top up" }));

    expect(screen.getByTestId("buy-credits-panel")).toBeInTheDocument();
  });

  it("shows depleted copy for zero-balance accounts", () => {
    mockUseGetAccountBalanceQuery.mockReturnValue({
      data: { currentBalance: 0 },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<CurrentBalance />);

    expect(screen.getByText("Credits depleted")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Add credits to continue premium agents and generated app runs.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Buy credits" }),
    ).toBeInTheDocument();
  });

  it("offers a retry action when the balance endpoint fails", () => {
    const refetch = vi.fn();
    mockUseGetAccountBalanceQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { status: 503 },
      refetch,
    });

    render(<CurrentBalance />);

    fireEvent.click(
      screen.getByRole("button", { name: "Retry credit balance" }),
    );

    expect(screen.getByText("Balance unavailable")).toBeInTheDocument();
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
