import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";

const appTestHarness = vi.hoisted(() => ({
  accountProps: vi.fn(),
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

vi.mock("../components/usage-tracking/UsageTrackingHandler", () => ({
  __esModule: true,
  UsageTrackingHandler: () => null,
}));

vi.mock("../components/content-data/ContentDataHandler", () => ({
  __esModule: true,
  ContentDataHandler: () => null,
}));

vi.mock("../components/usage-tracking/StartupDebit", () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock("react-redux", () => ({
  useSelector: (selector: any) =>
    selector({ apiErrors: appTestHarness.apiErrors }),
  useDispatch: () => vi.fn(),
}));

vi.mock("../context/ExtensionStateContext", () => ({
  ExtensionStateContextProvider: ({ children }: { children: any }) => children,
  useExtensionState: () => ({
    didHydrateState: true,
    showWelcome: false,
    shouldShowAnnouncement: false,
    telemetrySetting: "unset",
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
    appTestHarness.apiErrors.showAccountBalance = true;
    appTestHarness.apiErrors.creditIntent = undefined;
    (globalThis as any).localStorage = mockStorage();
    (globalThis as any).sessionStorage = mockStorage();
    (globalThis as any).acquireVsCodeApi = () => ({
      postMessage: vi.fn(),
      setState: vi.fn(),
      getState: vi.fn(),
    });
  });

  afterEach(() => {
    delete (globalThis as any).localStorage;
    delete (globalThis as any).sessionStorage;
    delete (globalThis as any).acquireVsCodeApi;
  });

  it("opens account view when insufficient credits flag is set", async () => {
    const { default: App } = await import("../App");

    render(<App />);

    await waitFor(() =>
      expect(screen.getByTestId("account-view")).toBeInTheDocument(),
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
});
