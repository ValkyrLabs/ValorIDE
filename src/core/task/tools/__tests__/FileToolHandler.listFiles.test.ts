import type { ToolContext } from "../BaseToolHandler";

jest.mock("@services/glob/list-files", () => ({
  listFiles: jest.fn(),
}));

jest.mock("@services/ripgrep", () => ({
  regexSearchFiles: jest.fn(),
}));

jest.mock("@core/prompts/responses", () => ({
  formatResponse: {
    formatFilesList: jest.fn(),
    toolError: jest.fn((msg: string) => msg),
  },
}));

jest.mock("@integrations/notifications", () => ({
  showSystemNotification: jest.fn(),
}));

jest.mock("@services/telemetry/TelemetryService", () => ({
  telemetryService: {
    captureToolUsage: jest.fn(),
  },
}));

const { FileToolHandler } = jest.requireActual("../FileToolHandler") as typeof import("../FileToolHandler");
const { formatResponse } = jest.requireMock("@core/prompts/responses") as typeof import("@core/prompts/responses");
const { listFiles } = jest.requireMock("@services/glob/list-files") as typeof import("@services/glob/list-files");
const { regexSearchFiles } = jest.requireMock("@services/ripgrep") as typeof import("@services/ripgrep");

const makeHandler = (overrides: Partial<ToolContext> = {}) => {
  const baseContext: ToolContext = {
    valorideIgnoreController: { validateAccess: () => true } as any,
    fileContextTracker: {
      trackFileContext: jest.fn(),
      markFileAsEditedByValorIDE: jest.fn(),
    } as any,
    diffViewProvider: {
      isEditing: false,
      open: jest.fn(),
      update: jest.fn(),
      scrollToFirstDiff: jest.fn(),
      revertChanges: jest.fn(),
    } as any,
    terminalManager: {} as any,
    browserSession: {} as any,
    mcpHub: {} as any,
    urlContentFetcher: {} as any,
    workspaceTracker: {} as any,
    api: { getModel: () => ({ id: "test-model" }) } as any,
    taskId: "task-123",
    cwd: "/repo",
    autoApprovalSettings: { enabled: false, enableNotifications: false } as any,
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
    } as any;

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
    (handler as any).getPathAccess = () => ({ validateAccess: () => true });

    (listFiles as jest.Mock).mockResolvedValue([
      ["/repo/CHANGELOG.md", "/repo/src/index.ts"],
      false,
    ]);
    const formatFilesListMock = (formatResponse as any)
      .formatFilesList as jest.Mock;
    formatFilesListMock.mockReturnValue("CHANGELOG.md\nsrc/index.ts");

    const block = {
      type: "tool_use",
      name: "list_files",
      params: { path: ".", recursive: "false" },
    } as any;

    const result = await handler.execute(block, false);

    expect(result.shouldContinue).toBe(true);
    expect(removeMock).toHaveBeenCalledWith("say", "tool");

    const [, completeMessage] = (sayMock as jest.Mock).mock.calls[0];
    const parsed = JSON.parse(completeMessage);
    expect(parsed.content).toBe("CHANGELOG.md\nsrc/index.ts");
    expect(parsed.tool).toBe("listFilesTopLevel");
  });

  it("falls back to a broad search when search_files omits regex", async () => {
    const sayMock = jest.fn().mockResolvedValue(undefined);
    const missingParamMock = jest.fn().mockResolvedValue("missing regex");
    const handler = makeHandler({
      shouldAutoApproveToolWithPath: jest.fn().mockReturnValue(true),
      say: sayMock,
      sayAndCreateMissingParamError: missingParamMock,
    });
    (handler as any).getPathAccess = () => ({ validateAccess: () => true });
    (regexSearchFiles as jest.Mock).mockResolvedValue("src/index.ts\n|match");

    const block = {
      type: "tool_use",
      name: "search_files",
      params: { path: "." },
    } as any;

    const result = await handler.execute(block, false);

    expect(result.shouldContinue).toBe(true);
    expect(missingParamMock).not.toHaveBeenCalled();
    expect(regexSearchFiles).toHaveBeenCalledWith(
      "/repo",
      "/repo",
      ".",
      undefined,
      expect.anything(),
    );

    const [, completeMessage] = (sayMock as jest.Mock).mock.calls[0];
    const parsed = JSON.parse(completeMessage);
    expect(parsed.regex).toBe(".");
    expect(parsed.content).toContain("No search regex was provided");
    expect(parsed.content).toContain("src/index.ts");
  });
});

describe("FileToolHandler generated artifact write guard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("blocks write_to_file for generated ThorAPI artifacts before prompting", async () => {
    const askMock = jest.fn();
    const handler = makeHandler({
      ask: askMock,
      shouldAutoApproveToolWithPath: jest.fn().mockReturnValue(true),
    });
    (handler as any).getPathAccess = () => ({ validateAccess: () => true });

    const result = await handler.execute(
      {
        type: "tool_use",
        name: "write_to_file",
        params: {
          path: "webview-ui/src/thorapi/redux/ProductService.tsx",
          content: "export const hacked = true;",
        },
      } as any,
      false,
    );

    expect(result).toMatchObject({
      shouldContinue: true,
      toolResponse:
        "Generated ThorAPI artifact edits are blocked for webview-ui/src/thorapi/redux/ProductService.tsx. Update the OpenAPI/VAIX/ThorAPI source contract or template and regenerate instead.",
    });
    expect(askMock).not.toHaveBeenCalled();
  });

  it("blocks precision search and replace for generated artifacts", async () => {
    const handler = makeHandler({
      shouldAutoApproveToolWithPath: jest.fn().mockReturnValue(true),
    });
    (handler as any).getPathAccess = () => ({ validateAccess: () => true });

    const result = await handler.execute(
      {
        type: "tool_use",
        name: "precision_search_and_replace",
        params: {
          path: "src/generated/thorapi/Product.ts",
          edits: JSON.stringify([
            {
              kind: "contextual",
              find: "old",
              replace: "new",
            },
          ]),
        },
      } as any,
      false,
    );

    expect(result).toMatchObject({
      shouldContinue: true,
      toolResponse:
        "Generated ThorAPI artifact edits are blocked for src/generated/thorapi/Product.ts. Update the OpenAPI/VAIX/ThorAPI source contract or template and regenerate instead.",
    });
  });
});
