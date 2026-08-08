import crypto from "crypto";
import { SwarmEntityType, type SwarmMessage } from "@shared/swarm-protocol";

export const SWARM_RUNTIME_OUTCOME_SCHEMA_VERSION =
  "valkyr-swarm-runtime-outcome/v1" as const;
export const SWARM_OUTCOME_HANDOFF_SCHEMA_VERSION =
  "valoride-swarm-outcome-handoffs/v1" as const;
const SWARM_COMMAND_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const SWARM_DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/;
const SWARM_APPROVAL_REF_PATTERN = /^gm_approval_[0-9a-f]{64}$/;

export type SwarmRuntimeOutcomeStatus =
  | "SUCCEEDED"
  | "FAILED"
  | "BLOCKED"
  | "WAITING_APPROVAL"
  | "OUTCOME_UNCERTAIN";

export type SwarmRuntimeOutcomeSource =
  | "runtime-envelope"
  | "legacy-classifier"
  | "adapter-error"
  | "journal-quarantine";

export type SwarmRuntimeOutcomeConfidence =
  | "EXPLICIT"
  | "INFERRED"
  | "UNRESOLVED";

export interface SwarmRuntimeOutcomeError {
  code: string;
  message: string;
  retryable: boolean;
}

/**
 * Server-issued proof for an exact Workflow WAITING_APPROVAL checkpoint.
 * ValorIDE treats this as an opaque signed grant and only validates bindings;
 * signature verification and approver ACL enforcement remain server-owned.
 */
export interface SwarmCanonicalApprovalProof {
  approvalRef: string;
  approvedDigest: string;
  approverPrincipalId: string;
  checkpointId: string;
  decidedAt: string;
  decision: "APPROVED" | "DENIED";
  scopeDigest: string;
  signature: string;
}

export interface SwarmCommandCorrelation {
  action: string;
  actionDigest?: string;
  approvalRef?: string;
  checkpointId?: string;
  commandId: string;
  correlationId: string;
  goalId?: string;
  idempotencyKey: string;
  sessionId: string;
  scopeDigest?: string;
  targetInstanceId: string | null;
  taskId?: string;
  trajectoryId?: string;
  workflowExecutionRef?: string;
  workflowVersionId?: string;
}

export interface SwarmInboundCommandContext {
  approvalProof?: SwarmCanonicalApprovalProof;
  correlation: SwarmCommandCorrelation;
}

export interface SwarmRuntimeOutcomeMetadata {
  action: string;
  checkpointId?: string;
  completedAt: string;
  correlationId: string;
  error?: SwarmRuntimeOutcomeError;
  goalId?: string;
  idempotencyKey: string;
  localTaskId?: string;
  sessionId: string;
  startedAt: string;
  taskId?: string;
  trajectoryId?: string;
  workflowExecutionRef?: string;
  workflowVersionId?: string;
}

/**
 * Canonical SWARM terminal outcome. The binding authority is the core field set
 * consumed by SWARM; metadata is correlation-only and is never trusted to
 * replace command/action/target/scope bindings.
 */
export interface SwarmRuntimeOutcome {
  actionDigest: string;
  approvalRef?: string;
  commandId: string;
  confidence: SwarmRuntimeOutcomeConfidence;
  evidenceRefs: string[];
  metadata?: SwarmRuntimeOutcomeMetadata;
  outcomeHash?: string;
  retryable?: boolean;
  schemaVersion: typeof SWARM_RUNTIME_OUTCOME_SCHEMA_VERSION;
  scopeDigest: string;
  source: SwarmRuntimeOutcomeSource;
  status: SwarmRuntimeOutcomeStatus;
  summary: string;
  targetInstanceId: string | null;
}

export interface SwarmRuntimeOutcomeEnvelope {
  result: {
    outcome: SwarmRuntimeOutcome;
  };
}

export interface SwarmTerminalClassificationInput {
  blocked?: boolean;
  exitCode?: number | null;
  explicitFailure?: boolean;
  outcomeUncertain?: boolean;
  succeeded?: boolean;
  waitingApproval?: boolean;
}

