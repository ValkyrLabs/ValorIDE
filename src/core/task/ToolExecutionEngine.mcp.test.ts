export {};
jest.mock("serialize-error", () => ({
  serializeError: (error: any) => ({ message: error.message }),
}));
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
  CommandToolHandler: class {},
}));
jest.mock("./tools/BrowserToolHandler", () => ({
  BrowserToolHandler: class {},
}));
jest.mock("@core/hooks/ValorIDEHookService", () => ({
  ValorIDEHookService: class {
    findHookScripts = jest.fn(() => []);
    runPreToolUse = jest.fn(async () => undefined);
    runPostToolUse = jest.fn(async () => undefined);
  },
}));
const { ToolExecutionEngine } = jest.requireActual<
  typeof import("./ToolExecutionEngine")
>("./ToolExecutionEngine");

function fixture(
  name: "use_mcp_tool" | "access_mcp_resource" = "use_mcp_tool",
) {
  const order: string[] = [];
  const server = {
    name: "demo",
    status: "connected",
    disabled: false,
    tools: [
      {
        name: "inspect",
        autoApprove: false,
        inputSchema: { required: ["id"] },
      },
    ],
  };
  const hub = {
    getServers: jest.fn(() => [server]),
    callTool: jest.fn(async (..._args: any[]) => {
      order.push("dispatch");
      return { content: [{ type: "text", text: "record-1" }] };
    }),
    readResource: jest.fn(async (..._args: any[]) => {
      order.push("dispatch");
      return { contents: [{ uri: "demo://record", text: "record-1" }] };
    }),
  };
  const task = {
    taskId: "task-1",
    abort: false,
    abandoned: false,
    autoApprovalSettings: { enabled: false },
    consecutiveAutoApprovedRequestsCount: 0,
    consecutiveMistakeCount: 0,
    mcpHub: hub,
    api: { getModel: () => ({ info: { supportsImages: true } }) },
    ask: jest.fn(async (..._args: any[]) => {
      order.push("approval");
      return { response: "yesButtonClicked" } as any;
    }),
    say: jest.fn(async (..._args: any[]) => undefined),
    saveCheckpoint: jest.fn(async (..._args: any[]) => {
      order.push("checkpoint");
    }),
    shouldAutoApproveTool: jest.fn(() => false),
    shouldAutoApproveToolWithPath: () => false,
    sayAndCreateMissingParamError: jest.fn(
      async (...args: string[]) => `Missing ${args.join(" ")}`,
    ),
    removeLastPartialMessageIfExistsWithType: jest.fn(async () => undefined),
    browserSession: { closeBrowser: jest.fn(async () => undefined) },
  };
  const engine = new ToolExecutionEngine(task, "/tmp");
  const hooks = (engine as any).hookService;
  const results: any[] = [];
  const block: any = {
    type: "tool_use",
    name,
    partial: false,
    params:
      name === "use_mcp_tool"
        ? {
            server_name: "demo",
            tool_name: "inspect",
            arguments: '{"id":"original"}',
          }
        : { server_name: "demo", uri: "demo://record" },
  };
  const feedback = jest.fn();
  const call = (reject = false, used = false) =>
    engine.executeToolBlock(
      block,
      () => name,
      results,
      reject,
      used,
      () => "",
      feedback,
    );
  return { task, hub, server, hooks, results, call, block, order, feedback };
}

