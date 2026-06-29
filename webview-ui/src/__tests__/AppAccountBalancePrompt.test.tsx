import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { digitalProductProBuildModePayload } from "../components/build-mode/buildModeFixtures";

const appTestHarness = vi.hoisted(() => ({
  accountProps: vi.fn(),
  dispatch: vi.fn(),
  postMessage: vi.fn(),
  useGetAccountBalanceQuery: vi.fn(),
  apiErrors: {
    creditIntent: undefined as any,
    showAccountBalance: true,
  },
}));

vi.mock("../components/account/AccountView", () => ({
  __esModule: true,
  default: (props: any) => {
    appTestHarness.accountProps(props);
    return (
      <div
        data-initial-active-tab={props.initialActiveTab || ""}
        data-swarm-receipt={props.initialSwarmCommandResponse?.receiptRef || ""}
        data-testid="account-view"
      />
    );
  },
}));

vi.mock("../components/chat/ChatView", () => ({
  __esModule: true,
  default: () => <div data-testid="chat-view" />,
}));

vi.mock("../components/history/HistoryView", () => ({
  __esModule: true,
  default: () => <div data-testid="history-view" />,
}));

vi.mock("../components/settings/SettingsView", () => ({
  __esModule: true,
  default: () => <div data-testid="settings-view" />,
}));

vi.mock("../components/mcp/configuration/McpConfigurationView", () => ({
  __esModule: true,
  default: () => <div data-testid="mcp-view" />,
}));

vi.mock("../context/MothershipContext", () => ({
  MothershipProvider: ({ children }: { children: any }) => children,
}));

vi.mock("../components/chat/ChatMothershipProvider", () => ({
  ChatMothershipProvider: ({ children }: { children: any }) => children,
}));

vi.mock("../hooks/useValorIDEMothership", () => ({
  __esModule: true,
  default: () => ({
    instanceId: null,
    isConnected: false,
    sendChatAction: vi.fn(),
    trackChatMessage: vi.fn(),
    trackCommandExecute: vi.fn(),
    trackFileEdit: vi.fn(),
    trackTaskComplete: vi.fn(),
    trackTaskStart: vi.fn(),
    trackToolUse: vi.fn(),
  }),
}));

vi.mock("../components/ApplicationProgress/ApplicationProgress", () => ({
  __esModule: true,
  default: () => <div data-testid="app-progress" />,
}));

