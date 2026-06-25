import type {
  BuildModeApprovalThreshold,
  BuildModeAgentRuntimeBinding,
  BuildModeAutonomyPolicy,
  BuildModeCheckpoint,
  BuildModeCommand,
  BuildModeCommandReceipt,
  BuildModeCommandPolicyRule,
  BuildModePolicyDecision,
  BuildModeExecutionPlanStep,
  BuildModeGrayMatterContextProof,
  BuildModePromptExecutionContext,
  BuildModeReadinessGate,
  BuildModeScopeContext,
  BuildModeSwarmRoleAssignment,
  BuildModeToolPermission,
  GrayMatterContextPack,
  ProviderCredentialRef,
  ProviderRoute,
  Receipt,
} from "@shared/BuildMode";
import { evaluateBuildModeCommandPolicy } from "./BuildModeCommandPolicy";

export interface BuildModeAutonomousQueueValidationRequest {
  agentRuntimes?: BuildModeAgentRuntimeBinding[];
  autonomyPolicy?: BuildModeAutonomyPolicy;
  browserPreviewUrl?: string;
  checkpoints?: BuildModeCheckpoint[];
  command: BuildModeCommand;
  commandCatalog?: BuildModeCommand[];
  commandReceipts?: BuildModeCommandReceipt[];
  commandPolicyRules?: BuildModeCommandPolicyRule[];
  currentConsecutiveCommands?: number;
  estimatedCredits?: number;
  executionPlan?: BuildModeExecutionPlanStep[];
  finalReportMarkdown?: string;
  grayMatterContextPack?: GrayMatterContextPack;
  promptContext?: BuildModePromptExecutionContext;
  providerCredentials?: ProviderCredentialRef[];
  providerRoute?: ProviderRoute;
  protectedPaths?: string[];
  readinessGates?: BuildModeReadinessGate[];
  receipts?: Receipt[];
  requireGrayMatterContext?: boolean;
  scope?: BuildModeScopeContext;
  swarmRoles?: BuildModeSwarmRoleAssignment[];
  toolPermissions?: BuildModeToolPermission[];
  workspaceRoot?: string;
}

export interface BuildModeAutonomousQueueBlockedReceiptRequest
  extends BuildModeAutonomousQueueValidationRequest {
  promptContext?: BuildModePromptExecutionContext;
  taskId?: string;
  validation: BuildModeAutonomousQueueValidationResult;
}

export interface BuildModeAutonomousQueueValidationResult {
  dispatchable: boolean;
  nextCommandId?: string;
  nextStepId?: string;
  policyDecision: BuildModePolicyDecision;
  reasons: string[];
  requiredApprovalThreshold?: BuildModeApprovalThreshold;
}

