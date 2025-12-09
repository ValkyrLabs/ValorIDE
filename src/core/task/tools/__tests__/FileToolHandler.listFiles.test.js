import { FileToolHandler } from "../FileToolHandler";
import { formatResponse } from "@core/prompts/responses";
import { listFiles } from "@services/glob/list-files";
jest.mock("@services/glob/list-files", () => ({
  listFiles: jest.fn(),
}));
jest.mock("@core/prompts/responses", () => ({
  formatResponse: {
    formatFilesList: jest.fn(),
    toolError: jest.fn((msg) => msg),
  },
}));
jest.mock("@integrations/notifications", () => ({
  showSystemNotification: jest.fn(),
}));
const makeHandler = (overrides = {}) => {
  const baseContext = {
    valorideIgnoreController: { validateAccess: () => true },
    fileContextTracker: {
      trackFileContext: jest.fn(),
      markFileAsEditedByValorIDE: jest.fn(),
    },
    diffViewProvider: {
      isEditing: false,
      open: jest.fn(),
      update: jest.fn(),
      scrollToFirstDiff: jest.fn(),
      revertChanges: jest.fn(),
    },
    terminalManager: {},
    browserSession: {},
    mcpHub: {},
    urlContentFetcher: {},
    workspaceTracker: {},
    api: { getModel: () => ({ id: "test-model" }) },
    taskId: "task-123",
    cwd: "/repo",
    autoApprovalSettings: { enabled: false, enableNotifications: false },
    didEditFile: false,
    consecutiveMistakeCount: 0,
    consecutiveAutoApprovedRequestsCount: 0,
    say: jest.fn().mockResolvedValue(undefined),
    ask: jest.fn().mockResolvedValue({ response: "yesButtonClicked" }),
    saveCheckpoint: jest.fn(),
    shouldAutoApproveTool: jest.fn().mockReturnValue(false),
    shouldAutoApproveToolWithPath: jest.fn().mockReturnValue(false),
    sayAndCreateMissingParamError: jest.fn(),
    removeLastPartialMessageIfExistsWithType: jest.fn(),
    didRejectTool: false,
    didAlreadyUseTool: false,
  };
  return new FileToolHandler({ ...baseContext, ...overrides });
};
describe("FileToolHandler list_files approval updates", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it("removes prior partial say message when auto-approving a partial list_files", async () => {
    const removeMock = jest.fn().mockResolvedValue(undefined);
    const sayMock = jest.fn().mockResolvedValue(undefined);
    const handler = makeHandler({
      shouldAutoApproveToolWithPath: jest.fn().mockReturnValue(true),
      removeLastPartialMessageIfExistsWithType: removeMock,
      say: sayMock,
    });
    const block = {
      type: "tool_use",
      name: "list_files",
      params: { path: ".", recursive: "false" },
    };
    const result = await handler.execute(block, true);
    expect(result.shouldContinue).toBe(false);
    expect(removeMock).toHaveBeenCalledWith("say", "tool");
  });
  it("clears the partial say and forwards the listing when auto-approved list_files completes", async () => {
    const removeMock = jest.fn().mockResolvedValue(undefined);
    const sayMock = jest.fn().mockResolvedValue(undefined);
    const handler = makeHandler({
      shouldAutoApproveToolWithPath: jest.fn().mockReturnValue(true),
      removeLastPartialMessageIfExistsWithType: removeMock,
      say: sayMock,
    });
    // Avoid real path access logic for this test
    handler.getPathAccess = () => ({ validateAccess: () => true });
    listFiles.mockResolvedValue([
      ["/repo/CHANGELOG.md", "/repo/src/index.ts"],
      false,
    ]);
    const formatFilesListMock = formatResponse.formatFilesList;
    formatFilesListMock.mockReturnValue("CHANGELOG.md\nsrc/index.ts");
    const block = {
      type: "tool_use",
      name: "list_files",
      params: { path: ".", recursive: "false" },
    };
    const result = await handler.execute(block, false);
    expect(result.shouldContinue).toBe(true);
    expect(removeMock).toHaveBeenCalledWith("say", "tool");
    const [, completeMessage] = sayMock.mock.calls[0];
    const parsed = JSON.parse(completeMessage);
    expect(parsed.content).toBe("CHANGELOG.md\nsrc/index.ts");
    expect(parsed.tool).toBe("listFilesTopLevel");
  });
});
//# sourceMappingURL=FileToolHandler.listFiles.test.js.map
