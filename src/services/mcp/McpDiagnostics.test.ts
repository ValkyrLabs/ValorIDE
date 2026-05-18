import { McpServer } from "@shared/mcp";
import { appendMcpServerLog, markMcpServerStatus } from "./McpDiagnostics";

const baseServer: McpServer = {
  config: "{}",
  name: "fixture",
  status: "connecting",
};

describe("McpDiagnostics", () => {
  it("appends timestamped log entries without mutating the original server", () => {
    const updated = appendMcpServerLog(
      baseServer,
      {
        level: "error",
        message: "startup failed",
        source: "stderr",
      },
      () => "2026-05-13T19:00:00.000Z",
    );

    expect(baseServer.logs).toBeUndefined();
    expect(updated.logs).toEqual([
      {
        level: "error",
        message: "startup failed",
        source: "stderr",
        timestamp: "2026-05-13T19:00:00.000Z",
      },
    ]);
    expect(updated.error).toBe("startup failed");
  });

  it("caps recent diagnostic logs to the newest entries", () => {
    const server = Array.from({ length: 55 }).reduce<McpServer>(
      (current, _value, index) =>
        appendMcpServerLog(
          current,
          {
            level: "info",
            message: `line-${index}`,
            source: "stdout",
          },
          () => `2026-05-13T19:00:${String(index).padStart(2, "0")}.000Z`,
        ),
      baseServer,
    );

    expect(server.logs).toHaveLength(50);
    expect(server.logs?.[0].message).toBe("line-5");
    expect(server.logs?.at(-1)?.message).toBe("line-54");
  });

  it("marks lifecycle timestamps for status changes", () => {
    const connected = markMcpServerStatus(
      baseServer,
      "connected",
      () => "2026-05-13T19:01:00.000Z",
    );
    const disconnected = markMcpServerStatus(
      connected,
      "disconnected",
      () => "2026-05-13T19:02:00.000Z",
    );

    expect(connected.lastConnectedAt).toBe("2026-05-13T19:01:00.000Z");
    expect(disconnected.lastDisconnectedAt).toBe("2026-05-13T19:02:00.000Z");
  });
});