export const validateBuildModeAutonomousQueueDispatch = (
  request: BuildModeAutonomousQueueValidationRequest,
): BuildModeAutonomousQueueValidationResult => {
  const commandCatalog = request.commandCatalog ?? [];
  const executionPlan = request.executionPlan ?? [];
  const nextAction =
    commandCatalog.length && executionPlan.length
      ? getNextBuildModeQueueAction(commandCatalog, executionPlan)
      : undefined;
  const approvalReasons: string[] = [];
  const rejectionReasons: string[] = [];

  if (!commandCatalog.length) {
    rejectionReasons.push(
      "Autonomous queue dispatch requires a command catalog.",
    );
  }
  if (!executionPlan.length) {
    rejectionReasons.push(
      "Autonomous queue dispatch requires an execution plan.",
    );
  }
  if (!nextAction) {
    rejectionReasons.push(
      "Autonomous queue has no runnable execution plan command.",
    );
  } else if (nextAction.command.id !== request.command.id) {
    rejectionReasons.push(
      `Autonomous queue command is not next in the execution plan: expected ${nextAction.command.id}, got ${request.command.id}.`,
    );
  } else {
    rejectionReasons.push(
      ...validateAutonomousCommandOwnership(
        request.command,
        nextAction.step,
        request.agentRuntimes,
        request.swarmRoles,
      ),
    );
  }

  if (request.command.status !== "queued") {
    rejectionReasons.push(
      `Autonomous queue command must be queued, not ${request.command.status}.`,
    );
  }
  if (request.command.requiresApproval) {
    approvalReasons.push(
      "Autonomous queue command declares approval required.",
    );
  }
  if (request.autonomyPolicy?.receiptRequired && nextAction) {
    rejectionReasons.push(
      ...validateRequiredDependencyReceipts(
        nextAction.step,
        executionPlan,
        commandCatalog,
        request.commandReceipts ?? [],
        request.checkpoints ?? [],
      ),
    );
  }

  const policy = evaluateBuildModeCommandPolicy(request.command, {
    autonomyPolicy: request.autonomyPolicy,
    browserPreviewUrl: request.browserPreviewUrl,
    checkpoints: request.checkpoints,
    commandReceipts: request.commandReceipts,
    commandPolicyRules: request.commandPolicyRules,
    currentConsecutiveCommands: request.currentConsecutiveCommands,
    estimatedCredits: request.estimatedCredits,
    executionPlan: request.executionPlan,
    finalReportMarkdown: request.finalReportMarkdown,
    grayMatterContextPack: request.grayMatterContextPack,
    promptContext: request.promptContext,
    providerCredentials: request.providerCredentials,
    providerRoute: request.providerRoute,
    protectedPaths: request.protectedPaths,
    readinessGates: request.readinessGates,
    receipts: request.receipts,
    requireGrayMatterContext: request.requireGrayMatterContext,
    scope: request.scope,
    toolPermissions: request.toolPermissions,
    workspaceRoot: request.workspaceRoot,
  });
  if (policy.decision !== "allow") {
    const policyReason = `Autonomous queue policy is ${policy.decision}: ${
      policy.reasons.join("; ") || "no policy reason provided"
    }.`;
    if (policy.decision === "approval-required") {
      approvalReasons.push(policyReason);
    } else {
      rejectionReasons.push(policyReason);
    }
  }
  const policyDecision: BuildModePolicyDecision = rejectionReasons.length
    ? "reject"
    : approvalReasons.length
      ? "approval-required"
      : "allow";
  const reasons = [...rejectionReasons, ...approvalReasons];

  return {
    dispatchable: reasons.length === 0,
    nextCommandId: nextAction?.command.id,
    nextStepId: nextAction?.step.id,
    policyDecision,
    reasons,
    requiredApprovalThreshold:
      policy.requiredApprovalThreshold !== "none"
        ? policy.requiredApprovalThreshold
        : undefined,
  };
};