export interface SwarmApprovalAuthorization {
  approved: boolean;
  approvalRef?: string;
  code?: string;
  reason: string;
  status?: "BLOCKED" | "WAITING_APPROVAL";
}

export interface SwarmDurableAssignmentHandoff {
  correlation: SwarmCommandCorrelation;
  localTaskId?: string;
  receivedAt: string;
  startedAt?: string;
  state: "ACCEPTED" | "RUNNING";
}

export interface SwarmOutcomeHandoffSnapshot {
  active: Record<string, SwarmDurableAssignmentHandoff>;
  outcomes: Record<string, SwarmRuntimeOutcome>;
  schemaVersion: typeof SWARM_OUTCOME_HANDOFF_SCHEMA_VERSION;
}

export type SwarmHandoffAcceptance =
  | { kind: "accepted"; handoff: SwarmDurableAssignmentHandoff }
  | { kind: "duplicate-active"; handoff: SwarmDurableAssignmentHandoff }
  | { kind: "duplicate-terminal"; outcome: SwarmRuntimeOutcome }
  | { kind: "conflict"; reason: string };

export class SwarmCorrelationError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "SwarmCorrelationError";
  }
}

/**
 * Normalizes server-owned bindings that may arrive on command top-level,
 * command.metadata, payload.metadata, or parsed command.data metadata. A
 * conflicting duplicate stamp is removed so authorization fails closed.
 */
export const normalizeServerStampedSwarmMessage = (
  message: SwarmMessage,
  sources: any[],
): SwarmMessage => {
  const metadata = {
    ...(message.payload.metadata ?? {}),
  } as Record<string, any>;
  const metadataSources = sources.flatMap((source) => [
    source?.metadata,
    source?.payload?.metadata,
    source?.data?.metadata,
  ]);
  const correlationFields = [
    "approvalProof",
    "checkpointId",
    "correlationId",
    "goalId",
    "idempotencyKey",
    "sessionId",
    "taskId",
    "trajectoryId",
    "workflowExecutionRef",
    "workflowVersionId",
  ];
  for (const field of correlationFields) {
    if (metadata[field] !== undefined) {
      continue;
    }
    metadata[field] = firstDefined([
      ...metadataSources.map((source) => source?.[field]),
      ...sources.map((source) => source?.[field]),
    ]);
  }

  const actionBinding = resolveExactServerBinding(
    "actionDigest",
    metadata,
    metadataSources,
    sources,
  );
  const scopeBinding = resolveExactServerBinding(
    "scopeDigest",
    metadata,
    metadataSources,
    sources,
  );
  metadata.actionDigest = actionBinding.value;
  metadata.scopeDigest = scopeBinding.value;
  const conflicts = [
    ...(actionBinding.conflict ? ["actionDigest"] : []),
    ...(scopeBinding.conflict ? ["scopeDigest"] : []),
  ];
  if (conflicts.length > 0) {
    metadata.bindingConflict = conflicts;
  } else {
    delete metadata.bindingConflict;
  }

  return {
    ...message,
    payload: {
      ...message.payload,
      metadata,
    },
  };
};

