import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";

const mockUseGetAccountBalanceQuery = vi.fn();
const mockUseGetUsageTransactionsQuery = vi.fn();
const mockUseGetPaymentTransactionsQuery = vi.fn();
const mockBuyCredits = vi.fn();
const baseExtensionState = {
  userInfo: { id: "user-123" },
  authenticatedUser: { id: "user-123" },
  isLoggedIn: true,
  jwtToken: "token",
  valorideMessages: [],
  advancedSettings: {},
};
let mockExtensionState = { ...baseExtensionState };
let AccountView: typeof import("./AccountView").default;

vi.mock("../Login/form", () => ({
  __esModule: true,
  default: () => <div data-testid="login-form" />,
}));

vi.mock("@valkyr/component-library/CoolButton", () => ({
  __esModule: true,
  default: () => <div data-testid="cool-button" />,
}));

vi.mock("@valkyr/component-library/LoadingSpinner", () => ({
  __esModule: true,
  default: () => <div data-testid="loading-spinner" />,
}));

vi.mock("@thorapi/services/creditsApi", () => ({
  useGetAccountBalanceQuery: (...args: any[]) =>
    mockUseGetAccountBalanceQuery(...args),
}));

vi.mock("@thorapi/redux/services/UsageTransactionService", () => ({
  useAddUsageTransactionMutation: () => [vi.fn()],
  useGetUsageTransactionsQuery: (...args: any[]) =>
    mockUseGetUsageTransactionsQuery(...args),
}));

vi.mock("@thorapi/redux/services/PaymentTransactionService", () => ({
  useGetPaymentTransactionsQuery: (...args: any[]) =>
    mockUseGetPaymentTransactionsQuery(...args),
}));

vi.mock("../../redux/services/AuthService", () => ({
  useLoginUserMutation: () => [
    vi.fn(() => ({ unwrap: vi.fn().mockResolvedValue({}) })),
  ],
}));

vi.mock("@thorapi/context/ExtensionStateContext", () => ({
  useExtensionState: () => mockExtensionState,
}));

vi.mock("@thorapi/context/CommunicationServiceContext", () => ({
  useCommunicationService: () => ({
    ready: false,
    hubConnected: false,
    thorConnected: false,
    on: vi.fn(),
    off: vi.fn(),
  }),
}));

vi.mock("@thorapi/utils/vscode", () => ({ vscode: { postMessage: vi.fn() } }));

vi.mock("@shared/getApiMetrics", () => ({
  getApiMetrics: () => ({ totalCost: 0 }),
}));

vi.mock("@thorapi/components/BuyCredits", () => ({
  __esModule: true,
  default: (props: any) => {
    mockBuyCredits(props);
    return (
      <div data-testid="buy-credits-component">
        buy-credits for {props.authenticatedPrincipal?.id || "no-user"}
      </div>
    );
  },
}));

vi.mock("./CreditsHistoryTable", () => ({
  __esModule: true,
  default: () => <div data-testid="credits-history-table" />,
}));

vi.mock("./ApplicationsList", () => ({
  __esModule: true,
  default: () => <div data-testid="applications-list" />,
}));

vi.mock("./OpenAPIFilePicker", () => ({
  __esModule: true,
  default: () => <div data-testid="openapi-file-picker" />,
}));

vi.mock("../FileExplorer/FileExplorer", () => ({
  __esModule: true,
  default: () => <div data-testid="file-explorer" />,
}));

vi.mock("./UserPreferences", () => ({
  __esModule: true,
  default: () => <div data-testid="user-preferences" />,
}));

vi.mock("./ContentFlipCard", () => ({
  __esModule: true,
  default: () => <div data-testid="content-flip-card" />,
}));

vi.mock("@thorapi/components/SystemAlerts", () => ({
  __esModule: true,
  default: () => <div data-testid="system-alerts" />,
}));

vi.mock("../../assets/ValorIDELogoWhite", () => ({
  __esModule: true,
  default: () => <div data-testid="valoride-logo" />,
}));

vi.mock("@thorapi/components/LoadingSpinner", () => ({
  __esModule: true,
  default: () => <div data-testid="loading-spinner" />,
}));

describe.skip("AccountView - BuyCredits integration", () => {
  beforeEach(async () => {
    ({ default: AccountView } = await import("./AccountView"));
    mockExtensionState = { ...baseExtensionState };
    mockUseGetAccountBalanceQuery.mockClear();
    mockUseGetAccountBalanceQuery.mockReturnValue({
      data: { currentBalance: 25 },
      isLoading: false,
      refetch: vi.fn(),
    });

    mockUseGetUsageTransactionsQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    mockUseGetPaymentTransactionsQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    mockBuyCredits.mockClear();
  });

  it("renders the embedded BuyCredits component instead of an external link when authenticated", () => {
    render(
      <AccountView
        onDone={() => { }}
        serverConsoleNeedsAttention={false}
        onClearServerConsoleNeedsAttention={() => { }}
      />,
    );

    expect(
      screen.queryByRole("link", { name: /buy credits/i }),
    ).not.toBeInTheDocument();

    expect(mockBuyCredits).toHaveBeenCalledWith(
      expect.objectContaining({
        authenticatedPrincipal: expect.objectContaining({ id: "user-123" }),
      }),
    );
  });

  it("adds a 'needs-attention' class on the Server Console tab when flagged and clears it on click", () => {
    const onClear = vi.fn();
    render(
      <AccountView
        onDone={() => { }}
        serverConsoleNeedsAttention={true}
        onClearServerConsoleNeedsAttention={onClear}
      />,
    );

    const serverTab = screen.getByTitle(/server console/i);
    expect(serverTab.className).toMatch(/needs-attention/);

    fireEvent.click(serverTab);
    expect(onClear).toHaveBeenCalled();
  });

  it("activates the Server Console tab when initialActiveTab prop is provided", () => {
    render(
      <AccountView
        onDone={() => { }}
        serverConsoleNeedsAttention={false}
        onClearServerConsoleNeedsAttention={() => { }}
        initialActiveTab="serverConsole"
      />,
    );
    // The server console should now be the active tab
    const serverTab = screen.getByTitle(/server console/i);
    expect(serverTab.className).toMatch(/active/);
  });

  it("fetches balance using userInfo when authenticatedUser is missing", () => {
    mockExtensionState = {
      ...baseExtensionState,
      authenticatedUser: undefined,
      isLoggedIn: true,
    };

    render(
      <AccountView
        onDone={() => { }}
        serverConsoleNeedsAttention={false}
        onClearServerConsoleNeedsAttention={() => { }}
      />,
    );

    expect(mockUseGetAccountBalanceQuery).toHaveBeenCalledWith(
      "user-123",
      expect.objectContaining({ skip: false }),
    );
    expect(mockBuyCredits).toHaveBeenCalledWith(
      expect.objectContaining({
        authenticatedPrincipal: expect.objectContaining({ id: "user-123" }),
      }),
    );
  });
});