const validateAutonomousCommandOwnership = (
  command: BuildModeCommand,
  step: BuildModeExecutionPlanStep,
  agentRuntimes: BuildModeAgentRuntimeBinding[] | undefined,
  swarmRoles: BuildModeSwarmRoleAssignment[] | undefined,
): string[] => {
  const reasons: string[] = [];
  if (!agentRuntimes?.length) {
    reasons.push(
      "Autonomous queue dispatch requires an agent runtime registry.",
    );
  }
  if (!swarmRoles?.length) {
    reasons.push("Autonomous queue dispatch requires swarm role assignments.");
  }

  if (!command.executionPlanStepId) {
    reasons.push(
      `Autonomous queue command ${command.id} requires an executionPlanStepId before dispatch.`,
    );
  } else if (command.executionPlanStepId !== step.id) {
    reasons.push(
      `Autonomous queue command ${command.id} executionPlanStepId ${command.executionPlanStepId} does not match next step ${step.id}.`,
    );
  }

  if (!command.assignedRuntimeId) {
    reasons.push(
      `Autonomous queue command ${command.id} requires an assignedRuntimeId before dispatch.`,
    );
  } else {
    if (command.assignedRuntimeId !== step.runtimeId) {
      reasons.push(
        `Autonomous queue command ${command.id} assignedRuntimeId ${command.assignedRuntimeId} does not match next step runtime ${step.runtimeId}.`,
      );
    }
    const runtime = agentRuntimes?.find(
      (candidate) => candidate.id === command.assignedRuntimeId,
    );
    if (agentRuntimes?.length && !runtime) {
      reasons.push(
        `Autonomous queue command ${command.id} references missing agentRuntime ${command.assignedRuntimeId}.`,
      );
    }
    if (runtime && !isDispatchableRuntimeStatus(runtime.status)) {
      reasons.push(
        `Autonomous queue agentRuntime ${runtime.id} is not available for dispatch: ${runtime.status}.`,
      );
    }
    if (
      runtime &&
      command.assignedSwarmRole &&
      runtime.ownerRole !== command.assignedSwarmRole
    ) {
      reasons.push(
        `Autonomous queue command ${command.id} assignedSwarmRole ${command.assignedSwarmRole} does not match runtime ${runtime.id} ownerRole ${runtime.ownerRole}.`,
      );
    }
  }

  if (!command.assignedSwarmRole) {
    reasons.push(
      `Autonomous queue command ${command.id} requires an assignedSwarmRole before dispatch.`,
    );
  } else {
    const role = swarmRoles?.find(
      (candidate) => candidate.role === command.assignedSwarmRole,
    );
    if (swarmRoles?.length && !role) {
      reasons.push(
        `Autonomous queue command ${command.id} references missing swarmRole ${command.assignedSwarmRole}.`,
      );
    }
    if (role && !isDispatchableSwarmRoleStatus(role.status)) {
      reasons.push(
        `Autonomous queue swarmRole ${role.role} is not available for dispatch: ${role.status}.`,
      );
    }
  }
  return reasons;
};

const isDispatchableRuntimeStatus = (
  status: BuildModeAgentRuntimeBinding["status"],
): boolean => status === "available" || status === "selected";

const isDispatchableSwarmRoleStatus = (
  status: BuildModeSwarmRoleAssignment["status"],
): boolean => status === "assigned" || status === "idle";

export const createBuildModeAutonomousQueueBlockedReceipt = (
  request: BuildModeAutonomousQueueBlockedReceiptRequest,
  now: () => Date = () => new Date(),
): BuildModeCommandReceipt => {
  const createdAt = now().toISOString();
  const reasonSummary = request.validation.reasons.join(" ");
  const approvalRequired =
    request.validation.policyDecision === "approval-required";
  return {
    id: `build-command-receipt-${request.command.id}-autonomous-queue-blocked-${stableHash(
      [
        request.command.id,
        createdAt,
        request.validation.nextCommandId ?? "",
        reasonSummary,
      ].join(":"),
    ).slice(0, 12)}`,
    commandId: request.command.id,
    capabilityId: request.command.capabilityId,
    status: approvalRequired ? "approval-required" : "rejected",
    approved: false,
    requiresApproval: approvalRequired,
    summary: `Build Mode autonomous queue blocked ${request.command.label}: ${reasonSummary}`,
    createdAt,
    executionMode: approvalRequired ? "approval-gate" : "policy-blocked",
    nextOperatorAction: approvalRequired ? "approve" : "revise",
    operatorActionSummary:
      request.validation.policyDecision === "approval-required"
        ? "Approve the command before retrying autonomous queue dispatch."
        : "Revise the command, scope, policy, or approval packet before retrying.",
    assignedRuntimeId: request.command.assignedRuntimeId,
    assignedSwarmRole: request.command.assignedSwarmRole,
    executionPlanStepId: request.command.executionPlanStepId,
    policyDecision: request.validation.policyDecision,
    policyReasons: request.validation.reasons,
    requiredApprovalThreshold: request.validation.requiredApprovalThreshold,
    promptContext: request.promptContext,
    scope: request.scope,
    grayMatterContextProof: createGrayMatterContextProof(
      request.grayMatterContextPack,
    ),
  };
};