export const extractSwarmInboundCommandContext = (
  message: SwarmMessage,
  localInstanceId: string,
): SwarmInboundCommandContext => {
  if (!SWARM_COMMAND_ID_PATTERN.test(message.id)) {
    throw new SwarmCorrelationError(
      "ERR_COMMAND_ID_INVALID",
      `SWARM command id ${message.id} does not satisfy the runtime outcome contract.`,
    );
  }
  const metadata = isRecord(message.payload.metadata)
    ? message.payload.metadata
    : {};
  const suppliedCommandId = readString(metadata.commandId);
  if (suppliedCommandId && suppliedCommandId !== message.id) {
    throw new SwarmCorrelationError(
      "ERR_COMMAND_ID_MISMATCH",
      `SWARM metadata commandId ${suppliedCommandId} does not match message id ${message.id}.`,
    );
  }

  const targetInstanceId = readString(message.to.instanceId) ?? null;
  const localCorrelationTarget =
    targetInstanceId ?? readString(localInstanceId) ?? "broadcast";
  const sessionId =
    readString(metadata.sessionId) ??
    `swarm:${message.from.instanceId ?? message.from.type}:${localCorrelationTarget}`;
  const correlationId =
    readString(metadata.correlationId) ?? `${sessionId}:${message.id}`;
  const actionDigest = readString(metadata.actionDigest);
  const scopeDigest = readString(metadata.scopeDigest);
  const idempotencyKey =
    readString(metadata.idempotencyKey) ??
    `valoride:${localCorrelationTarget}:${message.id}:${actionDigest ?? "unbound"}:${scopeDigest ?? "unscoped"}`;
  const approvalProof = normalizeApprovalProof(metadata.approvalProof);

  return {
    approvalProof,
    correlation: compactObject({
      action: message.payload.action,
      actionDigest,
      approvalRef: approvalProof?.approvalRef,
      checkpointId: readString(metadata.checkpointId),
      commandId: message.id,
      correlationId,
      goalId: readString(metadata.goalId),
      idempotencyKey,
      sessionId,
      scopeDigest,
      targetInstanceId,
      taskId: readString(metadata.taskId),
      trajectoryId: readString(metadata.trajectoryId),
      workflowExecutionRef: readString(metadata.workflowExecutionRef),
      workflowVersionId: readString(metadata.workflowVersionId),
    }) as SwarmCommandCorrelation,
  };
};

export const authorizeCanonicalSwarmApproval = (
  message: SwarmMessage,
  context: SwarmInboundCommandContext,
): SwarmApprovalAuthorization => {
  const { approvalProof, correlation } = context;
  if (
    !correlation.actionDigest ||
    !correlation.scopeDigest ||
    !SWARM_DIGEST_PATTERN.test(correlation.actionDigest) ||
    !SWARM_DIGEST_PATTERN.test(correlation.scopeDigest)
  ) {
    return {
      approved: false,
      code: "ERR_GOVERNED_BINDING_REQUIRED",
      reason:
        "Server-stamped actionDigest and scopeDigest are required for governed SWARM execution.",
      status: "WAITING_APPROVAL",
    };
  }
  if (!approvalProof) {
    return {
      approved: false,
      code: "ERR_APPROVAL_REQUIRED",
      reason:
        "Canonical Workflow approval proof is required for swarm.command.",
      status: "WAITING_APPROVAL",
    };
  }
  if (approvalProof.decision === "DENIED") {
    return {
      approved: false,
      approvalRef: approvalProof.approvalRef,
      code: "ERR_APPROVAL_REJECTED",
      reason: `Workflow approval ${approvalProof.approvalRef} was denied.`,
      status: "BLOCKED",
    };
  }
  if (
    message.from.type !== SwarmEntityType.SERVER &&
    message.from.type !== SwarmEntityType.WORKFLOW
  ) {
    return {
      approved: false,
      approvalRef: approvalProof.approvalRef,
      code: "ERR_APPROVAL_PROOF_SOURCE",
      reason:
        "Canonical approval proof must be delivered by the server action plane.",
      status: "WAITING_APPROVAL",
    };
  }
  if (
    !SWARM_APPROVAL_REF_PATTERN.test(approvalProof.approvalRef) ||
    !approvalProof.approverPrincipalId ||
    !approvalProof.checkpointId ||
    !approvalProof.approvedDigest ||
    !approvalProof.scopeDigest ||
    !approvalProof.signature ||
    !isIsoTimestamp(approvalProof.decidedAt)
  ) {
    return {
      approved: false,
      approvalRef: approvalProof.approvalRef,
      code: "ERR_APPROVAL_PROOF_INVALID",
      reason: "Canonical approval proof is incomplete or malformed.",
      status: "WAITING_APPROVAL",
    };
  }
  if (
    !correlation.checkpointId ||
    approvalProof.checkpointId !== correlation.checkpointId ||
    approvalProof.approvedDigest !== correlation.actionDigest ||
    approvalProof.scopeDigest !== correlation.scopeDigest
  ) {
    return {
      approved: false,
      approvalRef: approvalProof.approvalRef,
      code: "ERR_APPROVAL_BINDING_MISMATCH",
      reason:
        "Canonical approval proof does not match the command checkpoint, actionDigest, or scopeDigest.",
      status: "WAITING_APPROVAL",
    };
  }

  return {
    approved: true,
    approvalRef: approvalProof.approvalRef,
    reason: `Canonical Workflow approval ${approvalProof.approvalRef} matched the exact governed action.`,
  };
};