vi.mock("../components/build-mode/BuildModeView", () => ({
  __esModule: true,
  default: ({
    onOpenArtifact,
    onOpenPreview,
    onRunAutonomousQueue,
    onRunDueAutomations,
    onRunCommand,
    onSetAutomationStatus,
    payload,
  }: {
    onOpenArtifact?: any;
    onOpenPreview?: any;
    onRunAutonomousQueue?: any;
    onRunDueAutomations?: any;
    onRunCommand?: any;
    onSetAutomationStatus?: any;
    payload: any;
  }) => (
    <div data-task-id={payload.taskId} data-testid="build-mode-view">
      {payload.appBundle.name}
      <span data-testid="build-mode-last-run">
        {payload.scheduledAutomations?.[0]?.lastRunStatus || ""}
      </span>
      <button
        onClick={() => onOpenPreview?.("http://localhost:5173/preview")}
        type="button"
      >
        Open Preview
      </button>
      <button
        onClick={() =>
          onOpenArtifact?.(
            "valoride://build-mode/artifacts/task-alpha/cmd-test/output-command_stdout.txt",
          )
        }
        type="button"
      >
        Open Artifact
      </button>
      <button
        onClick={() =>
          onRunCommand?.(
            {
              id: "cmd-edit",
              kind: "build",
              label: "Edit generated artifact",
              command: "apply patch apps/shop/thorapi/redux/ProductService.tsx",
              capabilityId: "terminal.execute",
              requiresApproval: false,
              status: "queued",
              targetPaths: ["apps/shop/thorapi/redux/ProductService.tsx"],
            },
            undefined,
            undefined,
            {
              promptProfileId: "prompt-profile-valhalla",
              promptProfileName: "Valhalla Build Operator",
              promptBundleId: "prompt-bundle-valhalla-001",
              promptBundleVersion: "2026.06.21",
              promptBundlePolicy: "locked",
              promptBundleReceiptIds: ["receipt-prompt-bundle-dpp-001"],
            },
            [
              {
                id: "cmd-workflow-workflow-mcp-dpp-fulfillment",
                kind: "workflow",
                label: "Run fulfillment workflow",
                command:
                  "mcp:private-valkyr-workflows.digitalProduct.fulfillPurchase workflow:workflow:digital-product-fulfillment",
                capabilityId: "mcp.tool",
                requiresApproval: true,
                status: "approval-required",
              },
            ],
          )
        }
        type="button"
      >
        Run Generated Edit
      </button>
      <button
        onClick={() =>
          onRunCommand?.(
            {
              id: "cmd-approve",
              kind: "verify",
              label: "Approve browser check",
              command: "open preview and verify checkout flow",
              capabilityId: "browser.automation",
              requiresApproval: true,
              status: "approval-required",
            },
            {
              approved: true,
              approverPrincipalId: payload.scope.principalId,
              approverRoles: payload.scope.roles,
              threshold: "operator",
              reason: "Approved from App test.",
              createdAt: "2026-06-21T22:00:00.000Z",
            },
          )
        }
        type="button"
      >
        Approve Browser Check
      </button>
      <button
        onClick={() =>
          onRunAutonomousQueue?.(
            [
              payload.commands?.find(
                (command: any) => command.id === "cmd-test",
              ) ?? {
                id: "cmd-test",
                kind: "test",
                label: "Unit tests",
                command: "npm run test --workspace webview-ui",
                capabilityId: "terminal.execute",
                requiresApproval: false,
                status: "queued",
              },
            ],
            "valkyr-credits",
            {
              promptProfileId: "prompt-profile-valhalla",
              promptProfileName: "Valhalla Build Operator",
              promptBundleId: "prompt-bundle-valhalla-001",
              promptBundleVersion: "2026.06.21",
              promptBundlePolicy: "locked",
              promptBundleReceiptIds: ["receipt-prompt-bundle-dpp-001"],
            },
            payload.commands,
          )
        }
        type="button"
      >
        Run Autonomous Queue
      </button>
      <button
        onClick={() =>
          onRunDueAutomations?.(
            [
              {
                id: "cmd-workflow-workflow-mcp-dpp-fulfillment",
                kind: "workflow",
                label: "Run fulfillment workflow",
                command:
                  "mcp:private-valkyr-workflows.digitalProduct.fulfillPurchase workflow:workflow:digital-product-fulfillment",
                capabilityId: "mcp.tool",
                requiresApproval: true,
                status: "approval-required",
              },
              {
                id: "cmd-automation-automation-nightly-fulfillment-check",
                kind: "automation",
                label: "Schedule nightly smoke check",
                command:
                  "schedule:0 7 * * * workflow:workflow:digital-product-fulfillment command:cmd-workflow-workflow-mcp-dpp-fulfillment",
                capabilityId: "automation.schedule",
                requiresApproval: true,
                status: "approval-required",
              },
            ],
            "valkyr-credits",
            {
              promptProfileId: "prompt-profile-valhalla",
              promptProfileName: "Valhalla Build Operator",
              promptBundleId: "prompt-bundle-valhalla-001",
              promptBundleVersion: "2026.06.21",
              promptBundlePolicy: "locked",
              promptBundleReceiptIds: ["receipt-prompt-bundle-dpp-001"],
            },
          )
        }
        type="button"
      >
        Refresh scheduled automations
      </button>
      <button
        onClick={() =>
          onSetAutomationStatus?.(
            "automation-nightly-fulfillment-check",
            "paused",
          )
        }
        type="button"
      >
        Pause automation
      </button>
    </div>
  ),
}));

vi.mock("../components/usage-tracking/UsageTrackingHandler", () => ({
  __esModule: true,
  UsageTrackingHandler: () => null,
}));

vi.mock("../components/content-data/ContentDataHandler", () => ({
  __esModule: true,
  ContentDataHandler: () => null,
}));

vi.mock("../services/creditsApi", () => ({
  useGetAccountBalanceQuery: (...args: any[]) =>
    appTestHarness.useGetAccountBalanceQuery(...args),
}));

vi.mock("../components/usage-tracking/StartupDebit", () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock("react-redux", () => ({
  useSelector: (selector: any) =>
    selector({ apiErrors: appTestHarness.apiErrors }),
  useDispatch: () => appTestHarness.dispatch,
}));

vi.mock("../context/ExtensionStateContext", () => ({
  ExtensionStateContextProvider: ({ children }: { children: any }) => children,
  hasConfiguredApiProvider: (config?: any) =>
    config?.apiProvider === "openai-native" ||
    Boolean(config && Object.values(config).some((value) => value !== undefined)),
  useExtensionState: () => ({
    authenticatedUser: { id: "user-123" },
    didHydrateState: true,
    isLoggedIn: true,
    jwtToken: "token",
    showWelcome: false,
    shouldShowAnnouncement: false,
    telemetrySetting: "unset",
    userInfo: { id: "user-123" },
    vscMachineId: "test",
  }),
}));

const mockStorage = () => {
  const store = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(() => store.clear()),
    key: vi.fn((index: number) => Array.from(store.keys())[index] ?? null),
    get length() {
      return store.size;
    },
  };
};

