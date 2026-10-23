import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { VALKYR_LABS_API_TIMEOUT_MS } from "@shared/ValkyrLabsApi";
import SettingsView from "./SettingsView";

const harness = vi.hoisted(() => ({ postMessage: vi.fn(), onDone: vi.fn() }));

vi.mock("@thorapi/utils/vscode", () => ({
  vscode: { postMessage: harness.postMessage },
}));
vi.mock("@thorapi/src", () => ({ setBasePath: vi.fn() }));
vi.mock("@thorapi/context/ExtensionStateContext", () => ({
  useExtensionState: () => ({
    apiConfiguration: { valkyraiHost: "https://old.example/v1" },
    chatSettings: { mode: "act" },
    openRouterModels: {},
    setCustomInstructions: vi.fn(),
    setTelemetrySetting: vi.fn(),
    setPlanActSeparateModelsSetting: vi.fn(),
  }),
}));
vi.mock("@thorapi/utils/validate", () => ({
  validateApiConfiguration: () => undefined,
  validateModelId: () => undefined,
}));
vi.mock("@thorapi/context/CommunicationServiceContext", () => ({
  useCommunicationService: () => ({}),
}));
vi.mock("./ApiOptions", () => ({ default: () => null }));
vi.mock("./BrowserSettingsSection", () => ({ default: () => null }));
vi.mock("../LLMDetailsSelector", () => ({ default: () => null }));
vi.mock("@thorapi/components/SystemAlerts", () => ({ default: () => null }));
vi.mock("@thorapi/components/common/OfflineBanner", () => ({
  default: () => null,
}));
vi.mock("@thorapi/components/common/SettingsButton", () => ({
  default: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}));