describe("MCP through the shared execution engine", () => {
  for (const name of ["use_mcp_tool", "access_mcp_resource"] as const) {
    it(`${name} reaches one approval, checkpoint, dispatch and observed post-hook`, async () => {
      const f = fixture(name);
      expect(await f.call()).toMatchObject({
        handled: true,
        didAlreadyUseTool: true,
      });
      expect(f.order.slice(0, 3)).toEqual([
        "approval",
        "checkpoint",
        "dispatch",
      ]);
      expect(f.hooks.runPostToolUse).toHaveBeenCalledWith(
        expect.objectContaining({ outcome: "succeeded", success: true }),
      );
      expect(JSON.stringify(f.results)).toContain("record-1");
    });
    it(`${name} partial preview is handled without consuming or dispatching`, async () => {
      const f = fixture(name);
      f.block.partial = true;
      expect(await f.call()).toMatchObject({
        handled: true,
        didAlreadyUseTool: false,
      });
      expect(f.hub.callTool).not.toHaveBeenCalled();
      expect(f.hub.readResource).not.toHaveBeenCalled();
      expect(f.hooks.runPostToolUse).not.toHaveBeenCalled();
      f.block.partial = false;
      expect(await f.call()).toMatchObject({
        handled: true,
        didAlreadyUseTool: true,
      });
    });
    it(`${name} denial preserves feedback and prevents dispatch`, async () => {
      const f = fixture(name);
      f.task.ask.mockResolvedValue({
        response: "messageResponse",
        text: "Inspect first",
      });
      expect(await f.call()).toMatchObject({
        handled: true,
        didRejectTool: true,
      });
      expect(f.feedback).toHaveBeenCalledWith({
        text: "Inspect first",
        images: undefined,
      });
      expect(f.order).not.toContain("dispatch");
      expect(f.hooks.runPostToolUse).toHaveBeenCalledWith(
        expect.objectContaining({ outcome: "rejected", success: false }),
      );
    });
    it(`${name} stops after cancellation during checkpoint`, async () => {
      const f = fixture(name);
      f.task.saveCheckpoint.mockImplementation(async () => {
        f.task.abort = true;
      });
      await f.call();
      expect(f.order).not.toContain("dispatch");
      expect(JSON.stringify(f.results)).toContain("TASK_ENDED");
    });
    it(`${name} preserves received data when its response card fails`, async () => {
      const f = fixture(name);
      f.task.say.mockImplementation(async (kind: string) => {
        if (kind === "mcp_server_response") throw new Error("private-ui-error");
      });
      await f.call();
      expect(f.order.filter((x) => x === "dispatch")).toHaveLength(1);
      expect(JSON.stringify(f.results)).toContain("record-1");
      expect(JSON.stringify(f.results)).toContain("Do not repeat");
      expect(JSON.stringify(f.results)).not.toContain("private-ui-error");
      expect(f.hooks.runPostToolUse).toHaveBeenCalledWith(
        expect.objectContaining({ outcome: "succeeded" }),
      );
    });
    it(`${name} transport failure remains unknown with no retry`, async () => {
      const f = fixture(name);
      f.hub.callTool.mockRejectedValue(new Error("private-transport-error"));
      f.hub.readResource.mockRejectedValue(
        new Error("private-transport-error"),
      );
      await f.call();
      expect(
        f.hub.callTool.mock.calls.length + f.hub.readResource.mock.calls.length,
      ).toBe(1);
      expect(f.hooks.runPostToolUse).toHaveBeenCalledWith(
        expect.objectContaining({ outcome: "unknown", success: false }),
      );
      expect(JSON.stringify(f.results)).toContain("MCP_OUTCOME_UNKNOWN");
      expect(JSON.stringify(f.results)).not.toContain(
        "private-transport-error",
      );
    });
  }
  it("validates and approves the hook's overridden input before dispatch", async () => {
    const f = fixture();
    f.hooks.runPreToolUse.mockResolvedValue({
      overrideInput: { arguments: '{"id":"overridden"}' },
    });
    await f.call();
    expect(f.hub.callTool).toHaveBeenCalledWith("demo", "inspect", {
      id: "overridden",
    });
    expect(JSON.parse(f.task.ask.mock.calls[0][1] as string).arguments).toBe(
      '{"id":"overridden"}',
    );
    expect(f.hooks.runPostToolUse).toHaveBeenCalledWith(
      expect.objectContaining({
        parameters: expect.objectContaining({
          arguments: '{"id":"overridden"}',
        }),
      }),
    );
  });
  for (const value of ["null", "[]", '"value"', "12", "{", "{}"]) {
    it(`blocks invalid or missing required arguments ${value} before approval`, async () => {
      const f = fixture();
      f.block.params.arguments = value;
      await f.call();
      expect(f.task.ask).not.toHaveBeenCalled();
      expect(f.hub.callTool).not.toHaveBeenCalled();
      expect(f.hooks.runPostToolUse).toHaveBeenCalledWith(
        expect.objectContaining({ outcome: "blocked", success: false }),
      );
    });
  }
  it("reports protocol failure without converting it to successful business work", async () => {
    const f = fixture();
    f.hub.callTool.mockResolvedValue({
      isError: true,
      content: [{ type: "text", text: "Operation denied" }],
    } as any);
    await f.call();
    expect(f.hooks.runPostToolUse).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "failed", success: false }),
    );
    expect(JSON.stringify(f.results)).toContain("Operation denied");
  });
  it("requires both global MCP and individual tool autoapproval", async () => {
    const f = fixture();
    f.task.shouldAutoApproveTool.mockReturnValue(true);
    await f.call();
    expect(f.task.ask).toHaveBeenCalledTimes(1);
    const g = fixture();
    g.task.shouldAutoApproveTool.mockReturnValue(true);
    g.server.tools[0].autoApprove = true;
    await g.call();
    expect(g.task.ask).not.toHaveBeenCalled();
    expect(g.task.consecutiveAutoApprovedRequestsCount).toBe(1);
  });
  it("does not dispatch when the checkpoint fails", async () => {
    const f = fixture();
    f.task.saveCheckpoint.mockRejectedValue(
      new Error("private-checkpoint-error"),
    );
    await f.call();
    expect(f.hub.callTool).not.toHaveBeenCalled();
    expect(f.hooks.runPostToolUse).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "blocked" }),
    );
    expect(JSON.stringify(f.results)).not.toContain("private-checkpoint-error");
  });
  it("retains the result when the post-call checkpoint fails", async () => {
    const f = fixture();
    f.task.saveCheckpoint
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("private-checkpoint-error"));
    await f.call();
    expect(f.hub.callTool).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(f.results)).toContain("record-1");
    expect(JSON.stringify(f.results)).toContain("checkpoint");
    expect(f.hooks.runPostToolUse).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "succeeded" }),
    );
  });
  it("preserves image responses for supported models", async () => {
    const f = fixture();
    f.hub.callTool.mockResolvedValue({
      content: [{ type: "image", data: "YWJj", mimeType: "image/png" }],
    } as any);
    await f.call();
    expect(f.results).toContainEqual(
      expect.objectContaining({ type: "image" }),
    );
  });
  it("blocks a server disabled while approval is pending", async () => {
    const f = fixture();
    f.task.ask.mockImplementation(async () => {
      f.server.disabled = true;
      return { response: "yesButtonClicked" };
    });
    await f.call();
    expect(f.hub.callTool).not.toHaveBeenCalled();
    expect(f.hooks.runPostToolUse).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "blocked" }),
    );
  });
});

