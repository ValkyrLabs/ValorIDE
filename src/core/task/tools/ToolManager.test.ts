jest.mock("@services/telemetry/TelemetryService", () => ({
  telemetryService: {
    captureUnknownTool: jest.fn(),
  },
}));

jest.mock(
  "@integrations/notifications",
  () => ({
    showSystemNotification: jest.fn(),
  }),
  { virtual: true },
);
jest.mock(
  "execa",
  () => ({ __esModule: true, default: jest.fn(), execa: jest.fn() }),
  { virtual: true },
);

jest.mock("@services/logging/Logger", () => ({
  Logger: {
    warn: jest.fn(),
  },
}));

jest.mock("./FileToolHandler", () => ({
  FileToolHandler: jest.fn().mockImplementation(() => ({
    execute: jest.fn(),
  })),
}));

jest.mock("./CommandToolHandler", () => ({
  CommandToolHandler: jest.fn().mockImplementation(() => ({
    execute: jest.fn(),
  })),
}));

jest.mock("./BrowserToolHandler", () => ({
  BrowserToolHandler: jest.fn().mockImplementation(() => ({
    execute: jest.fn(),
  })),
}));

const { ToolManager } =
  jest.requireActual<typeof import("./ToolManager")>("./ToolManager");
const { telemetryService } = jest.requireMock<
  typeof import("@services/telemetry/TelemetryService")
>("@services/telemetry/TelemetryService");
const { Logger } = jest.requireMock<typeof import("@services/logging/Logger")>(
  "@services/logging/Logger",
);
const { parseAssistantMessage } = jest.requireActual<
  typeof import("@core/assistant-message")
>("@core/assistant-message");
const { ValkyrProcedureClient } = jest.requireActual<
  typeof import("@services/workflow/ValkyrProcedureClient")
>("@services/workflow/ValkyrProcedureClient");

describe("ToolManager", () => {
  it("routes a parsed procedure call through approval and the real authenticated client", async () => {
    const order: string[] = [];
    const fetch = jest.fn(async (_url: string, _init?: RequestInit) => {
      order.push("transport");
      return {
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        json: async () => ({
          status: "blocked",
          deterministicAttempted: true,
          agentExecutionPerformed: false,
          route: {
            recommendedRoute: "ask_human_approval",
            receipt: { receiptRef: "route:approval" },
          },
          fallbackRoute: "ask_human_approval",
        }),
      } as unknown as Response;
    });
    const client = new ValkyrProcedureClient({
      baseUrl: "https://api-0.valkyrlabs.com",
      fetch,
      getAuthToken: () => "test-session",
    });
    const manager = new ToolManager({
      taskId: "task-1",
      getChatMode: () => "act",
      getProcedureClient: async () => client,
      shouldAutoApproveTool: () => false,
      ask: async () => {
        order.push("approval");
        return { response: "yesButtonClicked" };
      },
      say: async () => undefined,
      saveCheckpoint: async () => {
        order.push("checkpoint");
      },
    } as any);
    const block = parseAssistantMessage(
      '<use_procedure><action>execute</action><arguments>{"taskType":"workflow","operationRef":"case-1","inputs":{}}</arguments></use_procedure>',
    ).find((item) => item.type === "tool_use")!;
    const result = await manager.executeTool(block, false, false, false);
    expect(order).toEqual(["approval", "checkpoint", "transport"]);
    expect(fetch.mock.calls[0][0]).toBe(
      "https://api-0.valkyrlabs.com/v1/skillopt_ops/execute",
    );
    expect(result.toolResponse).toContain('"status":"blocked"');
    expect(result.toolResponse).not.toContain('"succeeded":true');
  });

  it("captures telemetry and logs when tool is unknown", async () => {
    const manager = new ToolManager({ taskId: "task-1" } as any);

    const result = await manager.executeTool(
      {
        type: "tool_use",
        id: "1",
        name: "unknown_tool",
        input: {},
        params: {},
        partial: false,
      } as any,
      false,
      false,
      false,
    );

    expect(result.shouldContinue).toBe(false);
    expect(telemetryService.captureUnknownTool).toHaveBeenCalledWith(
      "task-1",
      "unknown_tool",
      { partial: false },
    );
    expect(Logger.warn).toHaveBeenCalled();
  });
});
