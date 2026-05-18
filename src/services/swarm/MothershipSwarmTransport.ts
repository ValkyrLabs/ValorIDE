import {
  buildAck,
  buildNack,
  SwarmEntity,
  SwarmEntityType,
  SwarmMessage,
  SwarmMessageType,
  validateSwarmMessage,
} from "@shared/swarm-protocol";
import { SwarmNodeTransport } from "./SwarmNodeService";

export interface MothershipTopicBridge {
  on(
    event: "broadcast" | "privateMessage",
    listener: (payload: any) => void,
  ): unknown;
  removeListener?(
    event: "broadcast" | "privateMessage",
    listener: (payload: any) => void,
  ): unknown;
  sendAppTopic(topic: string, data: any): void;
}

type PendingAck = {
  message: SwarmMessage;
  resolve: (message: SwarmMessage) => void;
  timeout: ReturnType<typeof setTimeout>;
};

const DEFAULT_ACK_TIMEOUT_MS = 30_000;

export class MothershipSwarmTransport implements SwarmNodeTransport {
  private readonly pending = new Map<string, PendingAck>();
  private readonly serverEntity: SwarmEntity = {
    instanceId: "api-0",
    type: SwarmEntityType.SERVER,
  };
  private readonly handleEnvelope = (envelope: any) => {
    this.processEnvelope(envelope);
  };

  constructor(private readonly mothership: MothershipTopicBridge) {
    this.mothership.on("broadcast", this.handleEnvelope);
    this.mothership.on("privateMessage", this.handleEnvelope);
  }

  send(message: SwarmMessage): void {
    this.mothership.sendAppTopic("swarm", message);
  }

  sendAndWaitForAck(
    message: SwarmMessage,
    timeoutMs = DEFAULT_ACK_TIMEOUT_MS,
  ): Promise<SwarmMessage> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.resolvePending(
          message.id,
          buildNack(
            message,
            this.serverEntity,
            `Timeout waiting for SWARM ack/nack (${timeoutMs}ms)`,
            "ERR_ACK_TIMEOUT",
          ),
        );
      }, timeoutMs);

      this.pending.set(message.id, {
        message,
        resolve,
        timeout,
      });
      this.send(message);
    });
  }

  dispose(): void {
    this.mothership.removeListener?.("broadcast", this.handleEnvelope);
    this.mothership.removeListener?.("privateMessage", this.handleEnvelope);

    for (const pending of this.pending.values()) {
      clearTimeout(pending.timeout);
      pending.resolve(
        buildNack(
          pending.message,
          this.serverEntity,
          "SWARM transport disposed",
          "ERR_TRANSPORT_DISPOSED",
        ),
      );
    }
    this.pending.clear();
  }

  private processEnvelope(envelope: any): void {
    const topic = envelope?.topic;
    const payload = parsePayload(envelope?.payload ?? envelope);

    if (topic === "ack" || topic === "nack") {
      this.handleAppLevelAck(topic, payload);
      return;
    }

    if (topic === "swarm" || validateSwarmMessage(payload)) {
      this.handleProtocolMessage(payload);
    }
  }

  private handleProtocolMessage(payload: unknown): void {
    if (!validateSwarmMessage(payload)) {
      return;
    }

    if (
      payload.type !== SwarmMessageType.ACK &&
      payload.type !== SwarmMessageType.NACK
    ) {
      return;
    }

    if (payload.ackId) {
      this.resolvePending(payload.ackId, payload);
    }
  }

  private handleAppLevelAck(topic: "ack" | "nack", payload: any): void {
    const messageId = payload?.messageId ?? payload?.ackId;
    if (!messageId || !this.pending.has(messageId)) {
      return;
    }

    const pending = this.pending.get(messageId)!;
    const response =
      topic === "ack"
        ? buildAck(pending.message, this.serverEntity, {
            ...payload,
            status: "ok",
          })
        : buildNack(
            pending.message,
            this.serverEntity,
            payload?.error ?? "Request rejected by mothership",
            payload?.code ?? "ERR_MOTHERSHIP_NACK",
          );

    this.resolvePending(messageId, response);
  }

  private resolvePending(messageId: string, response: SwarmMessage): void {
    const pending = this.pending.get(messageId);
    if (!pending) {
      return;
    }

    clearTimeout(pending.timeout);
    this.pending.delete(messageId);
    pending.resolve(response);
  }
}

const parsePayload = (payload: unknown): unknown => {
  if (typeof payload !== "string") {
    return payload;
  }

  try {
    return JSON.parse(payload);
  } catch {
    return payload;
  }
};