const validateRequiredDependencyReceipts = (
  step: BuildModeExecutionPlanStep,
  executionPlan: BuildModeExecutionPlanStep[],
  commandCatalog: BuildModeCommand[],
  commandReceipts: BuildModeCommandReceipt[],
  checkpoints: BuildModeCheckpoint[],
): string[] => {
  const dependencySteps = collectDependencySteps(step, executionPlan);
  const dependencyCommandIds = new Set(
    dependencySteps.flatMap((dependency) => dependency.commandIds),
  );
  if (!dependencyCommandIds.size) {
    return [];
  }

  const latestReceiptByCommandId =
    getLatestBuildModeReceiptByCommandId(commandReceipts);
  const commandById = new Map(commandCatalog.map((command) => [command.id, command]));
  const stepByCommandId = new Map<string, BuildModeExecutionPlanStep>();
  for (const dependency of dependencySteps) {
    for (const commandId of dependency.commandIds) {
      stepByCommandId.set(commandId, dependency);
    }
  }

  return Array.from(dependencyCommandIds).flatMap((commandId) => {
    const dependencyStep = stepByCommandId.get(commandId);
    const receipt = latestReceiptByCommandId.get(commandId);
    if (dependencyStep && !dependencyStep.receiptIds.length) {
      return [
        `Autonomous queue receipt is required for dependency step ${dependencyStep.id}.`,
      ];
    }
    if (!receipt) {
      return [
        `Autonomous queue dependency receipt proof is missing for ${commandId}.`,
      ];
    }
    if (receipt.status !== "succeeded") {
      return [
        `Autonomous queue dependency receipt is not succeeded for ${commandId}: ${receipt.status}.`,
      ];
    }
    if (dependencyStep && !dependencyStep.receiptIds.includes(receipt.id)) {
      return [
        `Autonomous queue dependency step ${dependencyStep.id} does not include latest receipt ${receipt.id} for ${commandId}.`,
      ];
    }
    const command = commandById.get(commandId);
    if (!command) {
      return [
        `Autonomous queue dependency command ${commandId} is missing from the command catalog.`,
      ];
    }
    if (command.status !== "succeeded") {
      return [
        `Autonomous queue dependency command ${commandId} is not succeeded: ${command.status}.`,
      ];
    }
    if (command.receiptId !== receipt.id) {
      return [
        `Autonomous queue dependency command ${commandId} receiptId ${command.receiptId ?? "missing"} does not match latest receipt ${receipt.id}.`,
      ];
    }
    if (isMutableDependencyCommand(command)) {
      return validateMutableDependencyCheckpointProof(
        command,
        checkpoints,
        commandReceipts,
      );
    }
    return [];
  });
};

const isMutableDependencyCommand = (command: BuildModeCommand): boolean =>
  command.kind === "edit" ||
  command.capabilityId === "psr.edit" ||
  command.capabilityId === "filesystem.write";

const validateMutableDependencyCheckpointProof = (
  command: BuildModeCommand,
  checkpoints: BuildModeCheckpoint[],
  commandReceipts: BuildModeCommandReceipt[],
): string[] => {
  const checkpoint = checkpoints.find(
    (candidate) =>
      candidate.status === "rollback-ready" &&
      Boolean(candidate.hash) &&
      candidate.receiptIds.length > 0,
  );
  if (!checkpoint) {
    return [
      `Autonomous queue mutable dependency ${command.id} requires a rollback-ready checkpoint with hash and receipt proof before advancing.`,
    ];
  }

  const checkpointReceipts = checkpoint.receiptIds
    .map((receiptId) =>
      commandReceipts.find((receipt) => receipt.id === receiptId),
    )
    .filter((receipt): receipt is BuildModeCommandReceipt => Boolean(receipt));
  const hasSucceededCheckpointReceipt = checkpointReceipts.some(
    (receipt) =>
      receipt.capabilityId === "checkpoint.manage" &&
      receipt.status === "succeeded" &&
      receipt.artifacts?.some((artifact) => {
        const metadata = artifact.metadata ?? {};
        return (
          artifact.kind === "checkpoint" &&
          metadata.checkpointAction === "create" &&
          metadata.checkpointHash === checkpoint.hash
        );
      }),
  );
  if (!hasSucceededCheckpointReceipt) {
    return [
      `Autonomous queue rollback-ready checkpoint ${checkpoint.id} requires a succeeded checkpoint.manage receipt with checkpoint artifact proof before advancing past mutable dependency ${command.id}.`,
    ];
  }
  return [];
};

