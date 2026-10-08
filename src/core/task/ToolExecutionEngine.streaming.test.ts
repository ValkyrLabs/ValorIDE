import { expect, it } from "@jest/globals";
jest.mock("serialize-error", () => ({ serializeError: (value: any) => value }));
jest.mock("@integrations/notifications", () => ({
  showSystemNotification: jest.fn(),
}));
jest.mock("@integrations/misc/extract-text", () => ({}));
jest.mock("@services/glob/list-files", () => ({}));
jest.mock("@services/tree-sitter", () => ({}));
jest.mock("@services/ripgrep", () => ({}));
jest.mock("@core/prompts/loadMcpDocumentation", () => ({}));
jest.mock("@services/telemetry/TelemetryService", () => ({
  telemetryService: { captureUnknownTool: jest.fn() },
}));
jest.mock("@services/logging/Logger", () => ({
  Logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock("./tools/FileToolHandler", () => ({ FileToolHandler: class {} }));
jest.mock("./tools/CommandToolHandler", () => ({
  CommandToolHandler: class {
    execute = jest.fn(async () => ({ shouldContinue: false }));
  },
}));
jest.mock("./tools/BrowserToolHandler", () => ({
  BrowserToolHandler: class {},
}));
jest.mock("@core/hooks/ValorIDEHookService", () => ({
  ValorIDEHookService: class {},
}));
import { ToolExecutionEngine } from "./ToolExecutionEngine";

it("handles command fragments once without legacy replay, browser shutdown or per-fragment logging", async () => {
  const task = {
    taskId: "streaming",
    autoApprovalSettings: { enabled: true },
    consecutiveAutoApprovedRequestsCount: 0,
    ask: jest.fn(),
    say: jest.fn(),
    shouldAutoApproveTool: jest.fn(),
    shouldAutoApproveToolWithPath: jest.fn(),
    sayAndCreateMissingParamError: jest.fn(),
    removeLastPartialMessageIfExistsWithType: jest.fn(),
    browserSession: { closeBrowser: jest.fn() },
    saveCheckpoint: jest.fn(),
  };
  const engine = new ToolExecutionEngine(task, "/tmp");
  for (let n = 0; n < 100; n++) {
    const result = await engine.executeToolBlock(
      {
        type: "tool_use",
        name: "execute_command",
        partial: true,
        params: { command: `git status ${n}` },
      },
      () => "execute_command",
      [],
      false,
      false,
      (_tag, text) => text ?? "",
      () => {},
    );
    expect(result).toEqual({
      handled: true,
      shouldContinue: false,
      didRejectTool: false,
      didAlreadyUseTool: false,
    });
  }
  expect(task.browserSession.closeBrowser).not.toHaveBeenCalled();
  expect(task.saveCheckpoint).not.toHaveBeenCalled();
  const { Logger } = jest.requireMock("@services/logging/Logger") as any;
  expect(Logger.info).not.toHaveBeenCalled();
});
