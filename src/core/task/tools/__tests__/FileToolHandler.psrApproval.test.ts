import type { ToolContext } from "../BaseToolHandler";

jest.mock("@services/glob/list-files", () => ({ listFiles: jest.fn() }));
jest.mock("@services/ripgrep", () => ({ regexSearchFiles: jest.fn() }));
jest.mock("@services/psr", () => ({ precisionSearchAndReplace: jest.fn() }));
jest.mock("@core/prompts/responses", () => ({
  formatResponse: {
    toolError: (text: string) => text,
    toolResult: (text: string) => text,
  },
}));
jest.mock("@services/telemetry/TelemetryService", () => ({
  telemetryService: { captureToolUsage: jest.fn() },
}));
jest.mock("@integrations/notifications", () => ({
  showSystemNotification: jest.fn(),
}));

const { FileToolHandler } = jest.requireActual(
  "../FileToolHandler",
) as typeof import("../FileToolHandler");
const { precisionSearchAndReplace } = jest.requireMock("@services/psr");
const block = {
  type: "tool_use",
  name: "precision_search_and_replace",
  params: {
    path: "quote-total.cjs",
    edits: JSON.stringify([
      {
        kind: "contextual",
        find: "sum + item.unitCents",
        replace: "sum + item.unitCents * item.quantity",
      },
    ]),
  },
} as any;

function makeHandler(autoApprove = false) {
  const context = {
    cwd: "/repo",
    taskId: "bounded-edit",
    autoApprovalSettings: { enabled: true, enableNotifications: false },
    consecutiveAutoApprovedRequestsCount: 0,
    shouldAutoApproveToolWithPath: jest.fn().mockReturnValue(autoApprove),
    removeLastPartialMessageIfExistsWithType: jest.fn(),
    ask: jest.fn().mockResolvedValue({ response: "yesButtonClicked" }),
    say: jest.fn().mockResolvedValue(undefined),
    saveCheckpoint: jest.fn().mockResolvedValue(undefined),
    fileContextTracker: {
      markFileAsEditedByValorIDE: jest.fn(),
      trackFileContext: jest.fn(),
    },
  } as unknown as ToolContext;
  const handler = new FileToolHandler(context);
  (handler as any).getPathAccess = () => ({ validateAccess: () => true });
  return { handler, context };
}

beforeEach(() => {
  jest.clearAllMocks();
  precisionSearchAndReplace.mockResolvedValue({
    baseHash: "before",
    postHash: "after",
    editsApplied: 1,
    editsRequested: 1,
    bytesDelta: 16,
    skipped: [],
    warnings: [],
  });
});

it("does not edit or checkpoint while the exact PSR decision is pending", async () => {
  const { handler, context } = makeHandler();
  let decide!: (value: any) => void;
  (context.ask as jest.Mock).mockReturnValue(
    new Promise((resolve) => {
      decide = resolve;
    }),
  );
  const pending = handler.execute(block, false);
  await Promise.resolve();
  expect(context.ask).toHaveBeenCalledWith("tool", expect.any(String), false);
  const decision = JSON.parse((context.ask as jest.Mock).mock.calls[0][1]);
  expect(decision).toMatchObject({
    tool: "precisionSearchAndReplace",
    path: "quote-total.cjs",
  });
  expect(JSON.parse(decision.content).edits).toEqual(
    JSON.parse(block.params.edits),
  );
  expect(precisionSearchAndReplace).not.toHaveBeenCalled();
  expect(context.saveCheckpoint).not.toHaveBeenCalled();
  decide({ response: "yesButtonClicked" });
  expect(await pending).toMatchObject({ outcome: "succeeded" });
  expect(precisionSearchAndReplace).toHaveBeenCalledTimes(1);
  expect(context.saveCheckpoint).toHaveBeenCalledTimes(1);
  expect(context.consecutiveAutoApprovedRequestsCount).toBe(0);
});

for (const response of ["noButtonClicked", "messageResponse"]) {
  it(`does not edit after ${response}`, async () => {
    const { handler, context } = makeHandler();
    (context.ask as jest.Mock).mockResolvedValue({
      response,
      text: "Leave the file alone",
    });
    expect(await handler.execute(block, false)).toMatchObject({
      outcome: "rejected",
      userRejected: true,
    });
    expect(precisionSearchAndReplace).not.toHaveBeenCalled();
    expect(context.saveCheckpoint).not.toHaveBeenCalled();
  });
}

it("uses existing path-scoped auto approval when the user enables file edits", async () => {
  const { handler, context } = makeHandler(true);
  expect(await handler.execute(block, false)).toMatchObject({
    outcome: "succeeded",
  });
  expect(context.shouldAutoApproveToolWithPath).toHaveBeenCalledWith(
    "precision_search_and_replace",
    "quote-total.cjs",
  );
  expect(context.ask).not.toHaveBeenCalled();
  expect(precisionSearchAndReplace).toHaveBeenCalledTimes(1);
  expect(context.consecutiveAutoApprovedRequestsCount).toBe(1);
});