describe("MCP state and recovery boundaries", () => {
  it("retains the received result and outcome if feedback delivery fails", async () => {
    const f = fixture();
    f.task.ask.mockResolvedValue({
      response: "yesButtonClicked",
      text: "Use this result",
    });
    f.feedback.mockRejectedValue(new Error("private-feedback-error"));
    await f.call();
    expect(f.hub.callTool).toHaveBeenCalledTimes(1);
    expect(f.hooks.runPostToolUse).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "succeeded", success: true }),
    );
    expect(JSON.stringify(f.results)).toContain("record-1");
    expect(JSON.stringify(f.results)).not.toContain("private-feedback-error");
  });
  it("updates the Task mistake counter on invalid arguments", async () => {
    const f = fixture();
    f.block.params.arguments = "[]";
    await f.call();
    expect(f.task.consecutiveMistakeCount).toBe(1);
  });
  it("does not consume a final invocation after a partial preview delivery error", async () => {
    const f = fixture();
    f.block.partial = true;
    f.task.removeLastPartialMessageIfExistsWithType.mockRejectedValue(
      new Error("preview error"),
    );
    expect(await f.call()).toMatchObject({
      handled: true,
      didAlreadyUseTool: false,
    });
    expect(f.results).toHaveLength(0);
  });
  it("checks task activity after the request-start message", async () => {
    const f = fixture();
    f.task.say.mockImplementation(async (kind) => {
      if (kind === "mcp_server_request_started") f.task.abort = true;
    });
    await f.call();
    expect(f.hub.callTool).not.toHaveBeenCalled();
  });
  it("blocks revoked automatic approval before dispatch", async () => {
    const f = fixture();
    f.task.shouldAutoApproveTool.mockReturnValue(true);
    f.server.tools[0].autoApprove = true;
    f.task.saveCheckpoint.mockImplementation(async () => {
      f.server.tools[0].autoApprove = false;
    });
    await f.call();
    expect(f.hub.callTool).not.toHaveBeenCalled();
    expect(JSON.stringify(f.results)).toContain("MCP_APPROVAL_CHANGED");
  });
  it("honors hook cancellation before approval and transport", async () => {
    const f = fixture();
    f.hooks.runPreToolUse.mockResolvedValue({ cancel: true });
    expect(await f.call()).toMatchObject({
      handled: true,
      didRejectTool: true,
    });
    expect(f.task.ask).not.toHaveBeenCalled();
    expect(f.hub.callTool).not.toHaveBeenCalled();
  });
  it("retains resource text and image guidance for a text-only model", async () => {
    const f = fixture();
    f.task.api.getModel = () => ({ info: { supportsImages: false } });
    f.hub.callTool.mockResolvedValue({
      content: [
        { type: "image", data: "YWJj", mimeType: "image/png" },
        {
          type: "resource",
          resource: {
            uri: "demo://record",
            text: "embedded record",
            blob: "omit-binary",
          },
        },
      ],
    } as any);
    await f.call();
    expect(f.results.some((item) => item.type === "image")).toBe(false);
    expect(JSON.stringify(f.results)).toContain("embedded record");
    expect(JSON.stringify(f.results)).toContain(
      "do not have the ability to view",
    );
    expect(JSON.stringify(f.results)).not.toContain("omit-binary");
  });
});

