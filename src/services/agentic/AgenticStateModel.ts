import {
  AgenticCapabilityCommandCenterState,
  AgenticCommandAuditSummary,
  AgenticCommandStatus,
  AgenticSwarmState,
  DEFAULT_AGENTIC_COMMAND_CENTER_STATE,
} from "@shared/AgenticState";
import { AgenticCommandResult } from "./CommandBus";

const MAX_RECENT_COMMANDS = 20;

const commandStatusMap: Record<
  AgenticCommandResult["status"],
  AgenticCommandStatus
> = {
  failed: "failed",
  rejected: "rejected",
  success: "completed",
};

export const createAgenticCommandCenterState = (
  initial?: Partial<AgenticCapabilityCommandCenterState>,
): AgenticCapabilityCommandCenterState => ({
  ...DEFAULT_AGENTIC_COMMAND_CENTER_STATE,
  ...initial,
  recentCommands: initial?.recentCommands
    ? [...initial.recentCommands]
    : [...DEFAULT_AGENTIC_COMMAND_CENTER_STATE.recentCommands],
  swarm: {
    ...DEFAULT_AGENTIC_COMMAND_CENTER_STATE.swarm,
    ...initial?.swarm,
  },
});

export const updateSwarmState = (
  state: AgenticCapabilityCommandCenterState,
  swarm: Partial<AgenticSwarmState> & Pick<AgenticSwarmState, "status">,
): AgenticCapabilityCommandCenterState => ({
  ...state,
  swarm: {
    ...state.swarm,
    ...swarm,
    capabilities: swarm.capabilities
      ? [...swarm.capabilities]
      : state.swarm.capabilities
        ? [...state.swarm.capabilities]
        : undefined,
  },
});

export const toCommandAuditSummary = (
  result: AgenticCommandResult,
): AgenticCommandAuditSummary => ({
  approved: result.audit.approved,
  capabilityId: result.audit.capabilityId,
  commandId: result.commandId,
  completedAt: result.audit.completedAt,
  elapsedMs: result.elapsedMs,
  error: result.error?.message,
  requiresApproval: result.audit.requiresApproval,
  source: result.audit.source,
  startedAt: result.audit.startedAt,
  status: commandStatusMap[result.status],
  toolLabel: result.tool.label,
});

export const appendCommandAudit = (
  state: AgenticCapabilityCommandCenterState,
  result: AgenticCommandResult,
): AgenticCapabilityCommandCenterState => ({
  ...state,
  recentCommands: [
    toCommandAuditSummary(result),
    ...state.recentCommands,
  ].slice(0, MAX_RECENT_COMMANDS),
});
