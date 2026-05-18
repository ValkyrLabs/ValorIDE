import { CapabilityDescriptor, CapabilityRegistry } from "./CapabilityRegistry";

export type AgenticCommandSource = "cli" | "local" | "swarm";
export type AgenticCommandStatus = "failed" | "rejected" | "success";

export interface AgenticCommand {
  capabilityId: string;
  correlationId?: string;
  id: string;
  payload: Record<string, unknown>;
  requiresApproval?: boolean;
  source: AgenticCommandSource;
}

export interface CommandApprovalDecision {
  approved: boolean;
  reason?: string;
}

export interface AgenticCommandAudit {
  approvalReason?: string;
  approved: boolean;
  capabilityId: string;
  completedAt: string;
  correlationId?: string;
  requiresApproval: boolean;
  source: AgenticCommandSource;
  startedAt: string;
}

export interface AgenticCommandError {
  code: string;
  message: string;
}

export interface AgenticCommandArtifact {
  kind?: string;
  metadata?: Record<string, unknown>;
  title?: string;
  uri: string;
}

export interface AgenticCommandToolIdentity {
  capabilityId: string;
  kind?: CapabilityDescriptor["kind"];
  label: string;
}

export interface AgenticCommandResult {
  audit: AgenticCommandAudit;
  artifacts?: AgenticCommandArtifact[];
  commandId: string;
  elapsedMs: number;
  error?: AgenticCommandError;
  output?: unknown;
  status: AgenticCommandStatus;
  stderr?: string;
  stdout?: string;
  tool: AgenticCommandToolIdentity;
}

export type AgenticCommandHandler = (
  command: AgenticCommand,
  capability: CapabilityDescriptor,
) => Promise<unknown> | unknown;

export interface AgenticCommandBusOptions {
  approve?: (
    command: AgenticCommand,
    capability: CapabilityDescriptor,
  ) => Promise<CommandApprovalDecision> | CommandApprovalDecision;
  auditSink?: (result: AgenticCommandResult) => void | Promise<void>;
  capabilities: CapabilityRegistry;
  now?: () => Date;
}

export class AgenticCommandBus {
  private readonly handlers = new Map<string, AgenticCommandHandler>();
  private readonly now: () => Date;

  constructor(private readonly options: AgenticCommandBusOptions) {
    this.now = options.now ?? (() => new Date());
  }

  registerHandler(capabilityId: string, handler: AgenticCommandHandler): void {
    this.handlers.set(capabilityId, handler);
  }

  async execute(command: AgenticCommand): Promise<AgenticCommandResult> {
    const startedAt = this.now().toISOString();
    const capability = this.options.capabilities
      .listCapabilities()
      .find((item) => item.id === command.capabilityId);

    if (!capability) {
      return this.complete(command, startedAt, false, false, "failed", {
        code: "ERR_UNKNOWN_CAPABILITY",
        message: `Unknown capability: ${command.capabilityId}.`,
      });
    }

    if (!capability.enabled) {
      return this.complete(
        command,
        startedAt,
        false,
        false,
        "rejected",
        {
          code: "ERR_CAPABILITY_DISABLED",
          message: `${command.capabilityId} is disabled.`,
        },
        undefined,
        undefined,
        capability,
      );
    }

    const requiresApproval =
      command.requiresApproval ?? capability.requiresApproval;
    let approvalReason: string | undefined;
    if (requiresApproval) {
      if (!this.options.approve) {
        return this.complete(
          command,
          startedAt,
          false,
          true,
          "rejected",
          {
            code: "ERR_APPROVAL_REQUIRED",
            message: `Approval is required for ${command.capabilityId}.`,
          },
          undefined,
          undefined,
          capability,
        );
      }

      const decision = await this.options.approve(command, capability);
      approvalReason = decision.reason;
      if (!decision.approved) {
        return this.complete(
          command,
          startedAt,
          false,
          true,
          "rejected",
          {
            code: "ERR_APPROVAL_REJECTED",
            message:
              decision.reason ??
              `Approval was rejected for ${command.capabilityId}.`,
          },
          undefined,
          approvalReason,
          capability,
        );
      }
    }

    const handler = this.handlers.get(command.capabilityId);
    if (!handler) {
      return this.complete(
        command,
        startedAt,
        true,
        requiresApproval,
        "failed",
        {
          code: "ERR_HANDLER_MISSING",
          message: `No command handler registered for ${command.capabilityId}.`,
        },
        undefined,
        undefined,
        capability,
      );
    }

    try {
      const output = await handler(command, capability);
      return this.complete(
        command,
        startedAt,
        true,
        requiresApproval,
        "success",
        undefined,
        output,
        approvalReason,
        capability,
      );
    } catch (error) {
      return this.complete(
        command,
        startedAt,
        true,
        requiresApproval,
        "failed",
        {
          code: "ERR_COMMAND_FAILED",
          message: error instanceof Error ? error.message : String(error),
        },
        undefined,
        approvalReason,
        capability,
      );
    }
  }