export const classifySwarmTerminalStatus = (
  input: SwarmTerminalClassificationInput,
): SwarmRuntimeOutcomeStatus => {
  if (input.waitingApproval) {
    return "WAITING_APPROVAL";
  }
  // A declared blocker wins even when a subprocess returned exit code zero.
  if (input.blocked) {
    return "BLOCKED";
  }
  if (
    input.explicitFailure ||
    (typeof input.exitCode === "number" && input.exitCode !== 0)
  ) {
    return "FAILED";
  }
  if (input.outcomeUncertain) {
    return "OUTCOME_UNCERTAIN";
  }
  if (
    input.succeeded &&
    (input.exitCode === undefined ||
      input.exitCode === null ||
      input.exitCode === 0)
  ) {
    return "SUCCEEDED";
  }
  return "OUTCOME_UNCERTAIN";
};

export const buildSwarmRuntimeOutcome = (input: {
  approvalRef?: string;
  completedAt: string;
  confidence?: SwarmRuntimeOutcomeConfidence;
  correlation: SwarmCommandCorrelation;
  error?: SwarmRuntimeOutcomeError;
  evidenceRefs?: string[];
  localTaskId?: string;
  retryable?: boolean;
  source?: SwarmRuntimeOutcomeSource;
  startedAt: string;
  status: SwarmRuntimeOutcomeStatus;
  summary: string;
}): SwarmRuntimeOutcome => {
  const { actionDigest, scopeDigest } = input.correlation;
  if (
    !actionDigest ||
    !scopeDigest ||
    !SWARM_DIGEST_PATTERN.test(actionDigest) ||
    !SWARM_DIGEST_PATTERN.test(scopeDigest)
  ) {
    throw new SwarmCorrelationError(
      "ERR_GOVERNED_BINDING_REQUIRED",
      "Canonical runtime outcomes require server-stamped sha256 actionDigest and scopeDigest bindings.",
    );
  }
  const evidenceRefs = uniqueStrings(input.evidenceRefs ?? []);
  const metadata = compactObject({
    action: input.correlation.action,
    checkpointId: input.correlation.checkpointId,
    completedAt: input.completedAt,
    correlationId: input.correlation.correlationId,
    error: input.error,
    goalId: input.correlation.goalId,
    idempotencyKey: input.correlation.idempotencyKey,
    localTaskId: input.localTaskId,
    sessionId: input.correlation.sessionId,
    startedAt: input.startedAt,
    taskId: input.correlation.taskId,
    trajectoryId: input.correlation.trajectoryId,
    workflowExecutionRef: input.correlation.workflowExecutionRef,
    workflowVersionId: input.correlation.workflowVersionId,
  }) as SwarmRuntimeOutcomeMetadata;
  const outcome = compactObject({
    actionDigest,
    approvalRef: canonicalApprovalRef(
      input.approvalRef ?? input.correlation.approvalRef,
    ),
    commandId: input.correlation.commandId,
    confidence: input.confidence ?? "EXPLICIT",
    evidenceRefs,
    metadata,
    retryable: input.retryable,
    schemaVersion: SWARM_RUNTIME_OUTCOME_SCHEMA_VERSION,
    scopeDigest,
    source: input.source ?? "runtime-envelope",
    status: input.status,
    summary: normalizeSummary(input.summary),
    targetInstanceId: input.correlation.targetInstanceId,
  }) as SwarmRuntimeOutcome;
  outcome.outcomeHash = sha256Canonical(outcome);
  return outcome;
};

export const wrapSwarmRuntimeOutcome = (
  outcome: SwarmRuntimeOutcome,
): SwarmRuntimeOutcomeEnvelope => ({
  result: { outcome },
});

export class SwarmOutcomeHandoffLedger {
  private snapshot: SwarmOutcomeHandoffSnapshot;

