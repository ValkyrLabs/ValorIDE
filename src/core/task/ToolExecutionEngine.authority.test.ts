jest.mock("serialize-error", () => ({ serializeError: (value: any) => value }));
jest.mock("@integrations/notifications", () => ({ showSystemNotification: jest.fn() }));
jest.mock("@integrations/misc/extract-text", () => ({}));
jest.mock("@services/glob/list-files", () => ({}));
jest.mock("@services/tree-sitter", () => ({}));
jest.mock("@services/ripgrep", () => ({}));
jest.mock("@core/prompts/loadMcpDocumentation", () => ({}));
jest.mock("@services/telemetry/TelemetryService", () => ({ telemetryService: { captureUnknownTool: jest.fn() } }));
jest.mock("@services/logging/Logger", () => ({ Logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.mock("./tools/FileToolHandler", () => ({ FileToolHandler: class {} }));
jest.mock("./tools/CommandToolHandler", () => ({ CommandToolHandler: class {} }));
jest.mock("./tools/BrowserToolHandler", () => ({ BrowserToolHandler: class {} }));
jest.mock("@core/hooks/ValorIDEHookService", () => ({ ValorIDEHookService: class {} }));
import { ToolExecutionEngine } from "./ToolExecutionEngine";

describe("shared tool authority state", () => {
  it("sees settings reductions after engine creation and charges native auto-approval to the task quota", () => {
    const task = { taskId: "task", autoApprovalSettings: { enabled: true }, consecutiveAutoApprovedRequestsCount: 2,
      ask: jest.fn(), say: jest.fn(), shouldAutoApproveTool: jest.fn(), shouldAutoApproveToolWithPath: jest.fn(),
      sayAndCreateMissingParamError: jest.fn(), removeLastPartialMessageIfExistsWithType: jest.fn(),
      shouldAutoApproveCommand: jest.fn(() => false), recordCommandApproval: jest.fn(), recordCommandOutcome: jest.fn() };
    const engine = new ToolExecutionEngine(task, "/tmp");
    const context = (engine as any).toolManager.context;
    task.autoApprovalSettings = { enabled: false };
    expect(context.autoApprovalSettings.enabled).toBe(false);
    context.consecutiveAutoApprovedRequestsCount++;
    expect(task.consecutiveAutoApprovedRequestsCount).toBe(3);
    expect(context.shouldAutoApproveCommand("fixture", false)).toBe(false);
    expect(task.shouldAutoApproveCommand).toHaveBeenCalledWith("fixture", false);
    context.recordCommandApproval("fixture", false); context.recordCommandOutcome("fixture", "unknown");
    expect(task.recordCommandApproval).toHaveBeenCalledWith("fixture", false);
    expect(task.recordCommandOutcome).toHaveBeenCalledWith("fixture", "unknown");
  });
});
