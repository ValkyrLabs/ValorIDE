import {
  buildAck,
  buildNack,
  buildSwarmMessage,
  SwarmEntity,
  SwarmEntityType,
  SwarmMessage,
  SwarmMessageType,
  SwarmPriority,
} from "@shared/swarm-protocol";
import { CapabilityRegistry } from "../agentic/CapabilityRegistry";

export interface SwarmNodeInstance {
  instanceId: string;
  principalId?: string;
  username?: string;
}

export interface SwarmNodeTransport {
  send?: (message: SwarmMessage) => void | Promise<void>;
  sendAndWaitForAck: (
    message: SwarmMessage,
    timeoutMs?: number,
  ) => Promise<SwarmMessage>;
}

export interface SwarmNodeServiceOptions {
  approvalPolicy?: string;
  capabilities: CapabilityRegistry;
  instance: SwarmNodeInstance;
  selectedModelId?: string;
  selectedPromptId?: string;
  selectedPromptName?: string;
  server?: SwarmEntity;
  transport: SwarmNodeTransport;
  version: string;
  workspaceFolders: string[];
}

export interface SwarmRegistrationOptions {
  projectId?: string;
  sessionId?: string;
  timeoutMs?: number;
  workflowId?: string;
}

export type SwarmCommandExecutor = (
  message: SwarmMessage,
) => Promise<unknown> | unknown;

export class SwarmNodeRegistrationError extends Error {
  constructor(readonly response: SwarmMessage) {
    super(response.payload.data.error ?? "SWARM registration was rejected.");
    this.name = "SwarmNodeRegistrationError";
  }
}

export class SwarmNodeService {
  private readonly server: SwarmEntity;

  constructor(private readonly options: SwarmNodeServiceOptions) {
    this.server = options.server ?? {
      instanceId: "api-0",
      type: SwarmEntityType.SERVER,
    };
  }

  async register(
    options: SwarmRegistrationOptions = {},
  ): Promise<SwarmMessage> {
    const message = buildSwarmMessage(
      SwarmMessageType.EVENT,
      this.agentEntity(),
      this.server,
      "register",
      {
        announcement: this.options.capabilities.toSwarmAnnouncement({
          approvalPolicy:
            this.options.approvalPolicy ?? "local-confirmation-required",
          instanceId: this.options.instance.instanceId,
          principal: {
            principalId: this.options.instance.principalId,
            username: this.options.instance.username,
          },
          selectedModelId: this.options.selectedModelId,
          selectedPromptId: this.options.selectedPromptId,
          selectedPromptName: this.options.selectedPromptName,
          version: this.options.version,
          workspaceFolders: this.options.workspaceFolders,
          workspaceSummary: {
            folderCount: this.options.workspaceFolders.length,
            folders: [...this.options.workspaceFolders],
          },
        }),
      },
      {
        metadata: {
          projectId: options.projectId,
          sessionId: options.sessionId,
          workflowId: options.workflowId,
        },
        priority: SwarmPriority.HIGH,
      },
    );

    const response = await this.options.transport.sendAndWaitForAck(
      message,
      options.timeoutMs,
    );

    if (response.type === SwarmMessageType.NACK) {
      throw new SwarmNodeRegistrationError(response);
    }

    return response;
  }

  async heartbeat(data: Record<string, unknown> = {}): Promise<void> {
    if (!this.options.transport.send) {
      return;
    }

    await this.options.transport.send(
      buildSwarmMessage(
        SwarmMessageType.EVENT,
        this.agentEntity(),
        this.server,
        "heartbeat",
        {
          ...data,
          instanceId: this.options.instance.instanceId,
        },
      ),
    );
  }

  async handleInboundCommand(
    message: SwarmMessage,
    executor: SwarmCommandExecutor,
  ): Promise<SwarmMessage> {
    if (message.type !== SwarmMessageType.COMMAND) {
      return buildNack(
        message,
        this.agentEntity(),
        `Unsupported SWARM message type: ${message.type}`,
        "ERR_UNSUPPORTED_MESSAGE",
      );
    }

    if (!this.isAddressedToThisNode(message)) {
      return buildNack(
        message,
        this.agentEntity(),
        `Command target does not match ${this.options.instance.instanceId}`,
        "ERR_WRONG_TARGET",
      );
    }

    try {
      const result = await executor(message);
      return buildAck(message, this.agentEntity(), {
        result,
        status: "ok",
      });
    } catch (error) {
      return buildNack(
        message,
        this.agentEntity(),
        error instanceof Error ? error.message : String(error),
        "ERR_COMMAND_FAILED",
      );
    }
  }

  private agentEntity(): SwarmEntity {
    return {
      instanceId: this.options.instance.instanceId,
      principalId: this.options.instance.principalId,
      type: SwarmEntityType.AGENT,
      username: this.options.instance.username,
    };
  }

  private isAddressedToThisNode(message: SwarmMessage): boolean {
    if (message.to.type === SwarmEntityType.BROADCAST) {
      return true;
    }

    return (
      !message.to.instanceId ||
      message.to.instanceId === this.options.instance.instanceId
    );
  }
}
