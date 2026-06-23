import React from "react";
import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
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
let mockExtensionState: any = { ...baseExtensionState };
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
  useRecordUsageTransactionMutation: () => [
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
  default: (props: any) => (
    <div
      data-testid="credits-history-table"
      data-payments-count={props.paymentsData?.length ?? 0}
      data-usage-count={props.usageData?.length ?? 0}
    />
  ),
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

beforeAll(async () => {
  ({ default: AccountView } = await import("./AccountView"));
}, 60_000);

describe("AccountView - Buy Credits button integration", () => {
  beforeEach(async () => {
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
  }, 30_000);

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

  it("fetches the resolved account balance when authenticatedUser is missing", () => {
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
    expect(screen.getByTestId("buy-credits-btn")).toBeInTheDocument();
  });

  it("uses explicit billing identifiers before falling back to authenticated me", () => {
    mockExtensionState = {
      ...baseExtensionState,
      authenticatedUser: {
        id: "user-123",
        customerId: "customer-456",
      },
      userInfo: undefined,
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
      "customer-456",
      expect.objectContaining({ skip: false }),
    );
  });

  it("falls back to the authenticated me balance when no account identifier is available", () => {
    mockExtensionState = {
      ...baseExtensionState,
      authenticatedUser: {
        username: "jm",
      },
      userInfo: undefined,
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
      "me",
      expect.objectContaining({ skip: false }),
    );
  });

  it("does not treat super accounts as unmetered without an explicit API flag", () => {
    mockExtensionState = {
      ...baseExtensionState,
      authenticatedUser: {
        id: "super",
        username: "super",
      },
      userInfo: undefined,
      isLoggedIn: true,
    };
    mockUseGetAccountBalanceQuery.mockReturnValue({
      data: { currentBalance: 2_000_000 },
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

    expect(screen.queryByTestId("unmetered-balance")).not.toBeInTheDocument();
  });

  it("uses balance response history instead of querying raw transaction tables", () => {
    mockUseGetUsageTransactionsQuery.mockClear();
    mockUseGetPaymentTransactionsQuery.mockClear();
    mockUseGetAccountBalanceQuery.mockReturnValue({
      data: {
        currentBalance: 25,
        usageTransactions: [{ id: "usage-1", credits: 1 }],
        payments: [{ id: "payment-1", credits: 50 }],
      },
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

    const history = screen.getByTestId("credits-history-table");
    expect(history).toHaveAttribute("data-usage-count", "1");
    expect(history).toHaveAttribute("data-payments-count", "1");
    expect(mockUseGetUsageTransactionsQuery).not.toHaveBeenCalled();
    expect(mockUseGetPaymentTransactionsQuery).not.toHaveBeenCalled();
  });
});

describe("AccountView - BuyCredits visibility", () => {
  beforeEach(async () => {
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
  }, 30_000);

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