describe("MCP recovery reports for the human and agent", () => {
  for (const name of ["use_mcp_tool", "access_mcp_resource"] as const) {
    it(`${name} publishes an uncertain terminal report after transport failure`, async () => {
      const f = fixture(name);
      f.hub.callTool.mockRejectedValue(new Error("private-network-detail"));
      f.hub.readResource.mockRejectedValue(new Error("private-network-detail"));
      await f.call();
      const reports = f.task.say.mock.calls.filter(
        (call) => call[0] === "mcp_server_response",
      );
      expect(reports).toHaveLength(1);
      expect(reports[0][1]).toContain("Outcome unknown");
      expect(reports[0][1]).toContain("Do not repeat");
      expect(reports[0][1]).not.toContain("private-network-detail");
      expect(f.hooks.runPostToolUse).toHaveBeenCalledWith(
        expect.objectContaining({ outcome: "unknown" }),
      );
    });
    it(`${name} reports a local checkpoint failure as not sent`, async () => {
      const f = fixture(name);
      f.task.saveCheckpoint.mockRejectedValue(
        new Error("private-checkpoint-detail"),
      );
      await f.call();
      expect(f.task.say).toHaveBeenCalledWith(
        "mcp_server_response",
        expect.stringContaining("Not sent"),
      );
      expect(f.hub.callTool).not.toHaveBeenCalled();
      expect(f.hub.readResource).not.toHaveBeenCalled();
    });
    it(`${name} keeps unknown when recovery display also fails`, async () => {
      const f = fixture(name);
      f.hub.callTool.mockRejectedValue(new Error("transport"));
      f.hub.readResource.mockRejectedValue(new Error("transport"));
      f.task.say.mockImplementation(async (kind) => {
        if (kind === "mcp_server_response")
          throw new Error("private-ui-detail");
      });
      await f.call();
      expect(
        f.hub.callTool.mock.calls.length + f.hub.readResource.mock.calls.length,
      ).toBe(1);
      expect(
        f.task.say.mock.calls.filter(
          (call) => call[0] === "mcp_server_response",
        ),
      ).toHaveLength(1);
      expect(f.hooks.runPostToolUse).toHaveBeenCalledWith(
        expect.objectContaining({ outcome: "unknown" }),
      );
      expect(JSON.stringify(f.results)).toContain(
        "Chat update could not be verified",
      );
      expect(JSON.stringify(f.results)).not.toContain("private-ui-detail");
    });
  }
  it("shows a not-sent report when approval changes during checkpoint capture", async () => {
    const f = fixture();
    f.task.shouldAutoApproveTool.mockReturnValue(true);
    f.server.tools[0].autoApprove = true;
    f.task.saveCheckpoint.mockImplementation(async () => {
      f.server.tools[0].autoApprove = false;
    });
    await f.call();
    expect(f.task.say).toHaveBeenCalledWith(
      "mcp_server_response",
      expect.stringContaining("Not sent"),
    );
    expect(f.task.say).toHaveBeenCalledWith(
      "mcp_server_response",
      expect.stringContaining("Review"),
    );
    expect(f.hub.callTool).not.toHaveBeenCalled();
  });
  it("shows invalid input before asking for approval", async () => {
    const f = fixture();
    f.block.params.arguments = "[]";
    await f.call();
    expect(f.task.ask).not.toHaveBeenCalled();
    expect(f.task.say).toHaveBeenCalledWith(
      "mcp_server_response",
      expect.stringContaining("Not sent"),
    );
  });
  it("shows post-call checkpoint recovery without changing the known result", async () => {
    const f = fixture();
    f.task.saveCheckpoint
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("checkpoint"));
    await f.call();
    expect(f.task.say).toHaveBeenCalledWith(
      "error",
      expect.stringContaining("post-call checkpoint"),
    );
    expect(f.hooks.runPostToolUse).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "succeeded" }),
    );
    expect(f.hub.callTool).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(f.results)).toContain("record-1");
  });
});
