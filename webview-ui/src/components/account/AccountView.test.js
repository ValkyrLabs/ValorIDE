import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
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
let AccountView;
vi.mock("../Login/form", () => ({
  __esModule: true,
  default: () => _jsx("div", { "data-testid": "login-form" }),
}));
vi.mock("@valkyr/component-library/CoolButton", () => ({
  __esModule: true,
  default: () => _jsx("div", { "data-testid": "cool-button" }),
}));
vi.mock("@valkyr/component-library/LoadingSpinner", () => ({
  __esModule: true,
  default: () => _jsx("div", { "data-testid": "loading-spinner" }),
}));
vi.mock("@/services/creditsApi", () => ({
  useGetAccountBalanceQuery: (...args) =>
    mockUseGetAccountBalanceQuery(...args),
}));
vi.mock("@/thor/redux/services/UsageTransactionService", () => ({
  useAddUsageTransactionMutation: () => [vi.fn()],
  useGetUsageTransactionsQuery: (...args) =>
    mockUseGetUsageTransactionsQuery(...args),
}));
vi.mock("@/thor/redux/services/PaymentTransactionService", () => ({
  useGetPaymentTransactionsQuery: (...args) =>
    mockUseGetPaymentTransactionsQuery(...args),
}));
vi.mock("../../redux/services/AuthService", () => ({
  useLoginUserMutation: () => [
    vi.fn(() => ({ unwrap: vi.fn().mockResolvedValue({}) })),
  ],
}));
vi.mock("@/context/ExtensionStateContext", () => ({
  useExtensionState: () => mockExtensionState,
}));
vi.mock("@/context/CommunicationServiceContext", () => ({
  useCommunicationService: () => ({
    ready: false,
    hubConnected: false,
    thorConnected: false,
    on: vi.fn(),
    off: vi.fn(),
  }),
}));
vi.mock("@/utils/vscode", () => ({ vscode: { postMessage: vi.fn() } }));
vi.mock("@shared/getApiMetrics", () => ({
  getApiMetrics: () => ({ totalCost: 0 }),
}));
vi.mock("@/components/BuyCredits", () => ({
  __esModule: true,
  default: (props) => {
    mockBuyCredits(props);
    return _jsxs("div", {
      "data-testid": "buy-credits-component",
      children: [
        "buy-credits for ",
        props.authenticatedPrincipal?.id || "no-user",
      ],
    });
  },
}));
vi.mock("./CreditsHistoryTable", () => ({
  __esModule: true,
  default: () => _jsx("div", { "data-testid": "credits-history-table" }),
}));
vi.mock("./ApplicationsList", () => ({
  __esModule: true,
  default: () => _jsx("div", { "data-testid": "applications-list" }),
}));
vi.mock("./OpenAPIFilePicker", () => ({
  __esModule: true,
  default: () => _jsx("div", { "data-testid": "openapi-file-picker" }),
}));
vi.mock("../FileExplorer/FileExplorer", () => ({
  __esModule: true,
  default: () => _jsx("div", { "data-testid": "file-explorer" }),
}));
vi.mock("./UserPreferences", () => ({
  __esModule: true,
  default: () => _jsx("div", { "data-testid": "user-preferences" }),
}));
vi.mock("@/components/SystemAlerts", () => ({
  __esModule: true,
  default: () => _jsx("div", { "data-testid": "system-alerts" }),
}));
vi.mock("../../assets/ValorIDELogoWhite", () => ({
  __esModule: true,
  default: () => _jsx("div", { "data-testid": "valoride-logo" }),
}));
vi.mock("@/components/LoadingSpinner", () => ({
  __esModule: true,
  default: () => _jsx("div", { "data-testid": "loading-spinner" }),
}));
describe("AccountView - BuyCredits integration", () => {
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
    render(_jsx(AccountView, { onDone: () => {} }));
    expect(
      screen.queryByRole("link", { name: /buy credits/i }),
    ).not.toBeInTheDocument();
    expect(mockBuyCredits).toHaveBeenCalledWith(
      expect.objectContaining({
        authenticatedPrincipal: expect.objectContaining({ id: "user-123" }),
      }),
    );
  });
  it("fetches balance using userInfo when authenticatedUser is missing", () => {
    mockExtensionState = {
      ...baseExtensionState,
      authenticatedUser: undefined,
      isLoggedIn: true,
    };
    render(_jsx(AccountView, { onDone: () => {} }));
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
//# sourceMappingURL=AccountView.test.js.map
