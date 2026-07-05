jest.mock("@core/task/ToolApprovalManager", () => ({
  ToolApprovalManager: {
    normalizeApprovalResponse: jest.fn(() => ({ approved: true })),
  },
}));

const { BrowserToolHandler } = jest.requireActual(
  "./BrowserToolHandler",
) as typeof import("./BrowserToolHandler");

describe("BrowserToolHandler", () => {
  const createContext = () => {
    const calls: string[] = [];
    const browserSession = {
      click: jest.fn(),
      closeBrowser: jest.fn(async () => ({})),
      launchBrowser: jest.fn(async () => {
        calls.push("launchBrowser");
      }),
      navigateToUrl: jest.fn(async () => {
        calls.push("navigateToUrl");
        return {
          currentUrl: "https://www.google.com/search?q=Valkyr+Labs+Inc",
          logs: "loaded",
          screenshot: "data:image/png;base64,test",
        };
      }),
      scrollDown: jest.fn(),
      scrollUp: jest.fn(),
      type: jest.fn(),
    };

    const say = jest.fn(async (type: string) => {
      calls.push(`say:${type}`);
      return undefined;
    });

    return {
      calls,
      context: {
        ask: jest.fn(),
        browserSession,
        consecutiveAutoApprovedRequestsCount: 0,
        consecutiveMistakeCount: 0,
        removeLastPartialMessageIfExistsWithType: jest.fn(),
        say,
        sayAndCreateMissingParamError: jest.fn(),
        shouldAutoApproveTool: jest.fn(() => true),
      },
    };
  };

  it("launches the browser before navigating and emits browser result state", async () => {
    const { calls, context } = createContext();
    const handler = new BrowserToolHandler(context as any);

    const result = await handler.execute(
      {
        id: "tool-1",
        input: {},
        name: "browser_action",
        params: {
          action: "launch",
          url: "https://www.google.com/search?q=Valkyr+Labs+Inc",
        },
        partial: false,
        type: "tool_use",
      } as any,
      false,
    );

    expect(result.shouldContinue).toBe(true);
    expect(context.browserSession.launchBrowser).toHaveBeenCalledTimes(1);
    expect(context.browserSession.navigateToUrl).toHaveBeenCalledWith(
      "https://www.google.com/search?q=Valkyr+Labs+Inc",
    );
    expect(calls).toEqual([
      "say:browser_action_launch",
      "say:browser_action_result",
      "launchBrowser",
      "navigateToUrl",
      "say:browser_action_result",
    ]);
    expect(context.say).toHaveBeenNthCalledWith(
      1,
      "browser_action_launch",
      "https://www.google.com/search?q=Valkyr+Labs+Inc",
      undefined,
      false,
    );
    expect(
      context.removeLastPartialMessageIfExistsWithType,
    ).toHaveBeenCalledWith("say", "browser_action_launch");
    expect(
      context.removeLastPartialMessageIfExistsWithType,
    ).toHaveBeenCalledWith("say", "browser_action");
    expect(context.say).toHaveBeenNthCalledWith(
      2,
      "browser_action_result",
      "",
    );
    expect(context.say).toHaveBeenNthCalledWith(
      3,
      "browser_action_result",
      JSON.stringify({
        currentUrl: "https://www.google.com/search?q=Valkyr+Labs+Inc",
        logs: "loaded",
        screenshot: "data:image/png;base64,test",
      }),
    );
  });

  it("normalizes streamed launch tags instead of rendering a bogus browser action", async () => {
    const { context } = createContext();
    const handler = new BrowserToolHandler(context as any);

    const result = await handler.execute(
      {
        id: "tool-1",
        input: {},
        name: "browser_action",
        params: {
          action: "launch</action",
          url: "https://valkyrlabs.com</url",
        },
        partial: true,
        type: "tool_use",
      } as any,
      true,
    );

    expect(result.shouldContinue).toBe(false);
    expect(context.say).toHaveBeenCalledWith(
      "browser_action_launch",
      "https://valkyrlabs.com",
      undefined,
      true,
    );
    expect(context.say).not.toHaveBeenCalledWith(
      "browser_action",
      expect.any(String),
      undefined,
      true,
    );
  });
});
