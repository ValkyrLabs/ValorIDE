export type AgenticSwarmStatus =
  | "offline"
  | "registering"
  | "online"
  | "busy"
  | "error"
  | "rejected";

export interface AgenticSwarmState {
  activeTaskId?: string;
  capabilities?: string[];
  instanceId?: string;
  lastAckAt?: string;
  lastError?: string;
  lastHeartbeatAt?: string;
  projectId?: string;
  status: AgenticSwarmStatus;
}

export type AgenticCommandStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "rejected"
  | "cancelled";

export type AgenticCommandSource = "cli" | "local" | "swarm" | "mcp";

export interface AgenticCommandAuditSummary {
  approved: boolean;
  capabilityId: string;
  commandId: string;
  completedAt?: string;
  elapsedMs?: number;
  error?: string;
  requiresApproval: boolean;
  source: AgenticCommandSource;
  startedAt: string;
  status: AgenticCommandStatus;
  toolLabel?: string;
}

export interface AgenticCapabilityCommandCenterState {
  approvalPolicy?: string;
  recentCommands: AgenticCommandAuditSummary[];
  swarm: AgenticSwarmState;
}

export const DEFAULT_AGENTIC_COMMAND_CENTER_STATE: AgenticCapabilityCommandCenterState =
  {
    recentCommands: [],
    swarm: {
      status: "offline",
    },
  };