  constructor(snapshot?: Partial<SwarmOutcomeHandoffSnapshot> | null) {
    this.snapshot = {
      active: cloneRecord(snapshot?.active),
      outcomes: cloneRecord(snapshot?.outcomes),
      schemaVersion: SWARM_OUTCOME_HANDOFF_SCHEMA_VERSION,
    };
  }

  getSnapshot(): SwarmOutcomeHandoffSnapshot {
    return JSON.parse(JSON.stringify(this.snapshot));
  }

  listActive(): SwarmDurableAssignmentHandoff[] {
    return Object.values(this.snapshot.active).map((value) =>
      JSON.parse(JSON.stringify(value)),
    );
  }

  listOutcomes(): SwarmRuntimeOutcome[] {
    return Object.values(this.snapshot.outcomes).map((value) =>
      JSON.parse(JSON.stringify(value)),
    );
  }

  accept(
    correlation: SwarmCommandCorrelation,
    receivedAt: string,
  ): SwarmHandoffAcceptance {
    const terminal = this.findOutcome(correlation);
    if (terminal) {
      return this.sameBinding(terminal, correlation)
        ? { kind: "duplicate-terminal", outcome: terminal }
        : {
            kind: "conflict",
            reason:
              "Command or idempotency correlation was reused with different governed bindings.",
          };
    }
    const active = this.findActive(correlation);
    if (active) {
      return this.sameBinding(active.correlation, correlation)
        ? { kind: "duplicate-active", handoff: active }
        : {
            kind: "conflict",
            reason:
              "Command or idempotency correlation was reused with different governed bindings.",
          };
    }

    const handoff: SwarmDurableAssignmentHandoff = {
      correlation: JSON.parse(JSON.stringify(correlation)),
      receivedAt,
      state: "ACCEPTED",
    };
    this.snapshot.active[correlation.commandId] = handoff;
    return { kind: "accepted", handoff };
  }

  markRunning(
    commandId: string,
    startedAt: string,
    localTaskId: string,
  ): SwarmDurableAssignmentHandoff | undefined {
    const handoff = this.snapshot.active[commandId];
    if (!handoff) {
      return undefined;
    }
    handoff.localTaskId = localTaskId;
    handoff.startedAt = startedAt;
    handoff.state = "RUNNING";
    return JSON.parse(JSON.stringify(handoff));
  }

  complete(outcome: SwarmRuntimeOutcome): SwarmRuntimeOutcome {
    const existing = this.findOutcomeByCommandOrIdempotency(
      outcome.commandId,
      outcome.metadata?.idempotencyKey,
    );
    if (existing) {
      return JSON.parse(JSON.stringify(existing));
    }
    delete this.snapshot.active[outcome.commandId];
    this.snapshot.outcomes[outcome.commandId] = JSON.parse(
      JSON.stringify(outcome),
    );
    this.trimOutcomes(200);
    return JSON.parse(JSON.stringify(outcome));
  }

  recoverUnfinished(completedAt: string): SwarmRuntimeOutcome[] {
    const recovered: SwarmRuntimeOutcome[] = [];
    for (const handoff of this.listActive()) {
      const outcome = buildSwarmRuntimeOutcome({
        completedAt,
        correlation: handoff.correlation,
        error: {
          code: "ERR_RUNTIME_RESTARTED",
          message:
            "ValorIDE restarted before it could prove the assignment's terminal outcome.",
          retryable: true,
        },
        evidenceRefs: [],
        localTaskId: handoff.localTaskId,
        retryable: true,
        startedAt: handoff.startedAt ?? handoff.receivedAt,
        status: "OUTCOME_UNCERTAIN",
        summary:
          "Runtime restarted before a durable success, failure, or blocker could be proven.",
      });
      this.complete(outcome);
      recovered.push(outcome);
    }
    return recovered;
  }

  private findActive(
    correlation: SwarmCommandCorrelation,
  ): SwarmDurableAssignmentHandoff | undefined {
    return Object.values(this.snapshot.active).find(
      (handoff) =>
        handoff.correlation.commandId === correlation.commandId ||
        handoff.correlation.idempotencyKey === correlation.idempotencyKey,
    );
  }

  private findOutcome(
    correlation: SwarmCommandCorrelation,
  ): SwarmRuntimeOutcome | undefined {
    return this.findOutcomeByCommandOrIdempotency(
      correlation.commandId,
      correlation.idempotencyKey,
    );
  }