  private async complete(
    command: AgenticCommand,
    startedAt: string,
    approved: boolean,
    requiresApproval: boolean,
    status: AgenticCommandStatus,
    error?: AgenticCommandError,
    output?: unknown,
    approvalReason?: string,
    capability?: CapabilityDescriptor,
  ): Promise<AgenticCommandResult> {
    const completedAt = this.now().toISOString();
    const normalized = normalizeCommandOutput(command, capability, output);
    const audit: AgenticCommandAudit = {
      approved,
      capabilityId: command.capabilityId,
      completedAt,
      requiresApproval,
      source: command.source,
      startedAt,
    };
    if (approvalReason) {
      audit.approvalReason = approvalReason;
    }
    if (command.correlationId) {
      audit.correlationId = command.correlationId;
    }

    const result: AgenticCommandResult = {
      audit,
      commandId: command.id,
      elapsedMs: Math.max(0, Date.parse(completedAt) - Date.parse(startedAt)),
      status,
      tool: normalized.tool,
    };
    if (error) {
      result.error = error;
    }
    if (normalized.output !== undefined) {
      result.output = normalized.output;
    }
    if (normalized.artifacts) {
      result.artifacts = normalized.artifacts;
    }
    if (normalized.stderr !== undefined) {
      result.stderr = normalized.stderr;
    }
    if (normalized.stdout !== undefined) {
      result.stdout = normalized.stdout;
    }

    await this.options.auditSink?.(result);
    return result;
  }
}

interface NormalizedCommandOutput {
  artifacts?: AgenticCommandArtifact[];
  output?: unknown;
  stderr?: string;
  stdout?: string;
  tool: AgenticCommandToolIdentity;
}

const normalizeCommandOutput = (
  command: AgenticCommand,
  capability?: CapabilityDescriptor,
  output?: unknown,
): NormalizedCommandOutput => {
  const tool = normalizeToolIdentity(command, capability, output);

  if (!isRecord(output) || !hasStructuredOutputFields(output)) {
    return {
      output,
      tool,
    };
  }

  return {
    artifacts: normalizeArtifacts(output.artifacts),
    output: Object.prototype.hasOwnProperty.call(output, "output")
      ? output.output
      : undefined,
    stderr: typeof output.stderr === "string" ? output.stderr : undefined,
    stdout: typeof output.stdout === "string" ? output.stdout : undefined,
    tool,
  };
};

const normalizeToolIdentity = (
  command: AgenticCommand,
  capability?: CapabilityDescriptor,
  output?: unknown,
): AgenticCommandToolIdentity => {
  const defaultTool: AgenticCommandToolIdentity = {
    capabilityId: command.capabilityId,
    kind: capability?.kind,
    label: capability?.label ?? command.capabilityId,
  };

  if (!isRecord(output) || !isRecord(output.tool)) {
    return defaultTool;
  }

  return {
    capabilityId:
      typeof output.tool.capabilityId === "string"
        ? output.tool.capabilityId
        : defaultTool.capabilityId,
    kind:
      typeof output.tool.kind === "string"
        ? (output.tool.kind as CapabilityDescriptor["kind"])
        : defaultTool.kind,
    label:
      typeof output.tool.label === "string"
        ? output.tool.label
        : defaultTool.label,
  };
};

const hasStructuredOutputFields = (output: Record<string, unknown>) =>
  ["artifacts", "output", "stderr", "stdout", "tool"].some((key) =>
    Object.prototype.hasOwnProperty.call(output, key),
  );

const normalizeArtifacts = (artifacts: unknown) => {
  if (!Array.isArray(artifacts)) {
    return undefined;
  }

  const normalized = artifacts.filter(isArtifact);
  return normalized.length ? normalized : undefined;
};

const isArtifact = (value: unknown): value is AgenticCommandArtifact =>
  isRecord(value) && typeof value.uri === "string";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);
