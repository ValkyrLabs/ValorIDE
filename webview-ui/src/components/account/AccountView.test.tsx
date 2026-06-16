import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";

const mockUseGetAccountBalanceQuery = vi.fn();
const mockUseGetAccountBalancesQuery = vi.fn();
const mockReceiptQuery = vi.fn();
const mockUseGetUsageTransactionsQuery = vi.fn();
const mockUseGetPaymentTransactionsQuery = vi.fn();
const mockPostMessage = vi.fn();
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

vi.mock("react-bootstrap", () => {
  const Card = ({ children, ...props }: any) => (
    <div {...props}>{children}</div>
  );
  Card.Header = ({ children, ...props }: any) => (
    <div {...props}>{children}</div>
  );
  Card.Body = ({ children, ...props }: any) => <div {...props}>{children}</div>;

  const Form = ({ children, ...props }: any) => (
    <form {...props}>{children}</form>
  );
  Form.Group = ({ children, ...props }: any) => (
    <div {...props}>{children}</div>
  );
  Form.Label = ({ children, ...props }: any) => (
    <label {...props}>{children}</label>
  );
  Form.Text = ({ children, ...props }: any) => (
    <small {...props}>{children}</small>
  );
  Form.Control = (props: any) => <input {...props} />;

  const InputGroup = ({ children, ...props }: any) => (
    <div {...props}>{children}</div>
  );
  InputGroup.Text = ({ children, ...props }: any) => (
    <span {...props}>{children}</span>
  );

  const Button = ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  );

  const Alert = ({ children, ...props }: any) => (
    <div {...props}>{children}</div>
  );

  return {
    __esModule: true,
    Card,
    Form,
    InputGroup,
    Button,
    Alert,
  };
});

vi.mock("@thorapi/services/creditsApi", () => ({
  useGetAccountBalanceQuery: (...args: any[]) =>
    mockUseGetAccountBalanceQuery(...args),
  useGetAppGenerationTraceQuery: (...args: any[]) => mockReceiptQuery(...args),
  useGetSkilloptRouteReceiptQuery: (...args: any[]) =>
    mockReceiptQuery(...args),
  useListSkilloptRouteReceiptsQuery: (...args: any[]) =>
    mockReceiptQuery(...args),
  useGetCreditDebitReceiptByReceiptRefQuery: (...args: any[]) =>
    mockReceiptQuery(...args),
  useListCreditDebitReceiptsQuery: (...args: any[]) =>
    mockReceiptQuery(...args),
  useCreateAppGenerationRequestMutation: () => [
    vi.fn(() => ({ unwrap: vi.fn().mockResolvedValue({}) })),
    { isLoading: false, error: undefined },
  ],
  useCompileContextPageMutation: () => [
    vi.fn(() => ({ unwrap: vi.fn().mockResolvedValue({}) })),
    { isLoading: false, error: undefined },
  ],
  useRunAppGenerationRequestMutation: () => [
    vi.fn(() => ({ unwrap: vi.fn().mockResolvedValue({}) })),
    { isLoading: false, error: undefined },
  ],
  useGetAppGenerationRequestQuery: (...args: any[]) =>
    mockReceiptQuery(...args),
  useGetContextPageQuery: (...args: any[]) => mockReceiptQuery(...args),
  useHydrateContextPageMutation: () => [
    vi.fn(() => ({ unwrap: vi.fn().mockResolvedValue({}) })),
    { isLoading: false, error: undefined },
  ],
  useRecompressContextPageMutation: () => [
    vi.fn(() => ({ unwrap: vi.fn().mockResolvedValue({}) })),
    { isLoading: false, error: undefined },
  ],
  useTraverseContextPageMutation: () => [
    vi.fn(() => ({ unwrap: vi.fn().mockResolvedValue({}) })),
    { isLoading: false, error: undefined },
  ],
  useRecordPaymentTransactionMutation: () => [
    vi.fn(() => ({ unwrap: vi.fn().mockResolvedValue({}) })),
  ],
}));