  private findOutcomeByCommandOrIdempotency(
    commandId: string,
    idempotencyKey?: string,
  ): SwarmRuntimeOutcome | undefined {
    return Object.values(this.snapshot.outcomes).find(
      (outcome) =>
        outcome.commandId === commandId ||
        Boolean(
          idempotencyKey && outcome.metadata?.idempotencyKey === idempotencyKey,
        ),
    );
  }

  private sameBinding(
    existing: SwarmCommandCorrelation | SwarmRuntimeOutcome,
    incoming: SwarmCommandCorrelation,
  ): boolean {
    if ("schemaVersion" in existing) {
      return (
        existing.commandId === incoming.commandId &&
        existing.actionDigest === incoming.actionDigest &&
        existing.scopeDigest === incoming.scopeDigest &&
        existing.targetInstanceId === incoming.targetInstanceId
      );
    }
    return (
      existing.commandId === incoming.commandId &&
      existing.idempotencyKey === incoming.idempotencyKey &&
      existing.actionDigest === incoming.actionDigest &&
      existing.scopeDigest === incoming.scopeDigest &&
      existing.targetInstanceId === incoming.targetInstanceId
    );
  }

  private trimOutcomes(limit: number): void {
    const ids = Object.keys(this.snapshot.outcomes);
    for (const id of ids.slice(0, Math.max(0, ids.length - limit))) {
      delete this.snapshot.outcomes[id];
    }
  }
}

const normalizeApprovalProof = (
  value: unknown,
): SwarmCanonicalApprovalProof | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }
  const decision = readString(value.decision)?.toUpperCase();
  if (decision !== "APPROVED" && decision !== "DENIED") {
    return undefined;
  }
  return {
    approvalRef: readString(value.approvalRef) ?? "",
    approvedDigest: readString(value.approvedDigest) ?? "",
    approverPrincipalId: readString(value.approverPrincipalId) ?? "",
    checkpointId: readString(value.checkpointId) ?? "",
    decidedAt: readString(value.decidedAt) ?? "",
    decision,
    scopeDigest: readString(value.scopeDigest) ?? "",
    signature: readString(value.signature) ?? "",
  };
};

const resolveExactServerBinding = (
  field: "actionDigest" | "scopeDigest",
  currentMetadata: Record<string, any>,
  metadataSources: any[],
  sources: any[],
): { conflict: boolean; value?: string } => {
  const values = [
    currentMetadata[field],
    ...metadataSources.map((source) => source?.[field]),
    ...sources.map((source) => source?.[field]),
  ].filter(
    (value): value is string =>
      typeof value === "string" && value.trim().length > 0,
  );
  const distinct = Array.from(new Set(values));
  return distinct.length > 1
    ? { conflict: true }
    : { conflict: false, value: distinct[0] };
};

const firstDefined = (values: unknown[]): unknown =>
  values.find((value) => value !== undefined && value !== null);

const sha256Canonical = (value: unknown): string =>
  `sha256:${crypto
    .createHash("sha256")
    .update(stableStringify(value))
    .digest("hex")}`;

const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
};

const compactObject = <T extends Record<string, unknown>>(value: T): T =>
  Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as T;

const uniqueStrings = (values: string[]): string[] =>
  Array.from(
    new Set(
      values
        .filter((value) => typeof value === "string" && value.trim())
        .map((value) => value.slice(0, 2_000)),
    ),
  ).slice(0, 50);

const normalizeSummary = (value: string): string =>
  String(value ?? "").slice(0, 2_000);

const canonicalApprovalRef = (value?: string): string | undefined =>
  value && SWARM_APPROVAL_REF_PATTERN.test(value) ? value : undefined;

const cloneRecord = <T>(
  value: Record<string, T> | undefined,
): Record<string, T> =>
  value && isRecord(value) ? JSON.parse(JSON.stringify(value)) : {};

const readString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value : undefined;

const isRecord = (value: unknown): value is Record<string, any> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const isIsoTimestamp = (value: string): boolean =>
  Boolean(value) && Number.isFinite(Date.parse(value));
