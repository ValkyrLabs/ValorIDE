import {
  buildAck,
  buildNack,
  buildSwarmMessage,
  SwarmEntityType,
  SwarmMessageType,
} from "@shared/swarm-protocol";
import { MothershipSwarmTransport } from "./MothershipSwarmTransport";

const createMothership = () => ({
  on: jest.fn(),
  removeListener: jest.fn(),
  sendAppTopic: jest.fn(),
  sendCommandPayload: jest.fn(),
});

describe("MothershipSwarmTransport", () => {
  it("sends SWARM messages over the mothership app topic and resolves protocol ACKs", async () => {
    const mothership = createMothership();
    const transport = new MothershipSwarmTransport(mothership);
    const message = buildSwarmMessage(
      SwarmMessageType.EVENT,
      { instanceId: "valoride-local-1", type: SwarmEntityType.AGENT },
      { instanceId: "api-0", type: SwarmEntityType.SERVER },
      "register",
      {},
    );

    const pending = transport.sendAndWaitForAck(message);
    const broadcastListener = mothership.on.mock.calls.find(
      ([event]) => event === "broadcast",
    )?.[1];
    broadcastListener({
      payload: buildAck(message, {
        instanceId: "api-0",
        type: SwarmEntityType.SERVER,
      }),
      topic: "swarm",
    });

    await expect(pending).resolves.toMatchObject({
      ackId: message.id,
      type: SwarmMessageType.ACK,
    });
    expect(mothership.sendAppTopic).toHaveBeenCalledWith("swarm", message);
  });

  it("publishes command ACKs through the mothership command channel", () => {
    const mothership = createMothership();
    const transport = new MothershipSwarmTransport(mothership);
    const command = buildSwarmMessage(
      SwarmMessageType.COMMAND,
      { instanceId: "api-0", type: SwarmEntityType.SERVER },
      { instanceId: "valoride-local-1", type: SwarmEntityType.AGENT },
      "valor.execute",
      { prompt: "start the task" },
    );
    const ack = buildAck(command, {
      instanceId: "valoride-local-1",
      type: SwarmEntityType.AGENT,
    });

    transport.send(ack);

    expect(mothership.sendCommandPayload).toHaveBeenCalledWith(ack);
    expect(mothership.sendAppTopic).toHaveBeenCalledWith("ack", {
      ackId: command.id,
      commandId: command.id,
      code: undefined,
      error: undefined,
      status: "ok",
    });
  });

  it("converts app-level mothership nacks into protocol NACKs", async () => {
    const mothership = createMothership();
    const transport = new MothershipSwarmTransport(mothership);
    const message = buildSwarmMessage(
      SwarmMessageType.EVENT,
      { instanceId: "valoride-local-1", type: SwarmEntityType.AGENT },
      { instanceId: "api-0", type: SwarmEntityType.SERVER },
      "register",
      {},
    );

    const pending = transport.sendAndWaitForAck(message);
    const broadcastListener = mothership.on.mock.calls.find(
      ([event]) => event === "broadcast",
    )?.[1];
    broadcastListener({
      payload: {
        code: "ERR_RBAC",
        error: "Registration denied",
        messageId: message.id,
      },
      topic: "nack",
    });

    await expect(pending).resolves.toMatchObject({
      ackId: message.id,
      payload: {
        data: {
          code: "ERR_RBAC",
          error: "Registration denied",
        },
      },
      type: SwarmMessageType.NACK,
    });
  });

  it("removes mothership listeners when disposed", () => {
    const mothership = createMothership();
    const transport = new MothershipSwarmTransport(mothership);

    transport.dispose();

    expect(mothership.removeListener).toHaveBeenCalledWith(
      "broadcast",
      expect.any(Function),
    );
    expect(mothership.removeListener).toHaveBeenCalledWith(
      "privateMessage",
      expect.any(Function),
    );
  });
});