describe("App account balance prompt", () => {
  beforeEach(() => {
    appTestHarness.accountProps.mockClear();
    appTestHarness.dispatch.mockClear();
    appTestHarness.postMessage.mockClear();
    appTestHarness.useGetAccountBalanceQuery.mockReset();
    appTestHarness.useGetAccountBalanceQuery.mockReturnValue({
      data: { currentBalance: 0 },
      isLoading: false,
      isFetching: false,
      isSuccess: true,
      error: undefined,
    });
    appTestHarness.apiErrors.showAccountBalance = true;
    appTestHarness.apiErrors.creditIntent = {
      actionName: "Continue current request",
      currentBalance: 0,
      requiredCredits: 2,
      originView: "chat",
    };
    (globalThis as any).localStorage = mockStorage();
    (globalThis as any).sessionStorage = mockStorage();
    (globalThis as any).acquireVsCodeApi = () => ({
      postMessage: appTestHarness.postMessage,
      setState: vi.fn(),
      getState: vi.fn(),
    });
  });

  afterEach(() => {
    delete (globalThis as any).localStorage;
    delete (globalThis as any).sessionStorage;
    delete (globalThis as any).acquireVsCodeApi;
  });

  it("opens account view only after validated balance is below required credits", async () => {
    const { default: App } = await import("../App");

    render(<App />);

    await waitFor(() =>
      expect(screen.getByTestId("account-view")).toBeInTheDocument(),
    );
    expect(appTestHarness.accountProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        creditIntent: expect.objectContaining({
          currentBalance: 0,
          requiredCredits: 2,
        }),
      }),
    );
  });

  it("does not open account view while credit balance is loading", async () => {
    appTestHarness.useGetAccountBalanceQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: true,
      isSuccess: false,
      error: undefined,
    });
    const { default: App } = await import("../App");

    render(<App />);

    expect(screen.queryByTestId("account-view")).not.toBeInTheDocument();
  });

  it("does not open account view when validated balance covers the operation", async () => {
    appTestHarness.useGetAccountBalanceQuery.mockReturnValue({
      data: { currentBalance: 2_000_000 },
      isLoading: false,
      isFetching: false,
      isSuccess: true,
      error: undefined,
    });
    const { default: App } = await import("../App");

    render(<App />);

    await waitFor(() =>
      expect(screen.queryByTestId("account-view")).not.toBeInTheDocument(),
    );
  });

  it("shows the welcome screen after auth state is cleared", async () => {
    appTestHarness.apiErrors.showAccountBalance = false;
    const { default: App } = await import("../App");

    render(<App />);

    expect(screen.queryByText(/Get Started for Free/i)).not.toBeInTheDocument();

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: "clearClientAuthState",
          },
        }),
      );
    });

    await waitFor(() =>
      expect(screen.getByText(/Get Started for Free/i)).toBeInTheDocument(),
    );
  });

  it("opens account receipts when a SWARM command response arrives", async () => {
    appTestHarness.apiErrors.showAccountBalance = false;
    const { default: App } = await import("../App");

    render(<App />);

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: "swarm:command-response",
            swarmCommandResponse: {
              status: "accepted",
              commandId: "cmd-app-1",
              receiptRef: "swarm-command:cmd-app-1",
              traceId: "swarm-trace:app-1",
              contextPageRef: "ctx-app-1",
              skillOptReceiptRef: "skillopt-app-1",
              workflowExecutionRef: "workflow_execution:app-1",
            },
          },
        }),
      );
    });

    await waitFor(() =>
      expect(screen.getByTestId("account-view")).toBeInTheDocument(),
    );
    expect(appTestHarness.accountProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        initialActiveTab: "receipts",
        initialSwarmCommandResponse: expect.objectContaining({
          receiptRef: "swarm-command:cmd-app-1",
          traceId: "swarm-trace:app-1",
          commandId: "cmd-app-1",
        }),
      }),
    );
  });

  it("opens Build Mode when a Valor task bridge payload arrives", async () => {
    appTestHarness.apiErrors.showAccountBalance = false;
    const { default: App } = await import("../App");

    render(<App />);

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: "valorBuildModeTask",
            payload: {
              taskId: "task-from-sagechat",
              appBundle: {
                id: "bundle-1",
                name: "SageChat App",
                version: "1.0.0",
                productLine: "Internal tools",
                intent: "Open Build Mode from SageChat.",
                sourceSessionId: "sagechat-1",
                createdAt: "2026-06-21T21:00:00.000Z",
                artifacts: [],
                componentBundleIds: [],
                execModuleIds: [],
              },
              grayMatterContextPack: {
                id: "ctx-1",
                compiledAt: "2026-06-21T21:00:00.000Z",
                source: "GrayMatter",
                policy: "answer-confidently",
                retrievalReceiptIds: ["receipt-1"],
                memoryEntryIds: ["memory-1"],
                summary: "Fixture context",
              },
            },
          },
        }),
      );
    });

    await waitFor(() =>
      expect(screen.getByTestId("build-mode-view")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("build-mode-view")).toHaveAttribute(
      "data-task-id",
      "task-from-sagechat",
    );
    expect(screen.getByText("SageChat App")).toBeInTheDocument();
    expect(appTestHarness.postMessage).toHaveBeenCalledWith({
      type: "valorBuildModeRequestAutomationSnapshot",
    });
  });

  it("shows structured Build Mode launch rejections and clears them on a valid launch", async () => {
    appTestHarness.apiErrors.showAccountBalance = false;
    const { default: App } = await import("../App");

    render(<App />);

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: "valorBuildModeLaunchRejected",
            payload: {
              issues: [
                "Build Mode task payload requires an appBundle object.",
                "Build Mode task workspaceRoot is outside the active workspace.",
              ],
              summary:
                "Build Mode task payload requires an appBundle object. Build Mode task workspaceRoot is outside the active workspace.",
            },
          },
        }),
      );
    });

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Build Mode launch rejected.",
      ),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "requires an appBundle object",
    );
    expect(screen.queryByTestId("build-mode-view")).not.toBeInTheDocument();

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: "valorBuildModeTask",
            payload: digitalProductProBuildModePayload,
          },
        }),
      );
    });

    await waitFor(() =>
      expect(screen.getByTestId("build-mode-view")).toBeInTheDocument(),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("merges Build Mode automation snapshots into the open cockpit", async () => {
    appTestHarness.apiErrors.showAccountBalance = false;
    const { default: App } = await import("../App");

    render(<App />);

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: "valorBuildModeTask",
            payload: {
              taskId: "task-from-sagechat",
              appBundle: {
                id: "bundle-1",
                name: "SageChat App",
                version: "1.0.0",
                productLine: "Internal tools",
                intent: "Open Build Mode from SageChat.",
                sourceSessionId: "sagechat-1",
                createdAt: "2026-06-21T21:00:00.000Z",
                artifacts: [],
                componentBundleIds: [],
                execModuleIds: [],
              },
              grayMatterContextPack: {
                id: "ctx-1",
                compiledAt: "2026-06-21T21:00:00.000Z",
                source: "GrayMatter",
                policy: "answer-confidently",
                retrievalReceiptIds: ["receipt-1"],
                memoryEntryIds: ["memory-1"],
                summary: "Fixture context",
              },
            },
          },
        }),
      );
    });

    await waitFor(() =>
      expect(screen.getByTestId("build-mode-view")).toBeInTheDocument(),
    );

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: "valorBuildModeAutomationSnapshot",
            buildModeAutomationSnapshot: {
              refreshedAt: "2026-06-23T07:02:00.000Z",
              storageUri: "valoride://build-mode/automations",
              records: [
                {
                  id: "automation-nightly-fulfillment-check",
                  label: "Nightly fulfillment smoke check",
                  lastRunAt: "2026-06-23T07:01:00.000Z",
                  lastRunReceiptId: "build-command-receipt-workflow-run-001",
                  lastRunStatus: "succeeded",
                  nextRunAt: "2026-06-24T07:00:00.000Z",
                  schedule: "0 7 * * *",
                  status: "scheduled",
                  taskId: "build-mode-task",
                  workflowCommandId:
                    "cmd-workflow-workflow-mcp-dpp-fulfillment",
                  workflowRef: "workflow:digital-product-fulfillment",
                },
              ],
            },
          },
        }),
      );
    });

    await waitFor(() =>
      expect(screen.getByTestId("build-mode-last-run")).toHaveTextContent(
        "succeeded",
      ),
    );
  });

  it("keeps Build Mode open when command receipts arrive", async () => {
    appTestHarness.apiErrors.showAccountBalance = false;
    const { default: App } = await import("../App");

    render(<App />);

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: "valorBuildModeTask",
            payload: {
              taskId: "task-from-sagechat",
              appBundle: {
                id: "bundle-1",
                name: "SageChat App",
                version: "1.0.0",
                productLine: "Internal tools",
                intent: "Open Build Mode from SageChat.",
                sourceSessionId: "sagechat-1",
                createdAt: "2026-06-21T21:00:00.000Z",
                artifacts: [],
                componentBundleIds: [],
                execModuleIds: [],
              },
              grayMatterContextPack: {
                id: "ctx-1",
                compiledAt: "2026-06-21T21:00:00.000Z",
                source: "GrayMatter",
                policy: "answer-confidently",
                retrievalReceiptIds: ["receipt-1"],
                memoryEntryIds: ["memory-1"],
                summary: "Fixture context",
              },
            },
          },
        }),
      );
    });

    await screen.findByTestId("build-mode-view");

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: "valorBuildModeCommandResult",
            buildModeCommandReceipt: {
              id: "build-command-receipt-cmd-test",
              commandId: "cmd-test",
              capabilityId: "terminal.execute",
              status: "queued",
              approved: true,
              requiresApproval: false,
              summary: "Queued.",
              createdAt: "2026-06-21T21:01:00.000Z",
            },
          },
        }),
      );
    });

    expect(screen.getByTestId("build-mode-view")).toBeInTheDocument();
  });

  it("routes Build Mode preview opens through the existing browser bridge", async () => {
    appTestHarness.apiErrors.showAccountBalance = false;
    const { default: App } = await import("../App");

    render(<App />);

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: "valorBuildModeTask",
            payload: {
              taskId: "task-from-sagechat",
              appBundle: {
                id: "bundle-1",
                name: "SageChat App",
                version: "1.0.0",
                productLine: "Internal tools",
                intent: "Open Build Mode from SageChat.",
                sourceSessionId: "sagechat-1",
                createdAt: "2026-06-21T21:00:00.000Z",
                artifacts: [],
                componentBundleIds: [],
                execModuleIds: [],
              },
              grayMatterContextPack: {
                id: "ctx-1",
                compiledAt: "2026-06-21T21:00:00.000Z",
                source: "GrayMatter",
                policy: "answer-confidently",
                retrievalReceiptIds: ["receipt-1"],
                memoryEntryIds: ["memory-1"],
                summary: "Fixture context",
              },
            },
          },
        }),
      );
    });

    fireEvent.click(
      await screen.findByRole("button", { name: "Open Preview" }),
    );

    expect(appTestHarness.postMessage).toHaveBeenCalledWith({
      type: "openInBrowser",
      url: "http://localhost:5173/preview",
    });
  });

  it("routes Build Mode artifact opens through the extension artifact bridge", async () => {
    appTestHarness.apiErrors.showAccountBalance = false;
    const { default: App } = await import("../App");

    render(<App />);

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: "valorBuildModeTask",
            payload: {
              taskId: "task-from-sagechat",
              appBundle: {
                id: "bundle-1",
                name: "SageChat App",
                version: "1.0.0",
                productLine: "Internal tools",
                intent: "Open Build Mode from SageChat.",
                sourceSessionId: "sagechat-1",
                createdAt: "2026-06-21T21:00:00.000Z",
                artifacts: [],
                componentBundleIds: [],
                execModuleIds: [],
              },
              grayMatterContextPack: {
                id: "ctx-1",
                compiledAt: "2026-06-21T21:00:00.000Z",
                source: "GrayMatter",
                policy: "answer-confidently",
                retrievalReceiptIds: ["receipt-1"],
                memoryEntryIds: ["memory-1"],
                summary: "Fixture context",
              },
            },
          },
        }),
      );
    });

    fireEvent.click(
      await screen.findByRole("button", { name: "Open Artifact" }),
    );

    expect(appTestHarness.postMessage).toHaveBeenCalledWith({
      type: "valorBuildModeOpenArtifact",
      payload: {
        uri: "valoride://build-mode/artifacts/task-alpha/cmd-test/output-command_stdout.txt",
      },
    });
  });

  it("adds generated artifact protections to Build Mode command requests", async () => {
    appTestHarness.apiErrors.showAccountBalance = false;
    const { default: App } = await import("../App");

    render(<App />);

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: "valorBuildModeTask",
            payload: {
              taskId: "task-from-sagechat",
              appBundle: {
                id: "bundle-1",
                name: "SageChat App",
                version: "1.0.0",
                productLine: "Internal tools",
                intent: "Open Build Mode from SageChat.",
                sourceSessionId: "sagechat-1",
                createdAt: "2026-06-21T21:00:00.000Z",
                artifacts: [
                  {
                    path: "apps/shop/thorapi/redux/ProductService.tsx",
                    kind: "generated",
                  },
                ],
                componentBundleIds: [],
                execModuleIds: [],
              },
              grayMatterContextPack: {
                id: "ctx-1",
                compiledAt: "2026-06-21T21:00:00.000Z",
                source: "GrayMatter",
                policy: "answer-confidently",
                retrievalReceiptIds: ["receipt-1"],
                memoryEntryIds: ["memory-1"],
                summary: "Fixture context",
              },
            },
          },
        }),
      );
    });

    fireEvent.click(
      await screen.findByRole("button", { name: "Run Generated Edit" }),
    );

    expect(appTestHarness.postMessage).toHaveBeenCalledWith({
      type: "valorBuildModeRunCommand",
      payload: expect.objectContaining({
        approval: undefined,
        taskId: "task-from-sagechat",
        command: expect.objectContaining({
          id: "cmd-edit",
          protectedPaths: ["apps/shop/thorapi/redux/ProductService.tsx"],
          targetPaths: ["apps/shop/thorapi/redux/ProductService.tsx"],
        }),
        scope: expect.objectContaining({
          tenantId: "tenant-valkyr-demo",
          principalId: "principal-valhalla-operator",
        }),
        autonomyPolicy: expect.objectContaining({
          id: "autonomy-policy-valhalla-local",
          mode: "approval-gated",
        }),
        browserPreviewUrl: "http://localhost:5173/apps/digital-product-pro",
        currentConsecutiveCommands: 0,
        creditEstimateId: "credit-estimate-dpp-001",
        estimatedCredits: 42,
        grayMatterContextPack: expect.objectContaining({
          id: "ctx-1",
          invariantPreflightStatus: "passed",
          retrievalReceiptIds: ["receipt-1"],
          retrievalStatus: "ready",
        }),
        finalReportMarkdown: expect.stringContaining(
          "# Digital Product Pro Build Mode Report",
        ),
        providerRoute: "valkyr-credits",
        requireGrayMatterContext: true,
        promptContext: {
          promptProfileId: "prompt-profile-valhalla",
          promptProfileName: "Valhalla Build Operator",
          promptBundleId: "prompt-bundle-valhalla-001",
          promptBundleVersion: "2026.06.21",
          promptBundlePolicy: "locked",
          promptBundleReceiptIds: ["receipt-prompt-bundle-dpp-001"],
        },
        checkpoints: expect.arrayContaining([
          expect.objectContaining({
            id: "checkpoint-pre-edit-dpp",
          }),
        ]),
        agentRuntimes: expect.arrayContaining([
          expect.objectContaining({
            id: "runtime-codex-build-operator",
            ownerRole: "Supervisor",
          }),
        ]),
        swarmRoles: expect.arrayContaining([
          expect.objectContaining({
            role: "Supervisor",
            status: "assigned",
          }),
        ]),
        commandCatalog: expect.arrayContaining([
          expect.objectContaining({
            id: "cmd-workflow-workflow-mcp-dpp-fulfillment",
            capabilityId: "mcp.tool",
          }),
        ]),
        commandReceipts: expect.arrayContaining([
          expect.objectContaining({
            id: "build-command-receipt-fixture-context",
          }),
        ]),
        commandPolicyRules: expect.arrayContaining([
          expect.objectContaining({
            id: "command-policy-local-build-loop",
          }),
        ]),
        executionPlan: expect.arrayContaining([
          expect.objectContaining({
            id: "plan-safe-edits",
          }),
        ]),
        readinessGates: expect.arrayContaining([
          expect.objectContaining({
            id: "gate-safe-edits",
          }),
        ]),
        toolPermissions: expect.arrayContaining([
          expect.objectContaining({
            capabilityId: "psr.edit",
            approvalThreshold: "operator",
          }),
        ]),
      }),
    });
  });

  it("forwards autonomous queue runs with command bus context", async () => {
    appTestHarness.apiErrors.showAccountBalance = false;
    const { default: App } = await import("../App");
    const queuePayload = {
      ...digitalProductProBuildModePayload,
      taskId: "task-from-sagechat",
      autonomyPolicy: {
        ...digitalProductProBuildModePayload.autonomyPolicy,
        mode: "autonomous-local" as const,
        approvalRequiredCapabilityIds:
          digitalProductProBuildModePayload.autonomyPolicy.approvalRequiredCapabilityIds.filter(
            (capabilityId) => capabilityId !== "terminal.execute",
          ),
      },
      executionPlan: digitalProductProBuildModePayload.executionPlan.map(
        (step) => {
          if (step.id === "plan-safe-edits") {
            return { ...step, status: "complete" as const };
          }
          if (step.id === "plan-tests") {
            return { ...step, status: "ready" as const };
          }
          return step;
        },
      ),
      toolPermissions: digitalProductProBuildModePayload.toolPermissions.map(
        (permission) =>
          permission.capabilityId === "terminal.execute"
            ? {
                ...permission,
                approvalThreshold: "none" as const,
                decision: "allow" as const,
              }
            : permission,
      ),
    };

    render(<App />);

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: "valorBuildModeTask",
            payload: queuePayload,
          },
        }),
      );
    });

    fireEvent.click(
      await screen.findByRole("button", { name: "Run Autonomous Queue" }),
    );

    expect(appTestHarness.postMessage).toHaveBeenCalledWith({
      type: "valorBuildModeRunAutonomousQueue",
      payload: expect.objectContaining({
        taskId: "task-from-sagechat",
        scope: expect.objectContaining({
          principalId: "principal-valhalla-operator",
          tenantId: "tenant-valkyr-demo",
        }),
        autonomyPolicy: expect.objectContaining({
          mode: "autonomous-local",
        }),
        currentConsecutiveCommands: 0,
        creditEstimateId: "credit-estimate-dpp-001",
        estimatedCredits: 42,
        finalReportMarkdown: expect.stringContaining(
          "## Autonomous Queue Plan",
        ),
        grayMatterContextPack: expect.objectContaining({
          id: "gm-context-pack-dpp-001",
          invariantPreflightStatus: "passed",
          retrievalReceiptIds: ["retrieval-receipt-dpp-001"],
          retrievalStatus: "ready",
        }),
        providerRoute: "valkyr-credits",
        requireGrayMatterContext: true,
        promptContext: {
          promptProfileId: "prompt-profile-valhalla",
          promptProfileName: "Valhalla Build Operator",
          promptBundleId: "prompt-bundle-valhalla-001",
          promptBundleVersion: "2026.06.21",
          promptBundlePolicy: "locked",
          promptBundleReceiptIds: ["receipt-prompt-bundle-dpp-001"],
        },
        checkpoints: expect.arrayContaining([
          expect.objectContaining({
            id: "checkpoint-pre-edit-dpp",
          }),
        ]),
        agentRuntimes: expect.arrayContaining([
          expect.objectContaining({
            id: "runtime-codex-build-operator",
            ownerRole: "Supervisor",
          }),
        ]),
        swarmRoles: expect.arrayContaining([
          expect.objectContaining({
            role: "Supervisor",
            status: "assigned",
          }),
        ]),
        commands: [
          expect.objectContaining({
            id: "cmd-test",
            capabilityId: "terminal.execute",
            protectedPaths: [
              "apps/digital-product-pro/thorapi/redux/ProductService.tsx",
            ],
          }),
        ],
        commandCatalog: expect.arrayContaining([
          expect.objectContaining({
            id: "cmd-test",
            capabilityId: "terminal.execute",
          }),
        ]),
        commandReceipts: expect.arrayContaining([
          expect.objectContaining({
            id: "build-command-receipt-fixture-context",
          }),
        ]),
        commandPolicyRules: expect.arrayContaining([
          expect.objectContaining({
            id: "command-policy-local-build-loop",
          }),
        ]),
        executionPlan: expect.arrayContaining([
          expect.objectContaining({
            id: "plan-safe-edits",
          }),
        ]),
        readinessGates: expect.arrayContaining([
          expect.objectContaining({
            id: "gate-safe-edits",
          }),
        ]),
        toolPermissions: expect.arrayContaining([
          expect.objectContaining({
            capabilityId: "terminal.execute",
            decision: "allow",
          }),
        ]),
      }),
    });
  });

  it("forwards Build Mode approval metadata with command requests", async () => {
    appTestHarness.apiErrors.showAccountBalance = false;
    const { default: App } = await import("../App");

    render(<App />);

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: "valorBuildModeTask",
            payload: {
              taskId: "task-from-sagechat",
              appBundle: {
                id: "bundle-1",
                name: "SageChat App",
                version: "1.0.0",
                productLine: "Internal tools",
                intent: "Open Build Mode from SageChat.",
                sourceSessionId: "sagechat-1",
                createdAt: "2026-06-21T21:00:00.000Z",
                artifacts: [],
                componentBundleIds: [],
                execModuleIds: [],
              },
              grayMatterContextPack: {
                id: "ctx-1",
                compiledAt: "2026-06-21T21:00:00.000Z",
                source: "GrayMatter",
                policy: "answer-confidently",
                retrievalReceiptIds: ["receipt-1"],
                memoryEntryIds: ["memory-1"],
                summary: "Fixture context",
              },
            },
          },
        }),
      );
    });

    fireEvent.click(
      await screen.findByRole("button", { name: "Approve Browser Check" }),
    );

    expect(appTestHarness.postMessage).toHaveBeenCalledWith({
      type: "valorBuildModeRunCommand",
      payload: expect.objectContaining({
        approval: expect.objectContaining({
          approved: true,
          approverPrincipalId: "principal-valhalla-operator",
          threshold: "operator",
        }),
        browserPreviewUrl: "http://localhost:5173/apps/digital-product-pro",
        command: expect.objectContaining({
          capabilityId: "browser.automation",
          id: "cmd-approve",
        }),
        executionPlan: expect.arrayContaining([
          expect.objectContaining({
            id: "plan-safe-edits",
          }),
        ]),
        readinessGates: expect.arrayContaining([
          expect.objectContaining({
            id: "gate-safe-edits",
          }),
        ]),
      }),
    });
  });

  it("forwards scheduled automation refresh requests with command catalog context", async () => {
    appTestHarness.apiErrors.showAccountBalance = false;
    const { default: App } = await import("../App");

    render(<App />);

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: "valorBuildModeTask",
            payload: {
              taskId: "task-from-sagechat",
              appBundle: {
                id: "bundle-1",
                name: "SageChat App",
                version: "1.0.0",
                productLine: "Internal tools",
                intent: "Open Build Mode from SageChat.",
                sourceSessionId: "sagechat-1",
                createdAt: "2026-06-21T21:00:00.000Z",
                artifacts: [],
                componentBundleIds: [],
                execModuleIds: [],
              },
              grayMatterContextPack: {
                id: "ctx-1",
                compiledAt: "2026-06-21T21:00:00.000Z",
                source: "GrayMatter",
                policy: "answer-confidently",
                retrievalReceiptIds: ["receipt-1"],
                memoryEntryIds: ["memory-1"],
                summary: "Fixture context",
              },
            },
          },
        }),
      );
    });

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Refresh scheduled automations",
      }),
    );

    expect(appTestHarness.postMessage).toHaveBeenCalledWith({
      type: "valorBuildModeRunDueAutomations",
      payload: expect.objectContaining({
        taskId: "task-from-sagechat",
        scope: expect.objectContaining({
          principalId: "principal-valhalla-operator",
          tenantId: "tenant-valkyr-demo",
        }),
        providerRoute: "valkyr-credits",
        promptContext: {
          promptProfileId: "prompt-profile-valhalla",
          promptProfileName: "Valhalla Build Operator",
          promptBundleId: "prompt-bundle-valhalla-001",
          promptBundleVersion: "2026.06.21",
          promptBundlePolicy: "locked",
          promptBundleReceiptIds: ["receipt-prompt-bundle-dpp-001"],
        },
        commands: expect.arrayContaining([
          expect.objectContaining({
            capabilityId: "mcp.tool",
            id: "cmd-workflow-workflow-mcp-dpp-fulfillment",
          }),
          expect.objectContaining({
            capabilityId: "automation.schedule",
            id: "cmd-automation-automation-nightly-fulfillment-check",
          }),
        ]),
      }),
    });
  });

  it("forwards scheduled automation lifecycle status requests", async () => {
    appTestHarness.apiErrors.showAccountBalance = false;
    const { default: App } = await import("../App");

    render(<App />);

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: "valorBuildModeTask",
            payload: {
              taskId: "task-from-sagechat",
              appBundle: {
                id: "bundle-1",
                name: "SageChat App",
                version: "1.0.0",
                productLine: "Internal tools",
                intent: "Open Build Mode from SageChat.",
                sourceSessionId: "sagechat-1",
                createdAt: "2026-06-21T21:00:00.000Z",
                artifacts: [],
                componentBundleIds: [],
                execModuleIds: [],
              },
              grayMatterContextPack: {
                id: "ctx-1",
                compiledAt: "2026-06-21T21:00:00.000Z",
                source: "GrayMatter",
                policy: "answer-confidently",
                retrievalReceiptIds: ["receipt-1"],
                memoryEntryIds: ["memory-1"],
                summary: "Fixture context",
              },
            },
          },
        }),
      );
    });

    fireEvent.click(
      await screen.findByRole("button", { name: "Pause automation" }),
    );

    expect(appTestHarness.postMessage).toHaveBeenCalledWith({
      type: "valorBuildModeSetAutomationStatus",
      payload: {
        id: "automation-nightly-fulfillment-check",
        status: "paused",
      },
    });
  });
});
