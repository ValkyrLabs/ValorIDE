import {
  CapabilityRegistry,
  createDefaultValorCapabilities,
} from "../agentic/CapabilityRegistry";
import {
  buildAck,
  buildSwarmMessage,
  SwarmEntityType,
  SwarmMessageType,
} from "@shared/swarm-protocol";
import { SwarmNodeService } from "./SwarmNodeService";

const createService = (
  transport: { sendAndWaitForAck: jest.Mock },
  options: Partial<ConstructorParameters<typeof SwarmNodeService>[0]> = {},
) =>
  new SwarmNodeService({
    capabilities: new CapabilityRegistry(createDefaultValorCapabilities()),
    instance: {
      instanceId: "valoride-local-1",
      principalId: "principal-1",
      username: "super",
    },
    transport,
    version: "3.20.820",
    workspaceFolders: ["/workspace/app"],
    ...options,
  });

describe("SwarmNodeService", () => {
  it("registers ValorIDE with mothership and waits for ack", async () => {
    const transport = {
      sendAndWaitForAck: jest.fn(async (message) =>
        buildAck(message, {
          instanceId: "api-0",
          type: SwarmEntityType.SERVER,
        }),
      ),
    };
    const service = createService(transport);

    const ack = await service.register({
      projectId: "project-1",
      sessionId: "session-1",
    });
    const sent = transport.sendAndWaitForAck.mock.calls[0][0];

    expect(sent.type).toBe(SwarmMessageType.EVENT);
    expect(sent.to.type).toBe(SwarmEntityType.SERVER);
    expect(sent.from).toEqual({
      instanceId: "valoride-local-1",
      principalId: "principal-1",
      type: SwarmEntityType.AGENT,
      username: "super",
    });
    expect(sent.payload.action).toBe("register");
    expect(sent.payload.metadata).toMatchObject({
      projectId: "project-1",
      sessionId: "session-1",
    });
    expect(
      sent.payload.data.announcement.capabilities.map(
        (capability: { id: string }) => capability.id,
      ),
    ).toEqual(expect.arrayContaining(["graymatter.memory", "swarm.command"]));
    expect(ack.type).toBe(SwarmMessageType.ACK);
  });

  it("includes approval policy and selected model/prompt in the SWARM registration announcement", async () => {
    const transport = {
      sendAndWaitForAck: jest.fn(async (message) =>
        buildAck(message, {
          instanceId: "api-0",
          type: SwarmEntityType.SERVER,
        }),
      ),
    };
    const service = createService(transport, {
      approvalPolicy: "local-confirmation-required",
      selectedModelId: "gpt-5.5",
      selectedPromptId: "valoride-vibe-coding",
      selectedPromptName: "ValorIDE Vibe Coding",
    });

    await service.register();
    const sent = transport.sendAndWaitForAck.mock.calls[0][0];

    expect(sent.payload.data.announcement).toMatchObject({
      approvalPolicy: "local-confirmation-required",
      principal: {
        principalId: "principal-1",
        username: "super",
      },
      selectedModelId: "gpt-5.5",
      selectedPromptId: "valoride-vibe-coding",
      selectedPromptName: "ValorIDE Vibe Coding",
      workspaceSummary: {
        folderCount: 1,
        folders: ["/workspace/app"],
      },
    });
  });

  it("turns successful inbound commands into ack responses", async () => {
    const service = createService({
      sendAndWaitForAck: jest.fn(),
    });
    const command = buildSwarmMessage(
      SwarmMessageType.COMMAND,
      { instanceId: "api-0", type: SwarmEntityType.SERVER },
      { instanceId: "valoride-local-1", type: SwarmEntityType.AGENT },
      "terminal.execute",
      { command: "pwd" },
    );
    const executor = jest.fn(async () => ({
      exitCode: 0,
      output: "/workspace/app",
    }));

    const response = await service.handleInboundCommand(command, executor);

    expect(executor).toHaveBeenCalledWith(command);
    expect(response.type).toBe(SwarmMessageType.ACK);
    expect(response.ackId).toBe(command.id);
    expect(response.payload.data).toEqual({
      result: {
        exitCode: 0,
        output: "/workspace/app",
      },
      status: "ok",
    });
  });

  it("turns failed inbound commands into nack responses", async () => {
    const service = createService({
      sendAndWaitForAck: jest.fn(),
    });
    const command = buildSwarmMessage(
      SwarmMessageType.COMMAND,
      { instanceId: "api-0", type: SwarmEntityType.SERVER },
      { instanceId: "valoride-local-1", type: SwarmEntityType.AGENT },
      "filesystem.write",
      { path: "src/index.ts" },
    );

    const response = await service.handleInboundCommand(command, async () => {
      throw new Error("User approval is required");
    });

    expect(response.type).toBe(SwarmMessageType.NACK);
    expect(response.ackId).toBe(command.id);
    expect(response.payload.data).toMatchObject({
      code: "ERR_COMMAND_FAILED",
      error: "User approval is required",
    });
  });
});
