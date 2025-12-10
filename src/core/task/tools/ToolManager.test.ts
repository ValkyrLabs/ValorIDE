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

import { ToolManager } from "./ToolManager";
import { telemetryService } from "@services/telemetry/TelemetryService";
import { Logger } from "@services/logging/Logger";

describe("ToolManager", () => {
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