vi.mock("../mcp/configuration/McpConfigurationView", () => ({
  TabButton: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
}));
vi.mock("@vscode/webview-ui-toolkit/react", () => ({
  VSCodeButton: ({ children, appearance: _appearance, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
  VSCodeCheckbox: ({ children, ...props }: any) => (
    <label>
      <input type="checkbox" {...props} />
      {children}
    </label>
  ),
  VSCodeLink: ({ children, ...props }: any) => <a {...props}>{children}</a>,
  VSCodeProgressRing: () => <span>Working</span>,
  VSCodeTextArea: ({ children, ...props }: any) => (
    <label>
      {children}
      <textarea {...props} />
    </label>
  ),
  VSCodeTextField: ({ children, ...props }: any) => (
    <label>
      {children}
      <input {...props} />
    </label>
  ),
}));

const response = (data: Record<string, unknown>) =>
  act(() => {
    window.dispatchEvent(new MessageEvent("message", { data }));
  });
const openBackend = () => {
  render(<SettingsView onDone={harness.onDone} />);
  fireEvent.click(screen.getByRole("button", { name: "ValkyrAI Backend" }));
};
const startTest = (host = "https://new.example") => {
  fireEvent.input(screen.getByLabelText("Base URL"), {
    target: { value: host },
  });
  fireEvent.click(screen.getByRole("button", { name: "Test & Save" }));
  return harness.postMessage.mock.calls.find(
    ([message]) => message.type === "testValkyraiHost",
  )?.[0];
};

describe("ValkyrAI backend Test & Save", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const stored = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => stored.set(key, value),
      removeItem: (key: string) => stored.delete(key),
    });
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("tests a normalized URL, then waits for persistence confirmation without closing", () => {
    openBackend();
    const request = startTest("  https://new.example///  ");
    expect(request).toEqual({
      type: "testValkyraiHost",
      valkyraiHost: "https://new.example/v1",
      requestId: expect.any(String),
    });
    expect(harness.postMessage).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Testing…")).toBeInTheDocument();
    response({
      type: "valkyraiHostTestResult",
      requestId: request.requestId,
      host: request.valkyraiHost,
      success: true,
    });
    expect(harness.postMessage).toHaveBeenLastCalledWith({
      type: "updateValkyraiHost",
      valkyraiHost: request.valkyraiHost,
      requestId: request.requestId,
    });
    expect(screen.getByText("Saving…")).toBeInTheDocument();
    expect(screen.queryByText("Connected & saved")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Base URL")).toBeDisabled();
    response({
      type: "valkyraiHostSaveResult",
      requestId: request.requestId,
      host: request.valkyraiHost,
      success: true,
    });
    expect(screen.getByText("Connected & saved")).toBeInTheDocument();
    expect(screen.getByLabelText("Base URL")).toHaveValue(request.valkyraiHost);
    expect(harness.onDone).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Test & Save" })).toBeEnabled();
  });

  it("keeps connection failures visible and does not save", () => {
    openBackend();
    const request = startTest();
    response({
      type: "valkyraiHostTestResult",
      requestId: request.requestId,
      host: request.valkyraiHost,
      success: false,
      error: "Connection refused",
    });
    expect(screen.getByText("Connection refused")).toBeInTheDocument();
    expect(screen.getByText("Unavailable")).toBeInTheDocument();
    expect(harness.postMessage).toHaveBeenCalledTimes(1);
    expect(harness.onDone).not.toHaveBeenCalled();
  });

  it("saves an auth-protected host with an explicit sign-in status", () => {
    openBackend();
    const request = startTest();
    response({
      type: "valkyraiHostTestResult",
      requestId: request.requestId,
      host: request.valkyraiHost,
      success: true,
      requiresAuth: true,
    });
    response({
      type: "valkyraiHostSaveResult",
      requestId: request.requestId,
      host: request.valkyraiHost,
      success: true,
    });
    expect(screen.getByText("Saved (sign in required)")).toBeInTheDocument();
    expect(screen.queryByText("Connected & saved")).not.toBeInTheDocument();
    expect(harness.onDone).not.toHaveBeenCalled();
  });

  it("reports save failures separately from a successful test", () => {
    openBackend();
    const request = startTest();
    response({
      type: "valkyraiHostTestResult",
      requestId: request.requestId,
      host: request.valkyraiHost,
      success: true,
    });
    response({
      type: "valkyraiHostSaveResult",
      requestId: request.requestId,
      host: request.valkyraiHost,
      success: false,
      error: "Settings file is read-only",
    });
    expect(screen.getByText("Save failed")).toBeInTheDocument();
    expect(screen.getByText("Settings file is read-only")).toBeInTheDocument();
    expect(screen.queryByText("Connected & saved")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Test & Save" })).toBeEnabled();
    expect(harness.onDone).not.toHaveBeenCalled();
  });

  it("ignores unsolicited, stale, mismatched and duplicate test results", () => {
    openBackend();
    response({
      type: "valkyraiHostTestResult",
      host: "https://other.example/v1",
      success: true,
    });
    expect(harness.postMessage).not.toHaveBeenCalled();
    const request = startTest();
    response({
      type: "valkyraiHostTestResult",
      requestId: "old-request",
      host: request.valkyraiHost,
      success: true,
    });
    response({
      type: "valkyraiHostTestResult",
      requestId: request.requestId,
      host: "https://other.example/v1",
      success: true,
    });
    expect(harness.postMessage).toHaveBeenCalledTimes(1);
    const result = {
      type: "valkyraiHostTestResult",
      requestId: request.requestId,
      host: request.valkyraiHost,
      success: true,
    };
    response(result);
    response(result);
    expect(harness.postMessage).toHaveBeenCalledTimes(2);
    response({
      type: "valkyraiHostSaveResult",
      requestId: "old-request",
      host: request.valkyraiHost,
      success: true,
    });
    expect(screen.getByText("Saving…")).toBeInTheDocument();
  });

  it.each([
    "",
    "invalid",
    "http://remote.example",
    "ftp://localhost",
    "https://user:secret@new.example",
    "https://new.example?token=value",
  ])("rejects invalid base URL %s before dispatch", (host) => {
    openBackend();
    startTest(host);
    expect(screen.getByText("Validation failed")).toBeInTheDocument();
    expect(harness.postMessage).not.toHaveBeenCalled();
    expect(harness.onDone).not.toHaveBeenCalled();
  });

  it("routes the header Save through backend testing instead of closing", () => {
    openBackend();
    fireEvent.input(screen.getByLabelText("Base URL"), {
      target: { value: "http://localhost:8080" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(harness.postMessage).toHaveBeenLastCalledWith({
      type: "testValkyraiHost",
      valkyraiHost: "http://localhost:8080/v1",
      requestId: expect.any(String),
    });
    expect(harness.onDone).not.toHaveBeenCalled();
  });

  it("tests the default when resetting and keeps the existing settings panel", () => {
    openBackend();
    fireEvent.click(screen.getByRole("button", { name: "Reset to default" }));
    expect(harness.postMessage).toHaveBeenLastCalledWith({
      type: "testValkyraiHost",
      valkyraiHost: "https://api-0.valkyrlabs.com/v1",
      requestId: expect.any(String),
    });
    expect(harness.onDone).not.toHaveBeenCalled();
  });

  it("reports an unanswered test and ignores late results after the shared deadline", () => {
    vi.useFakeTimers();
    openBackend();
    const request = startTest();
    act(() => vi.advanceTimersByTime(VALKYR_LABS_API_TIMEOUT_MS + 1000));
    expect(screen.getByText("No response")).toBeInTheDocument();
    response({
      type: "valkyraiHostTestResult",
      requestId: request.requestId,
      host: request.valkyraiHost,
      success: true,
    });
    expect(harness.postMessage).toHaveBeenCalledTimes(1);
    expect(harness.onDone).not.toHaveBeenCalled();
  });
});
