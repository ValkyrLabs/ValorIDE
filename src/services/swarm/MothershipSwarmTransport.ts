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
  sendSwarmControlPayload?(data: any): void;
  sendCommandPayload?(data: any): void;
}

type PendingAck = {
  message: SwarmMessage;
  resolve: (message: SwarmMessage) => void;
  retryTimers: Array<ReturnType<typeof setTimeout>>;
  timeout: ReturnType<typeof setTimeout>;
};

const DEFAULT_ACK_TIMEOUT_MS = 30_000;
const REGISTRATION_ACK_TIMEOUT_MS = 60_000;
const REGISTRATION_RETRY_DELAYS_MS = [1_000, 5_000, 15_000] as const;

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
    if (
      message.type === SwarmMessageType.ACK ||
      message.type === SwarmMessageType.NACK
    ) {
      this.mothership.sendCommandPayload?.(message);
      this.mothership.sendAppTopic(message.type, {
        ackId: message.ackId,
        commandId: message.ackId,
        code: message.payload.data.code,
        error: message.payload.data.error,
        status: message.type === SwarmMessageType.ACK ? "ok" : "rejected",
      });
      return;
    }

    const action = String(message.payload?.action ?? "").toLowerCase();
    if (
      (action === "register" || action === "heartbeat") &&
      this.mothership.sendSwarmControlPayload
    ) {
      this.mothership.sendSwarmControlPayload(message);
      return;
    }

    this.mothership.sendAppTopic("swarm", message);
  }

  sendAndWaitForAck(
    message: SwarmMessage,
    timeoutMs?: number,
  ): Promise<SwarmMessage> {
    return new Promise((resolve) => {
      const action = String(message.payload?.action ?? "").toLowerCase();
      const isRegistration = action === "register";
      const effectiveTimeoutMs =
        timeoutMs ??
        (isRegistration
          ? REGISTRATION_ACK_TIMEOUT_MS
          : DEFAULT_ACK_TIMEOUT_MS);
      const timeout = setTimeout(() => {
        this.resolvePending(
          message.id,
          buildNack(
            message,
            this.serverEntity,
            `Timeout waiting for SWARM ack/nack (${effectiveTimeoutMs}ms)`,
            "ERR_ACK_TIMEOUT",
          ),
        );
      }, effectiveTimeoutMs);
      const retryTimers = isRegistration
        ? REGISTRATION_RETRY_DELAYS_MS.filter(
            (delay) => delay < effectiveTimeoutMs,
          ).map((delay) =>
            setTimeout(() => {
              if (this.pending.has(message.id)) {
                this.send(message);
              }
            }, delay),
          )
        : [];

      this.pending.set(message.id, {
        message,
        resolve,
        retryTimers,
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
      pending.retryTimers.forEach((timer) => clearTimeout(timer));
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
    pending.retryTimers.forEach((timer) => clearTimeout(timer));
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