vi.mock("@thorapi/redux/services/AccountBalanceService", () => ({
  useGetAccountBalancesQuery: (...args: any[]) =>
    mockUseGetAccountBalancesQuery(...args),
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

vi.mock("@thorapi/utils/vscode", () => ({
  vscode: { postMessage: mockPostMessage },
}));

vi.mock("@shared/getApiMetrics", () => ({
  getApiMetrics: () => ({ totalCost: 0 }),
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

vi.mock("../ServerConsole", () => ({
  __esModule: true,
  default: () => <div data-testid="server-console" />,
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

describe("AccountView - Buy Credits button integration", () => {
  beforeEach(async () => {
    ({ default: AccountView } = await import("./AccountView"));
    mockExtensionState = { ...baseExtensionState };
    mockUseGetAccountBalanceQuery.mockClear();
    mockUseGetAccountBalancesQuery.mockClear();
    mockReceiptQuery.mockClear();
    mockReceiptQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      error: undefined,
      refetch: vi.fn(),
    });
    mockUseGetAccountBalanceQuery.mockReturnValue({
      data: { currentBalance: 25 },
      isLoading: false,
      refetch: vi.fn(),
    });
    mockUseGetAccountBalancesQuery.mockReturnValue({
      data: [{ id: "user-123", currentBalance: 25 }],
      isLoading: false,
      isFetching: false,
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
  });

  it("renders the Buy Credits button and triggers openInBrowser message", () => {
    mockPostMessage.mockClear();
    render(
      <AccountView
        {...({
          onDone: () => {},
          serverConsoleNeedsAttention: false,
          onClearServerConsoleNeedsAttention: () => {},
        } as any)}
      />,
    );
    const btn = screen.getByTestId("buy-credits-btn");
    expect(btn).toBeInTheDocument();
    btn.click();
    expect(mockPostMessage).toHaveBeenCalledWith({
      type: "openInBrowser",
      url: "https://valkyrlabs.com/buy-credits",
    });
  });

  it("adds a 'needs-attention' class on the Server Console tab when flagged and clears it on click", () => {
    const onClear = vi.fn();
    render(
      <AccountView
        {...({
          onDone: () => {},
          serverConsoleNeedsAttention: true,
          onClearServerConsoleNeedsAttention: onClear,
        } as any)}
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
        {...({
          onDone: () => {},
          serverConsoleNeedsAttention: false,
          onClearServerConsoleNeedsAttention: () => {},
          initialActiveTab: "serverConsole",
        } as any)}
      />,
    );
    // The server console should now be the active tab
    const serverTab = screen.getByTitle(/server console/i);
    expect(serverTab.className).toMatch(/active/);
  });

  it("activates the Receipts tab when initialActiveTab prop is provided", () => {
    render(
      <AccountView
        {...({
          onDone: () => {},
          serverConsoleNeedsAttention: false,
          onClearServerConsoleNeedsAttention: () => {},
          initialActiveTab: "receipts",
        } as any)}
      />,
    );

    const receiptsTab = screen.getByTitle(/receipts/i);
    expect(receiptsTab.className).toMatch(/active/);
    expect(screen.getAllByText("Receipts").length).toBeGreaterThan(0);
  });

  it("preloads SWARM command evidence in the Receipts tab", async () => {
    render(
      <AccountView
        {...({
          onDone: () => {},
          serverConsoleNeedsAttention: false,
          onClearServerConsoleNeedsAttention: () => {},
          initialActiveTab: "receipts",
          initialSwarmCommandResponse: {
            status: "accepted",
            commandId: "cmd-auto-1",
            receiptRef: "swarm-command:cmd-auto-1",
            traceId: "swarm-trace:auto-1",
            contextPageRef: "ctx-auto-1",
            skillOptReceiptRef: "skillopt-auto-1",
            workflowExecutionRef: "workflow_execution:auto-1",
            workflowDispatchJson: JSON.stringify({
              workflowId: "workflow-auto-1",
              secretToken: "nope",
            }),
          },
        } as any)}
      />,
    );

    expect(await screen.findByText("SWARM Command")).toBeInTheDocument();
    expect(screen.getAllByText("cmd-auto-1").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText("swarm-command:cmd-auto-1").length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("ctx-auto-1").length).toBeGreaterThan(0);
    expect(screen.queryByText(/nope/)).not.toBeInTheDocument();
  });

  it("activates the App Generation tab when initialActiveTab prop is provided", () => {
    render(
      <AccountView
        {...({
          onDone: () => {},
          serverConsoleNeedsAttention: false,
          onClearServerConsoleNeedsAttention: () => {},
          initialActiveTab: "appGeneration",
        } as any)}
      />,
    );

    const appGenerationTab = screen.getByTitle(/app generation/i);
    expect(appGenerationTab.className).toMatch(/active/);
    expect(screen.getByText("Tenant App Generation")).toBeInTheDocument();
  });

  it("activates the Context Pages tab when initialActiveTab prop is provided", () => {
    render(
      <AccountView
        {...({
          onDone: () => {},
          serverConsoleNeedsAttention: false,
          onClearServerConsoleNeedsAttention: () => {},
          initialActiveTab: "contextPage",
        } as any)}
      />,
    );

    const contextTab = screen.getByTitle(/context pages/i);
    expect(contextTab.className).toMatch(/active/);
    expect(screen.getByText("ContextPage")).toBeInTheDocument();
  });

  it("fetches balance using userInfo when authenticatedUser is missing", () => {
    mockExtensionState = {
      ...baseExtensionState,
      authenticatedUser: undefined,
      isLoggedIn: true,
    };

    render(
      <AccountView
        onDone={() => {}}
        serverConsoleNeedsAttention={false}
        onClearServerConsoleNeedsAttention={() => {}}
      />,
    );

    expect(mockUseGetAccountBalanceQuery).toHaveBeenCalledWith(
      "user-123",
      expect.objectContaining({ skip: false }),
    );
    expect(mockUseGetAccountBalancesQuery).toHaveBeenCalledWith(
      expect.objectContaining({ authSessionKey: "token" }),
      expect.objectContaining({ skip: false }),
    );
    expect(screen.getByTestId("buy-credits-btn")).toBeInTheDocument();
  });
});

describe("AccountView - BuyCredits visibility", () => {
  beforeEach(async () => {
    ({ default: AccountView } = await import("./AccountView"));
    mockExtensionState = {
      ...baseExtensionState,
      advancedSettings: {
        budgetAlerts: {
          depletedThreshold: 0,
          criticalThreshold: 1,
          lowThreshold: 5,
          alertThreshold: 10,
        },
      },
    };
    mockUseGetAccountBalanceQuery.mockClear();
    mockUseGetAccountBalancesQuery.mockClear();
    mockUseGetAccountBalancesQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
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
  });

  it("hides BuyCredits when balance is above the critical threshold", () => {
    mockUseGetAccountBalanceQuery.mockReturnValue({
      data: { currentBalance: 25 },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    render(
      <AccountView
        onDone={() => {}}
        serverConsoleNeedsAttention={false}
        onClearServerConsoleNeedsAttention={() => {}}
      />,
    );

    expect(screen.queryByText(/buy credits/i)).not.toBeInTheDocument();
  });

  it("shows BuyCredits when balance is at or below the critical threshold", () => {
    mockUseGetAccountBalanceQuery.mockReturnValue({
      data: { currentBalance: 0.5 },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    render(
      <AccountView
        onDone={() => {}}
        serverConsoleNeedsAttention={false}
        onClearServerConsoleNeedsAttention={() => {}}
      />,
    );

    expect(screen.getByText(/buy credits/i)).toBeInTheDocument();
  });

  it("renders credit intent context panel when intent is provided", () => {
    mockUseGetAccountBalanceQuery.mockReturnValue({
      data: { currentBalance: 0.25 },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    render(
      <AccountView
        onDone={() => {}}
        serverConsoleNeedsAttention={false}
        onClearServerConsoleNeedsAttention={() => {}}
        creditIntent={{
          actionName: "Continue current request",
          requiredCredits: 2,
          currentBalance: 0.25,
          originView: "chat",
        }}
      />,
    );

    expect(screen.getByTestId("credit-intent-panel")).toBeInTheDocument();
    expect(screen.getByText(/finish this action/i)).toBeInTheDocument();
  });
});