const collectDependencySteps = (
  step: BuildModeExecutionPlanStep,
  executionPlan: BuildModeExecutionPlanStep[],
): BuildModeExecutionPlanStep[] => {
  const stepById = new Map(executionPlan.map((item) => [item.id, item]));
  const visited = new Set<string>();
  const dependencies: BuildModeExecutionPlanStep[] = [];

  const visit = (stepId: string) => {
    if (visited.has(stepId)) {
      return;
    }
    visited.add(stepId);
    const dependency = stepById.get(stepId);
    if (!dependency) {
      return;
    }
    dependencies.push(dependency);
    for (const dependencyId of dependency.dependencyStepIds) {
      visit(dependencyId);
    }
  };

  for (const dependencyId of step.dependencyStepIds) {
    visit(dependencyId);
  }
  return dependencies;
};

const getLatestBuildModeReceiptByCommandId = (
  receipts: BuildModeCommandReceipt[],
): Map<string, BuildModeCommandReceipt> => {
  const latestReceiptByCommandId = new Map<string, BuildModeCommandReceipt>();
  for (const receipt of receipts) {
    const current = latestReceiptByCommandId.get(receipt.commandId);
    if (!current || receipt.createdAt > current.createdAt) {
      latestReceiptByCommandId.set(receipt.commandId, receipt);
    }
  }
  return latestReceiptByCommandId;
};

const getNextBuildModeQueueAction = (
  commandCatalog: BuildModeCommand[],
  executionPlan: BuildModeExecutionPlanStep[],
):
  | {
      command: BuildModeCommand;
      step: BuildModeExecutionPlanStep;
    }
  | undefined => {
  const commandById = new Map(
    commandCatalog.map((command) => [command.id, command]),
  );
  const stepById = new Map(executionPlan.map((step) => [step.id, step]));

  for (const step of executionPlan) {
    if (!isRunnableExecutionStep(step, stepById)) {
      continue;
    }
    const command = step.commandIds
      .map((commandId) => commandById.get(commandId))
      .find(
        (item): item is BuildModeCommand =>
          Boolean(item) && item.status === "queued",
      );
    if (command) {
      return { command, step };
    }
  }
  return undefined;
};

const isRunnableExecutionStep = (
  step: BuildModeExecutionPlanStep,
  stepById: Map<string, BuildModeExecutionPlanStep>,
): boolean => {
  if (!["approval-required", "ready", "running"].includes(step.status)) {
    return false;
  }
  return step.dependencyStepIds.every(
    (dependencyId) => stepById.get(dependencyId)?.status === "complete",
  );
};

const createGrayMatterContextProof = (
  contextPack: GrayMatterContextPack | undefined,
): BuildModeGrayMatterContextProof | undefined =>
  contextPack
    ? {
        contextPackId: contextPack.id,
        answerPolicy: contextPack.answerPolicy,
        invariantPreflightStatus: contextPack.invariantPreflightStatus,
        preflightReceiptId: contextPack.preflightReceiptId,
        retrievalReceiptIds: contextPack.retrievalReceiptIds,
        retrievalStatus: contextPack.retrievalStatus,
        retrievalTraceId: contextPack.retrievalTraceId,
      }
    : undefined;

const stableHash = (value: string): string => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
};
