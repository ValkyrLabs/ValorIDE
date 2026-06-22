import type {
  BuildModeAutonomyPolicy,
  BuildModeCommand,
  BuildModeCommandReceipt,
  BuildModeCommandPolicyRule,
  BuildModeExecutionPlanStep,
  BuildModeGrayMatterContextProof,
  BuildModePromptExecutionContext,
  BuildModeReadinessGate,
  BuildModeScopeContext,
  BuildModeToolPermission,
  GrayMatterContextPack,
} from "@shared/BuildMode";
import { evaluateBuildModeCommandPolicy } from "./BuildModeCommandPolicy";

export interface BuildModeAutonomousQueueValidationRequest {
  autonomyPolicy?: BuildModeAutonomyPolicy;
  command: BuildModeCommand;
  commandCatalog?: BuildModeCommand[];
  commandReceipts?: BuildModeCommandReceipt[];
  commandPolicyRules?: BuildModeCommandPolicyRule[];
  currentConsecutiveCommands?: number;
  estimatedCredits?: number;
  executionPlan?: BuildModeExecutionPlanStep[];
  grayMatterContextPack?: GrayMatterContextPack;
  protectedPaths?: string[];
  readinessGates?: BuildModeReadinessGate[];
  requireGrayMatterContext?: boolean;
  scope?: BuildModeScopeContext;
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
  reasons: string[];
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
  const reasons: string[] = [];

  if (!commandCatalog.length) {
    reasons.push("Autonomous queue dispatch requires a command catalog.");
  }
  if (!executionPlan.length) {
    reasons.push("Autonomous queue dispatch requires an execution plan.");
  }
  if (!nextAction) {
    reasons.push("Autonomous queue has no runnable execution plan command.");
  } else if (nextAction.command.id !== request.command.id) {
    reasons.push(
      `Autonomous queue command is not next in the execution plan: expected ${nextAction.command.id}, got ${request.command.id}.`,
    );
  }

  if (request.command.status !== "queued") {
    reasons.push(
      `Autonomous queue command must be queued, not ${request.command.status}.`,
    );
  }
  if (request.command.requiresApproval) {
    reasons.push("Autonomous queue command declares approval required.");
  }
  if (request.autonomyPolicy?.receiptRequired && nextAction) {
    reasons.push(
      ...validateRequiredDependencyReceipts(
        nextAction.step,
        executionPlan,
        request.commandReceipts ?? [],
      ),
    );
  }

  const policy = evaluateBuildModeCommandPolicy(request.command, {
    autonomyPolicy: request.autonomyPolicy,
    commandPolicyRules: request.commandPolicyRules,
    currentConsecutiveCommands: request.currentConsecutiveCommands,
    estimatedCredits: request.estimatedCredits,
    executionPlan: request.executionPlan,
    grayMatterContextPack: request.grayMatterContextPack,
    protectedPaths: request.protectedPaths,
    readinessGates: request.readinessGates,
    requireGrayMatterContext: request.requireGrayMatterContext,
    scope: request.scope,
    toolPermissions: request.toolPermissions,
    workspaceRoot: request.workspaceRoot,
  });
  if (policy.decision !== "allow") {
    reasons.push(
      `Autonomous queue policy is ${policy.decision}: ${
        policy.reasons.join("; ") || "no policy reason provided"
      }.`,
    );
  }

  return {
    dispatchable: reasons.length === 0,
    nextCommandId: nextAction?.command.id,
    nextStepId: nextAction?.step.id,
    reasons,
  };
};

export const createBuildModeAutonomousQueueBlockedReceipt = (
  request: BuildModeAutonomousQueueBlockedReceiptRequest,
  now: () => Date = () => new Date(),
): BuildModeCommandReceipt => {
  const createdAt = now().toISOString();
  const reasonSummary = request.validation.reasons.join(" ");
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
    status: "rejected",
    approved: false,
    requiresApproval: false,
    summary: `Build Mode autonomous queue blocked ${request.command.label}: ${reasonSummary}`,
    createdAt,
    executionMode: "policy-blocked",
    nextOperatorAction: "revise",
    operatorActionSummary:
      "Revise the command, scope, policy, or approval packet before retrying.",
    assignedRuntimeId: request.command.assignedRuntimeId,
    assignedSwarmRole: request.command.assignedSwarmRole,
    executionPlanStepId: request.command.executionPlanStepId,
    policyDecision: "reject",
    policyReasons: request.validation.reasons,
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
  commandReceipts: BuildModeCommandReceipt[],
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
      return [];
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
    return [];
  });
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
          Boolean(item) &&
          item.status !== "succeeded" &&
          item.status !== "running",
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
  if (["complete", "failed", "blocked"].includes(step.status)) {
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
