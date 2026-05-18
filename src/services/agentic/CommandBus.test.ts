import {
  AgenticCommandBus,
  AgenticCommandResult,
  CommandApprovalDecision,
} from "./CommandBus";
import {
  CapabilityRegistry,
  createDefaultValorCapabilities,
} from "./CapabilityRegistry";

const fixedNow = (() => {
  let count = 0;
  return () => new Date(`2026-05-13T12:00:0${count++}.000Z`);
})();

describe("AgenticCommandBus", () => {
  it("executes registered commands and writes an auditable result contract", async () => {
    const auditSink = jest.fn<void, [AgenticCommandResult]>();
    const bus = new AgenticCommandBus({
      auditSink,
      capabilities: new CapabilityRegistry(createDefaultValorCapabilities()),
      now: fixedNow,
    });
    bus.registerHandler("filesystem.read", async (command) => ({
      content: `read:${command.payload.path}`,
    }));

    const result = await bus.execute({
      capabilityId: "filesystem.read",
      correlationId: "swarm-correlation-1",
      id: "cmd-1",
      payload: { path: "README.md" },
      source: "swarm",
    });

    expect(result).toEqual({
      audit: {
        approved: true,
        capabilityId: "filesystem.read",
        completedAt: "2026-05-13T12:00:01.000Z",
        correlationId: "swarm-correlation-1",
        requiresApproval: false,
        source: "swarm",
        startedAt: "2026-05-13T12:00:00.000Z",
      },
      commandId: "cmd-1",
      elapsedMs: 1000,
      output: { content: "read:README.md" },
      status: "success",
      tool: {
        capabilityId: "filesystem.read",
        kind: "filesystem",
        label: "Read workspace files",
      },
    });
    expect(auditSink).toHaveBeenCalledWith(result);
  });

  it("rejects high-risk commands when approval is required but unavailable", async () => {
    const bus = new AgenticCommandBus({
      capabilities: new CapabilityRegistry(createDefaultValorCapabilities()),
      now: fixedNow,
    });
    bus.registerHandler("terminal.execute", async () => ({ exitCode: 0 }));

    await expect(
      bus.execute({
        capabilityId: "terminal.execute",
        id: "cmd-2",
        payload: { command: "rm -rf /tmp/demo" },
        source: "swarm",
      }),
    ).resolves.toMatchObject({
      commandId: "cmd-2",
      error: {
        code: "ERR_APPROVAL_REQUIRED",
        message: "Approval is required for terminal.execute.",
      },
      status: "rejected",
    });
  });

  it("honors explicit approval decisions before executing a command", async () => {
    const approve = jest.fn(
      async (): Promise<CommandApprovalDecision> => ({
        approved: true,
        reason: "approved by local operator",
      }),
    );
    const bus = new AgenticCommandBus({
      approve,
      capabilities: new CapabilityRegistry(createDefaultValorCapabilities()),
      now: fixedNow,
    });
    const handler = jest.fn(async () => ({ exitCode: 0 }));
    bus.registerHandler("terminal.execute", handler);

    const result = await bus.execute({
      capabilityId: "terminal.execute",
      id: "cmd-3",
      payload: { command: "npm test" },
      source: "local",
    });

    expect(approve).toHaveBeenCalledWith(
      expect.objectContaining({
        capabilityId: "terminal.execute",
        id: "cmd-3",
      }),
      expect.objectContaining({
        id: "terminal.execute",
        requiresApproval: true,
      }),
    );
    expect(handler).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      audit: {
        approved: true,
        approvalReason: "approved by local operator",
        requiresApproval: true,
      },
      status: "success",
    });
  });

  it("normalizes command output with tool identity, elapsed time, streams, and artifacts", async () => {
    const timestamps = [
      new Date("2026-05-13T12:00:10.000Z"),
      new Date("2026-05-13T12:00:12.250Z"),
    ];
    const bus = new AgenticCommandBus({
      capabilities: new CapabilityRegistry(createDefaultValorCapabilities()),
      now: () => timestamps.shift() ?? new Date("2026-05-13T12:00:12.250Z"),
    });
    bus.registerHandler("terminal.execute", async () => ({
      artifacts: [
        {
          kind: "log",
          title: "test output",
          uri: "file:///tmp/test.log",
        },
      ],
      output: { exitCode: 0 },
      stderr: "",
      stdout: "3 tests passed",
    }));

    const result = await bus.execute({
      capabilityId: "terminal.execute",
      id: "cmd-4",
      payload: { command: "npm test" },
      requiresApproval: false,
      source: "local",
    });

    expect(result).toMatchObject({
      artifacts: [
        {
          kind: "log",
          title: "test output",
          uri: "file:///tmp/test.log",
        },
      ],
      commandId: "cmd-4",
      elapsedMs: 2250,
      output: { exitCode: 0 },
      status: "success",
      stderr: "",
      stdout: "3 tests passed",
      tool: {
        capabilityId: "terminal.execute",
        label: "Execute local commands",
      },
    });
  });
});
