import type {
  AppBundleDiff,
  BuildModeApprovalThreshold,
  BuildModeAutonomyDecision,
  BuildModeAutomationSnapshot,
  BrowserVerificationStatus,
  BuildModeAgentLoopPhase,
  BuildModeAgentRuntimeBinding,
  BuildModeCommand,
  BuildModeEvidenceArtifact,
  BuildModeCommandPolicyRule,
  BuildModeCommandReceipt,
  BuildModeExecutionPlanStep,
  GrayMatterContextPack,
  BuildModePromptExecutionContext,
  BuildModeReadinessGate,
  ProviderCredentialRef,
  ScheduledAutomationBinding,
  ValorTaskBridgePayload,
  WorkflowMcpBinding,
} from "@shared/BuildMode";
import { digitalProductProBuildModePayload } from "./buildModeFixtures";

const providerRoutes = new Set([
  "bring-your-own-key",
  "valkyr-credits",
  "local-model",
  "enterprise-proxy",
]);

const hasTaskPayloadShape = (
  value: unknown,
): value is Partial<ValorTaskBridgePayload> &
  Pick<
    ValorTaskBridgePayload,
    "appBundle" | "grayMatterContextPack" | "taskId"
  > => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.taskId === "string" &&
    !!candidate.appBundle &&
    !!candidate.grayMatterContextPack
  );
};

const sanitizeCredentialRefs = (
  refs: ProviderCredentialRef[] | undefined,
): ProviderCredentialRef[] =>
  (refs ?? digitalProductProBuildModePayload.providerCredentials).map(
    (ref) => ({
      id: ref.id,
      route: ref.route,
      displayName: ref.displayName,
      tenantScoped: Boolean(ref.tenantScoped),
      secretAvailable: Boolean(ref.secretAvailable),
    }),
  );

export const coerceValorTaskBridgePayload = (
  value: unknown,
): ValorTaskBridgePayload => {
  if (!hasTaskPayloadShape(value)) {
    return digitalProductProBuildModePayload;
  }

  const route = providerRoutes.has(String(value.selectedProviderRoute))
    ? value.selectedProviderRoute
    : digitalProductProBuildModePayload.selectedProviderRoute;

  const payload = {
    ...digitalProductProBuildModePayload,
    ...value,
    selectedProviderRoute:
      route as ValorTaskBridgePayload["selectedProviderRoute"],
    scope: value.scope ?? digitalProductProBuildModePayload.scope,
    grayMatterContextPack: normalizeGrayMatterContextPack(
      value.grayMatterContextPack,
    ),
    providerCredentials: sanitizeCredentialRefs(value.providerCredentials),
    componentBundles:
      value.componentBundles ??
      digitalProductProBuildModePayload.componentBundles,
    execModules:
      value.execModules ?? digitalProductProBuildModePayload.execModules,
    receipts: value.receipts ?? digitalProductProBuildModePayload.receipts,
    creditUsageReceipts:
      value.creditUsageReceipts ??
      digitalProductProBuildModePayload.creditUsageReceipts,
    promptProfiles:
      value.promptProfiles ?? digitalProductProBuildModePayload.promptProfiles,
    promptBundles:
      value.promptBundles ?? digitalProductProBuildModePayload.promptBundles,
    selectedPromptBundleId:
      value.selectedPromptBundleId ??
      digitalProductProBuildModePayload.selectedPromptBundleId,
    workflowMcpBindings:
      value.workflowMcpBindings ??
      digitalProductProBuildModePayload.workflowMcpBindings,
    scheduledAutomations:
      value.scheduledAutomations ??
      digitalProductProBuildModePayload.scheduledAutomations,
    capabilities:
      value.capabilities ?? digitalProductProBuildModePayload.capabilities,
    guardrails:
      value.guardrails ?? digitalProductProBuildModePayload.guardrails,
    toolPermissions:
      value.toolPermissions ??
      digitalProductProBuildModePayload.toolPermissions,
    commandPolicyRules:
      value.commandPolicyRules ??
      digitalProductProBuildModePayload.commandPolicyRules,
    checkpoints:
      value.checkpoints ?? digitalProductProBuildModePayload.checkpoints,
    safeEditPlans:
      value.safeEditPlans ?? digitalProductProBuildModePayload.safeEditPlans,
    swarmRoles:
      value.swarmRoles ?? digitalProductProBuildModePayload.swarmRoles,
    agentLoop: value.agentLoop ?? digitalProductProBuildModePayload.agentLoop,
    agentRuntimes:
      value.agentRuntimes ?? digitalProductProBuildModePayload.agentRuntimes,
    thorApiVaixBindings:
      value.thorApiVaixBindings ??
      digitalProductProBuildModePayload.thorApiVaixBindings,
    autonomyPolicy:
      value.autonomyPolicy ?? digitalProductProBuildModePayload.autonomyPolicy,
    readinessGates:
      value.readinessGates ?? digitalProductProBuildModePayload.readinessGates,
    executionPlan:
      value.executionPlan ?? digitalProductProBuildModePayload.executionPlan,
    commands: value.commands ?? digitalProductProBuildModePayload.commands,
    commandReceipts:
      value.commandReceipts ??
      digitalProductProBuildModePayload.commandReceipts,
    evidenceArtifacts:
      value.evidenceArtifacts ??
      digitalProductProBuildModePayload.evidenceArtifacts,
    browserVerification:
      value.browserVerification ??
      digitalProductProBuildModePayload.browserVerification,
    finalReport:
      value.finalReport ?? digitalProductProBuildModePayload.finalReport,
    appBundleDiffs: value.appBundleDiffs ?? deriveAppBundleDiffs(value),
  } as ValorTaskBridgePayload;
  return {
    ...payload,
    autonomyDecision: deriveBuildModeAutonomyDecision(payload),
  };
};

const normalizeGrayMatterContextPack = (
  pack: ValorTaskBridgePayload["grayMatterContextPack"],
): GrayMatterContextPack => {
  const retrievalReceiptIds = pack.retrievalReceiptIds ?? [];
  return {
    ...digitalProductProBuildModePayload.grayMatterContextPack,
    ...pack,
    answerPolicy: pack.answerPolicy ?? pack.policy,
    retrievalReceiptIds,
    retrievalStatus:
      pack.retrievalStatus ??
      (retrievalReceiptIds.length ? "ready" : "blocked"),
    invariantPreflightStatus:
      pack.invariantPreflightStatus ??
      (retrievalReceiptIds.length ? "passed" : "missing"),
    memoryEntryIds: pack.memoryEntryIds ?? [],
    sourceRefs: pack.sourceRefs ?? [],
    majorTaskRefs: pack.majorTaskRefs ?? [],
  };
};

export const deriveAppBundleDiffs = (value: {
  appBundle: ValorTaskBridgePayload["appBundle"];
}): AppBundleDiff[] => {
  const artifacts = value.appBundle.artifacts ?? [];
  if (!artifacts.length) {
    return [];
  }

  const addedArtifacts = artifacts
    .filter((artifact) => artifact.kind !== "editable")
    .map((artifact) => artifact.path);
  const changedArtifacts = artifacts
    .filter((artifact) => artifact.kind === "editable")
    .map((artifact) => artifact.path);

  return [
    {
      id: `app-bundle-diff-${value.appBundle.id}`,
      title: `${value.appBundle.name} generated artifact diff`,
      addedArtifacts,
      changedArtifacts,
      removedArtifacts: [],
    },
  ];
};

export const createWorkflowMcpCommand = (
  binding: WorkflowMcpBinding,
): BuildModeCommand => ({
  id: `cmd-workflow-${binding.id}`,
  kind: "workflow",
  label: `Run ${binding.toolName}`,
  command: `mcp:${binding.serverName}.${binding.toolName} workflow:${binding.workflowRef} input:${binding.inputContractRef}`,
  capabilityId: "mcp.tool",
  requiresApproval: binding.approvalRequired,
  status: binding.approvalRequired ? "approval-required" : "queued",
});

export const createScheduledAutomationCommand = (
  automation: ScheduledAutomationBinding,
): BuildModeCommand => ({
  id: `cmd-automation-${automation.id}`,
  kind: "automation",
  label: `Schedule ${automation.label}`,
  command: `schedule:${automation.schedule} workflow:${automation.workflowRef}${automation.commandRef ? ` command:${automation.commandRef}` : ""}`,
  capabilityId: "automation.schedule",
  requiresApproval: automation.approvalRequired,
  status: toScheduledAutomationCommandStatus(automation),
});

const toScheduledAutomationCommandStatus = (
  automation: ScheduledAutomationBinding,
): BuildModeCommand["status"] => {
  if (automation.status === "scheduled" || automation.status === "paused") {
    return "succeeded";
  }
  if (automation.status === "blocked") {
    return "rejected";
  }
  return automation.approvalRequired ? "approval-required" : "queued";
};

export const getBuildModeCommandCatalog = (
  payload: ValorTaskBridgePayload,
): BuildModeCommand[] => {
  const latestReceiptByCommandId = getLatestReceiptByCommandId(
    payload.commandReceipts,
    { ignoreScheduledAutomationRunAttempts: true },
  );

  const commandById = new Map<string, BuildModeCommand>();
  const addCommand = (command: BuildModeCommand) => {
    if (!commandById.has(command.id)) {
      commandById.set(command.id, command);
    }
  };

  payload.commands.forEach(addCommand);
  payload.workflowMcpBindings.map(createWorkflowMcpCommand).forEach(addCommand);
  payload.scheduledAutomations
    .map(createScheduledAutomationCommand)
    .forEach(addCommand);

  return Array.from(commandById.values()).map((command) => {
    const assignedCommand = assignCommandSwarmContext(command, payload);
    const receipt = latestReceiptByCommandId.get(command.id);
    if (!receipt) {
      return assignedCommand;
    }
    return {
      ...assignedCommand,
      receiptId: receipt.id,
      status: receipt.status,
    };
  });
};

const assignCommandSwarmContext = (
  command: BuildModeCommand,
  payload: ValorTaskBridgePayload,
): BuildModeCommand => {
  if (
    command.assignedSwarmRole &&
    command.assignedRuntimeId &&
    command.executionPlanStepId
  ) {
    return command;
  }
  const assignment = getBuildModeCommandSwarmAssignment(
    command.id,
    payload.executionPlan,
    payload.agentRuntimes,
  );
  if (!assignment) {
    return command;
  }
  return {
    ...command,
    assignedRuntimeId: command.assignedRuntimeId ?? assignment.runtimeId,
    assignedSwarmRole: command.assignedSwarmRole ?? assignment.swarmRole,
    executionPlanStepId: command.executionPlanStepId ?? assignment.stepId,
  };
};

export const getBuildModeCommandSwarmAssignment = (
  commandId: string,
  executionPlan: BuildModeExecutionPlanStep[],
  agentRuntimes: BuildModeAgentRuntimeBinding[],
):
  | {
      runtimeId: string;
      stepId: string;
      swarmRole: BuildModeAgentRuntimeBinding["ownerRole"];
    }
  | undefined => {
  const step = executionPlan.find((item) =>
    item.commandIds.includes(commandId),
  );
  if (!step) {
    return undefined;
  }
  const runtime = agentRuntimes.find((item) => item.id === step.runtimeId);
  if (!runtime) {
    return undefined;
  }
  return {
    runtimeId: runtime.id,
    stepId: step.id,
    swarmRole: runtime.ownerRole,
  };
};

export const getBuildModePromptExecutionContext = (
  payload: ValorTaskBridgePayload,
  promptProfileId: string = payload.selectedPromptProfileId,
): BuildModePromptExecutionContext => {
  const promptProfile =
    payload.promptProfiles.find((profile) => profile.id === promptProfileId) ??
    payload.promptProfiles.find(
      (profile) => profile.id === payload.selectedPromptProfileId,
    ) ??
    payload.promptProfiles[0];
  const promptBundle =
    payload.promptBundles.find(
      (bundle) => bundle.id === promptProfile?.promptBundleRef,
    ) ??
    payload.promptBundles.find(
      (bundle) => bundle.id === payload.selectedPromptBundleId,
    ) ??
    payload.promptBundles[0];

  return {
    promptProfileId:
      promptProfile?.id ?? promptProfileId ?? payload.selectedPromptProfileId,
    promptProfileName: promptProfile?.name ?? "Unknown Prompt Profile",
    promptBundleId:
      promptBundle?.id ??
      promptProfile?.promptBundleRef ??
      payload.selectedPromptBundleId,
    promptBundleVersion: promptBundle?.version ?? "unknown",
    promptBundlePolicy: promptBundle?.policy ?? "review-required",
    promptBundleReceiptIds: promptBundle?.receiptIds ?? [],
  };
};

const isScheduledAutomationRunAttemptReceipt = (
  receipt: BuildModeCommandReceipt,
): boolean =>
  Boolean(
    receipt.commandId.startsWith("cmd-automation-") &&
      receipt.artifacts?.some((artifact) =>
        ["failed", "skipped", "succeeded"].includes(
          String(artifact.metadata?.automationRunStatus ?? ""),
        ),
      ),
  );

const getLatestReceiptByCommandId = (
  receipts: BuildModeCommandReceipt[],
  options: { ignoreScheduledAutomationRunAttempts?: boolean } = {},
): Map<string, BuildModeCommandReceipt> => {
  const latestReceiptByCommandId = new Map<string, BuildModeCommandReceipt>();
  for (const receipt of receipts) {
    if (
      options.ignoreScheduledAutomationRunAttempts &&
      isScheduledAutomationRunAttemptReceipt(receipt)
    ) {
      continue;
    }
    const current = latestReceiptByCommandId.get(receipt.commandId);
    if (!current || compareReceiptCreatedAt(receipt, current) >= 0) {
      latestReceiptByCommandId.set(receipt.commandId, receipt);
    }
  }
  return latestReceiptByCommandId;
};

const compareReceiptCreatedAt = (
  left: BuildModeCommandReceipt,
  right: BuildModeCommandReceipt,
): number => getReceiptCreatedAtMs(left) - getReceiptCreatedAtMs(right);

const getReceiptCreatedAtMs = (receipt: BuildModeCommandReceipt): number => {
  const parsed = Date.parse(receipt.createdAt);
  return Number.isFinite(parsed) ? parsed : 0;
};

export interface NextBuildModeExecutionAction {
  command: BuildModeCommand;
  step: BuildModeExecutionPlanStep;
}

export interface BuildModeAutonomousQueuePlan {
  status: BuildModeAutonomyDecision["status"];
  summary: string;
  nextStepId?: string;
  nextCommandId?: string;
  dispatchableCommandIds: string[];
  approvalCommandIds: string[];
  blockedCommandIds: string[];
  blockingGateIds: string[];
  blockingReceiptIds: string[];
  commandSlotsRemaining: number;
  estimatedCreditsRemaining: number;
  requiredApprovalThreshold?: BuildModeApprovalThreshold;
  reasonCodes: string[];
  receiptRequired: boolean;
  updatedAt: string;
}

export const getNextBuildModeExecutionAction = (
  payload: ValorTaskBridgePayload,
): NextBuildModeExecutionAction | undefined => {
  const commandById = new Map(
    getBuildModeCommandCatalog(payload).map((command) => [command.id, command]),
  );
  const stepById = new Map(
    payload.executionPlan.map((step) => [step.id, step]),
  );

  for (const step of payload.executionPlan) {
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

export const deriveBuildModeAutonomyDecision = (
  payload: ValorTaskBridgePayload,
): BuildModeAutonomyDecision => {
  const nextExecutionAction = getNextBuildModeExecutionAction(payload);
  const currentConsecutiveCommands = getBuildModeCurrentConsecutiveCommandCount(
    payload.commandReceipts,
  );
  const latestCommandReceipts = Array.from(
    getLatestReceiptByCommandId(payload.commandReceipts).values(),
  );
  const failedReceipt = latestCommandReceipts.find((receipt) =>
    ["failed", "rejected"].includes(receipt.status),
  );
  const commandSlotsRemaining =
    payload.autonomyPolicy.maxConsecutiveCommands - currentConsecutiveCommands;
  const estimatedCreditsRemaining =
    payload.autonomyPolicy.maxEstimatedCredits -
    payload.creditEstimate.estimatedCredits;
  const nextCommand = nextExecutionAction?.command;
  const nextStep = nextExecutionAction?.step;
  const pendingApprovalReceipt = nextCommand
    ? latestCommandReceipts.find(
        (receipt) =>
          receipt.status === "approval-required" &&
          receipt.commandId === nextCommand.id,
      )
    : undefined;
  const blockingReceiptIds = [
    ...latestCommandReceipts
      .filter((receipt) => ["failed", "rejected"].includes(receipt.status))
      .map((receipt) => receipt.id),
    ...(pendingApprovalReceipt ? [pendingApprovalReceipt.id] : []),
  ];
  const blockingGateIds = nextStep
    ? nextStep.readinessGateIds.filter((gateId) => {
        const gate = payload.readinessGates.find((item) => item.id === gateId);
        return Boolean(
          gate &&
            gate.blocksRun &&
            gate.status !== "passed" &&
            (!nextCommand || !gate.commandIds.includes(nextCommand.id)),
        );
      })
    : [];
  const nextCapabilityId = nextCommand?.capabilityId;
  const secretPreflight = nextCommand
    ? evaluateSecretPreflight(nextCommand)
    : undefined;
  const commandPolicyPreflight = nextCommand
    ? evaluateCommandPolicyPreflight(nextCommand, payload.commandPolicyRules)
    : undefined;
  const fileSafetyPreflight = nextCommand
    ? evaluateFileSafetyPreflight(nextCommand, payload)
    : undefined;
  const receiptProofPreflight =
    payload.autonomyPolicy.receiptRequired && nextStep
      ? evaluateDependencyReceiptProofPreflight(
          nextStep,
          payload.executionPlan,
          payload.commandReceipts,
        )
      : undefined;
  const contextPackPreflight = nextExecutionAction
    ? evaluateGrayMatterContextPackPreflight(payload.grayMatterContextPack)
    : undefined;
  const nextCapabilityAllowed = Boolean(
    !nextCapabilityId ||
      payload.autonomyPolicy.allowedCapabilityIds.length === 0 ||
      payload.autonomyPolicy.allowedCapabilityIds.includes(nextCapabilityId),
  );
  const deniedToolPermission = nextCapabilityId
    ? payload.toolPermissions.find(
        (permission) =>
          permission.capabilityId === nextCapabilityId &&
          permission.decision === "deny",
      )
    : undefined;
  const approvalRequiredToolPermission = nextCapabilityId
    ? payload.toolPermissions.find(
        (permission) =>
          permission.capabilityId === nextCapabilityId &&
          permission.decision === "approval-required",
      )
    : undefined;
  const nextCommandKindRequiresApproval = Boolean(
    nextCommand &&
      (nextCommand.kind === "edit" || nextCommand.kind === "deploy"),
  );
  const nextRequiresApproval = Boolean(
    nextCommand &&
      (nextCommand.requiresApproval ||
        nextCommand.status === "approval-required" ||
        nextCommandKindRequiresApproval ||
        approvalRequiredToolPermission ||
        payload.autonomyPolicy.approvalRequiredCapabilityIds.includes(
          nextCommand.capabilityId,
        )),
  );
  const requiredApprovalThreshold = nextCapabilityId
    ? getRequiredApprovalThreshold(payload, nextCapabilityId)
    : undefined;

  let status: BuildModeAutonomyDecision["status"] = "continue";
  let summary = "Autonomy can continue with the next runbook command.";
  const reasonCodes = [
    `mode:${payload.autonomyPolicy.mode}`,
    `slots-remaining:${commandSlotsRemaining}`,
    `estimated-credits-remaining:${estimatedCreditsRemaining}`,
  ];

  if (payload.autonomyPolicy.mode === "disabled") {
    status = "disabled";
    summary = `Autonomy is disabled by ${payload.autonomyPolicy.label}.`;
    reasonCodes.push("autonomy-disabled");
  } else if (contextPackPreflight) {
    status = "blocked";
    summary = contextPackPreflight.reason;
    reasonCodes.push(contextPackPreflight.reasonCode);
  } else if (failedReceipt) {
    status = "blocked";
    summary = `Autonomy is blocked by ${failedReceipt.commandId} (${failedReceipt.status}).`;
    reasonCodes.push(`blocked-receipt:${failedReceipt.commandId}`);
  } else if (commandSlotsRemaining <= 0) {
    status = "blocked";
    summary = "Autonomy is blocked by the consecutive command cap.";
    reasonCodes.push("command-cap-reached");
  } else if (estimatedCreditsRemaining < 0) {
    status = "blocked";
    summary = "Autonomy is blocked by the estimated credit cap.";
    reasonCodes.push("credit-cap-exceeded");
  } else if (!nextExecutionAction) {
    status = "complete";
    summary = "No runnable Build Mode execution step remains.";
    reasonCodes.push("runbook-complete");
  } else if (secretPreflight) {
    status = "blocked";
    summary = secretPreflight.reason;
    reasonCodes.push(secretPreflight.reasonCode);
  } else if (commandPolicyPreflight?.decision === "reject") {
    status = "blocked";
    summary = commandPolicyPreflight.reason;
    reasonCodes.push(commandPolicyPreflight.reasonCode);
  } else if (fileSafetyPreflight) {
    status = "blocked";
    summary = fileSafetyPreflight.reason;
    reasonCodes.push(fileSafetyPreflight.reasonCode);
  } else if (receiptProofPreflight) {
    status = "blocked";
    summary = receiptProofPreflight.reason;
    reasonCodes.push(...receiptProofPreflight.reasonCodes);
    blockingReceiptIds.push(...receiptProofPreflight.receiptIds);
  } else if (!nextCapabilityAllowed && nextCapabilityId) {
    status = "blocked";
    summary = `Autonomy is blocked because ${nextCapabilityId} is outside the allow list.`;
    reasonCodes.push(`capability-not-allowed:${nextCapabilityId}`);
  } else if (deniedToolPermission) {
    status = "blocked";
    summary =
      deniedToolPermission.reason ||
      `Autonomy is blocked because ${deniedToolPermission.capabilityId} is denied.`;
    reasonCodes.push(`tool-denied:${deniedToolPermission.capabilityId}`);
  } else if (blockingGateIds.length) {
    status = "blocked";
    summary = `Autonomy is blocked by readiness gates: ${blockingGateIds.join(", ")}.`;
    reasonCodes.push(...blockingGateIds.map((id) => `blocking-gate:${id}`));
  } else if (
    payload.autonomyPolicy.mode === "manual" ||
    pendingApprovalReceipt ||
    commandPolicyPreflight?.decision === "approval-required" ||
    nextRequiresApproval
  ) {
    status = "approval-required";
    summary = nextCommand
      ? `Operator approval is required before running ${nextCommand.label}.`
      : "Operator approval is required before autonomy can continue.";
    if (payload.autonomyPolicy.mode === "manual") {
      reasonCodes.push("manual-mode");
    }
    if (pendingApprovalReceipt) {
      reasonCodes.push(`pending-approval:${pendingApprovalReceipt.commandId}`);
    }
    if (commandPolicyPreflight?.decision === "approval-required") {
      reasonCodes.push(commandPolicyPreflight.reasonCode);
    }
    if (approvalRequiredToolPermission) {
      reasonCodes.push(
        `tool-approval-required:${approvalRequiredToolPermission.capabilityId}`,
      );
    }
    if (nextCommandKindRequiresApproval && nextCommand) {
      reasonCodes.push(`command-kind-approval:${nextCommand.kind}`);
    }
    if (nextCommand) {
      reasonCodes.push(`next-command:${nextCommand.id}`);
    }
  } else if (nextCommand) {
    reasonCodes.push(`next-command:${nextCommand.id}`);
  }

  return {
    status,
    summary,
    nextStepId: nextStep?.id,
    nextCommandId: nextCommand?.id,
    capabilityId: nextCapabilityId,
    requiredApprovalThreshold:
      status === "approval-required" ? requiredApprovalThreshold : undefined,
    commandSlotsRemaining,
    estimatedCreditsRemaining,
    blockingGateIds,
    blockingReceiptIds,
    reasonCodes,
    escalationRefs: payload.autonomyPolicy.escalationRefs,
    updatedAt: getLatestAutonomyDecisionTimestamp(payload),
  };
};

export const deriveBuildModeAutonomousQueuePlan = (
  payload: ValorTaskBridgePayload,
): BuildModeAutonomousQueuePlan => {
  const decision = deriveBuildModeAutonomyDecision(payload);
  const nextExecutionAction = getNextBuildModeExecutionAction(payload);
  const nextCommandId = nextExecutionAction?.command.id;
  return {
    status: decision.status,
    summary: decision.summary,
    nextStepId: decision.nextStepId,
    nextCommandId: decision.nextCommandId,
    dispatchableCommandIds:
      decision.status === "continue" && nextCommandId ? [nextCommandId] : [],
    approvalCommandIds:
      decision.status === "approval-required" && nextCommandId
        ? [nextCommandId]
        : [],
    blockedCommandIds:
      decision.status === "blocked" && nextCommandId ? [nextCommandId] : [],
    blockingGateIds: decision.blockingGateIds,
    blockingReceiptIds: decision.blockingReceiptIds,
    commandSlotsRemaining: decision.commandSlotsRemaining,
    estimatedCreditsRemaining: decision.estimatedCreditsRemaining,
    requiredApprovalThreshold: decision.requiredApprovalThreshold,
    reasonCodes: decision.reasonCodes,
    receiptRequired: payload.autonomyPolicy.receiptRequired,
    updatedAt: decision.updatedAt,
  };
};

export const getBuildModeCurrentConsecutiveCommandCount = (
  receipts: BuildModeCommandReceipt[],
): number => {
  const sortedReceipts = [...receipts].sort((left, right) =>
    compareReceiptCreatedAt(right, left),
  );
  let count = 0;
  for (const receipt of sortedReceipts) {
    if (isScheduledAutomationRunAttemptReceipt(receipt)) {
      continue;
    }
    if (["failed", "rejected", "approval-required"].includes(receipt.status)) {
      break;
    }
    count += 1;
  }
  return count;
};

interface DependencyReceiptProofPreflightResult {
  reason: string;
  reasonCodes: string[];
  receiptIds: string[];
}

const evaluateDependencyReceiptProofPreflight = (
  step: BuildModeExecutionPlanStep,
  executionPlan: BuildModeExecutionPlanStep[],
  commandReceipts: BuildModeCommandReceipt[],
): DependencyReceiptProofPreflightResult | undefined => {
  const dependencySteps = collectDependencySteps(step, executionPlan);
  const dependencyCommandIds = new Set(
    dependencySteps.flatMap((dependency) => dependency.commandIds),
  );
  if (!dependencyCommandIds.size) {
    return undefined;
  }

  const latestReceiptByCommandId = getLatestReceiptByCommandId(commandReceipts);
  const stepByCommandId = new Map<string, BuildModeExecutionPlanStep>();
  for (const dependency of dependencySteps) {
    for (const commandId of dependency.commandIds) {
      stepByCommandId.set(commandId, dependency);
    }
  }

  for (const commandId of dependencyCommandIds) {
    const dependencyStep = stepByCommandId.get(commandId);
    const receipt = latestReceiptByCommandId.get(commandId);
    if (dependencyStep && !dependencyStep.receiptIds.length) {
      return {
        reason: `Autonomy is blocked because receipt proof is missing for dependency step ${dependencyStep.id}.`,
        reasonCodes: [`dependency-step-receipt-missing:${dependencyStep.id}`],
        receiptIds: [],
      };
    }
    if (!receipt) {
      continue;
    }
    if (receipt.status !== "succeeded") {
      return {
        reason: `Autonomy is blocked because dependency command ${commandId} latest receipt is ${receipt.status}.`,
        reasonCodes: [`dependency-receipt-not-succeeded:${commandId}`],
        receiptIds: [receipt.id],
      };
    }
    if (dependencyStep && !dependencyStep.receiptIds.includes(receipt.id)) {
      return {
        reason: `Autonomy is blocked because dependency step ${dependencyStep.id} does not include latest receipt ${receipt.id}.`,
        reasonCodes: [`dependency-step-receipt-mismatch:${dependencyStep.id}`],
        receiptIds: [receipt.id],
      };
    }
  }

  return undefined;
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

interface GrayMatterContextPackPreflightResult {
  reason: string;
  reasonCode: string;
}

const evaluateGrayMatterContextPackPreflight = (
  contextPack: GrayMatterContextPack,
): GrayMatterContextPackPreflightResult | undefined => {
  if (!contextPack.retrievalReceiptIds.length) {
    return {
      reason:
        "Autonomy is blocked because GrayMatter context has no retrieval receipts.",
      reasonCode: "graymatter-context-no-retrieval-receipts",
    };
  }
  if (contextPack.invariantPreflightStatus !== "passed") {
    return {
      reason: `Autonomy is blocked because GrayMatter invariant preflight is ${contextPack.invariantPreflightStatus}.`,
      reasonCode: `graymatter-invariant-preflight:${contextPack.invariantPreflightStatus}`,
    };
  }
  if (contextPack.retrievalStatus !== "ready") {
    return {
      reason: `Autonomy is blocked because GrayMatter retrieval status is ${contextPack.retrievalStatus}.`,
      reasonCode: `graymatter-retrieval:${contextPack.retrievalStatus}`,
    };
  }
  if (
    contextPack.policy === "do-not-answer" ||
    contextPack.answerPolicy === "do-not-answer"
  ) {
    return {
      reason:
        "Autonomy is blocked because GrayMatter answer policy forbids confident execution.",
      reasonCode: "graymatter-answer-policy:do-not-answer",
    };
  }
  if (
    contextPack.policy === "requires-review" ||
    contextPack.answerPolicy === "requires-review" ||
    contextPack.answerPolicy === "retry" ||
    contextPack.answerPolicy === "clarify"
  ) {
    return {
      reason: `Autonomy is blocked because GrayMatter answer policy requires review: ${contextPack.answerPolicy}.`,
      reasonCode: `graymatter-answer-policy:${contextPack.answerPolicy}`,
    };
  }
  return undefined;
};

interface SecretPreflightResult {
  reason: string;
  reasonCode: string;
}

const SECRET_ASSIGNMENT =
  /\b([A-Z0-9_]*(?:API_?KEY|TOKEN|SECRET|PASSWORD|PRIVATE_?KEY|ACCESS_?KEY)[A-Z0-9_]*)\s*=\s*("[^"]+"|'[^']+'|[^\s]+)/gi;

const SECRET_VALUE_PATTERNS = [
  /\bsk-[A-Za-z0-9_-]{16,}\b/g,
  /\bgh[pousr]_[A-Za-z0-9_]{16,}\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g,
];

const SECRET_REDACTION = "<redacted-secret>";

const SECRET_KEY_VALUE =
  /\b((?:api[_-]?key|token|secret|password|private[_-]?key|access[_-]?key|access[_-]?token)\s*[:=]\s*)("[^"]+"|'[^']+'|[^\s,;]+)/gi;

const SECRET_QUERY_PARAM =
  /([?&](?:api[_-]?key|token|secret|password|access[_-]?key|access[_-]?token)=)([^&#\s]+)/gi;

const AUTHORIZATION_BEARER =
  /\b(Authorization\s*:\s*Bearer\s+)[A-Za-z0-9._~+/-]{8,}=*/gi;

const redactBuildModeText = (value: string): string =>
  SECRET_VALUE_PATTERNS.reduce((text, pattern) => {
    pattern.lastIndex = 0;
    return text.replace(pattern, SECRET_REDACTION);
  }, value)
    .replace(SECRET_ASSIGNMENT, `$1=${SECRET_REDACTION}`)
    .replace(SECRET_KEY_VALUE, `$1${SECRET_REDACTION}`)
    .replace(SECRET_QUERY_PARAM, `$1${SECRET_REDACTION}`)
    .replace(AUTHORIZATION_BEARER, `$1${SECRET_REDACTION}`);

const sanitizeEvidenceArtifact = (
  artifact: BuildModeEvidenceArtifact,
): BuildModeEvidenceArtifact => ({
  ...artifact,
  title: redactBuildModeText(artifact.title),
  uri: redactBuildModeText(artifact.uri),
  summary: artifact.summary
    ? redactBuildModeText(artifact.summary)
    : artifact.summary,
  metadata: artifact.metadata
    ? Object.fromEntries(
        Object.entries(artifact.metadata).map(([key, value]) => [
          key,
          typeof value === "string" ? redactBuildModeText(value) : value,
        ]),
      )
    : artifact.metadata,
});

const sanitizeBuildModeCommandReceipt = (
  receipt: BuildModeCommandReceipt,
): BuildModeCommandReceipt => ({
  ...receipt,
  summary: redactBuildModeText(receipt.summary),
  operatorActionSummary: receipt.operatorActionSummary
    ? redactBuildModeText(receipt.operatorActionSummary)
    : receipt.operatorActionSummary,
  policyReasons: receipt.policyReasons?.map(redactBuildModeText),
  approval: receipt.approval
    ? {
        ...receipt.approval,
        reason: redactBuildModeText(receipt.approval.reason),
      }
    : receipt.approval,
  artifacts: receipt.artifacts?.map(sanitizeEvidenceArtifact),
  creditUsageReceipt: receipt.creditUsageReceipt
    ? {
        ...receipt.creditUsageReceipt,
        billingSummary: receipt.creditUsageReceipt.billingSummary
          ? redactBuildModeText(receipt.creditUsageReceipt.billingSummary)
          : receipt.creditUsageReceipt.billingSummary,
      }
    : receipt.creditUsageReceipt,
});

const sanitizeScheduledAutomationBinding = (
  automation: ScheduledAutomationBinding,
): ScheduledAutomationBinding => ({
  ...automation,
  label: redactBuildModeText(automation.label),
  schedule: redactBuildModeText(automation.schedule),
  workflowRef: redactBuildModeText(automation.workflowRef),
  commandRef: automation.commandRef
    ? redactBuildModeText(automation.commandRef)
    : automation.commandRef,
  valkyraiScheduleUri: automation.valkyraiScheduleUri
    ? redactBuildModeText(automation.valkyraiScheduleUri)
    : automation.valkyraiScheduleUri,
  valkyraiWorkflowId: automation.valkyraiWorkflowId
    ? redactBuildModeText(automation.valkyraiWorkflowId)
    : automation.valkyraiWorkflowId,
  runHistory: automation.runHistory?.map((run) => ({
    ...run,
    error: run.error ? redactBuildModeText(run.error) : run.error,
  })),
});

const evaluateSecretPreflight = (
  command: BuildModeCommand,
): SecretPreflightResult | undefined => {
  SECRET_ASSIGNMENT.lastIndex = 0;
  let match = SECRET_ASSIGNMENT.exec(command.command);
  while (match) {
    const value = match[2] ?? "";
    if (!isSecretVariableReference(value)) {
      return {
        reason:
          "Autonomy is blocked because the next command includes inline secret material.",
        reasonCode: "secret-inline-literal",
      };
    }
    match = SECRET_ASSIGNMENT.exec(command.command);
  }

  if (
    SECRET_VALUE_PATTERNS.some((pattern) => {
      pattern.lastIndex = 0;
      return pattern.test(command.command);
    })
  ) {
    return {
      reason:
        "Autonomy is blocked because the next command matches a known secret token pattern.",
      reasonCode: "secret-known-token",
    };
  }

  return undefined;
};

const isSecretVariableReference = (value: string): boolean => {
  const unquoted = value.replace(/^['"]|['"]$/g, "");
  return unquoted.startsWith("$") || unquoted.startsWith("${");
};

interface CommandPolicyPreflightResult {
  decision: "allow" | "approval-required" | "reject";
  reason: string;
  reasonCode: string;
}

const evaluateCommandPolicyPreflight = (
  command: BuildModeCommand,
  rules: BuildModeCommandPolicyRule[],
): CommandPolicyPreflightResult => {
  const activeRules = rules.filter(
    (rule) =>
      rule.enabled &&
      (!rule.commandKinds?.length || rule.commandKinds.includes(command.kind)),
  );
  const allowRules = activeRules.filter((rule) => rule.effect === "allow");
  let allowMatched = allowRules.length === 0;
  let approvalRequired: CommandPolicyPreflightResult | undefined;

  for (const rule of activeRules) {
    let pattern: RegExp;
    try {
      pattern = new RegExp(rule.pattern, "i");
    } catch {
      return {
        decision: "reject",
        reason: `Command policy rule is invalid: ${rule.label}.`,
        reasonCode: `command-policy-invalid:${rule.id}`,
      };
    }

    if (!pattern.test(command.command)) {
      continue;
    }

    if (rule.effect === "allow") {
      allowMatched = true;
      continue;
    }

    if (rule.effect === "deny") {
      return {
        decision: "reject",
        reason: rule.reason || `Command matched policy rule: ${rule.label}.`,
        reasonCode: `command-policy-deny:${rule.id}`,
      };
    }

    approvalRequired = {
      decision: "approval-required",
      reason: rule.reason || `Command matched policy rule: ${rule.label}.`,
      reasonCode: `command-policy-approval:${rule.id}`,
    };
  }

  if (!allowMatched) {
    return {
      decision: "reject",
      reason: "Command is not covered by the active allow policy.",
      reasonCode: "command-policy-not-allowed",
    };
  }

  return (
    approvalRequired ?? {
      decision: "allow",
      reason: "Command policy allows the next command.",
      reasonCode: "command-policy-allow",
    }
  );
};

interface FileSafetyPreflightResult {
  reason: string;
  reasonCode: string;
}

const evaluateFileSafetyPreflight = (
  command: BuildModeCommand,
  payload: ValorTaskBridgePayload,
): FileSafetyPreflightResult | undefined => {
  const protectedPath = getBlockedProtectedPath(command, payload);
  if (protectedPath) {
    return {
      reason: `Generated artifact is protected from direct edits: ${protectedPath}.`,
      reasonCode: `protected-path:${protectedPath}`,
    };
  }

  const ignoredPath = getBlockedIgnoredPath(command, payload);
  if (ignoredPath) {
    return {
      reason: `Target path is blocked by ${ignoredPath.pattern}: ${ignoredPath.path}.`,
      reasonCode: `ignored-path:${ignoredPath.path}`,
    };
  }

  return undefined;
};

const getBlockedProtectedPath = (
  command: BuildModeCommand,
  payload: ValorTaskBridgePayload,
): string | undefined => {
  const protectedPaths = Array.from(
    new Set([
      ...(command.protectedPaths ?? []),
      ...payload.appBundle.artifacts
        .filter((artifact) => artifact.kind === "generated")
        .map((artifact) => artifact.path),
    ]),
  )
    .map(normalizePathForPolicy)
    .filter(Boolean);
  const targetPaths = (command.targetPaths ?? [])
    .map(normalizePathForPolicy)
    .filter(Boolean);
  const commandText = normalizePathForPolicy(command.command);

  return protectedPaths.find(
    (protectedPath) =>
      targetPaths.some((targetPath) =>
        pathMatchesProtectedPath(targetPath, protectedPath),
      ) || commandText.includes(protectedPath),
  );
};

const getBlockedIgnoredPath = (
  command: BuildModeCommand,
  payload: ValorTaskBridgePayload,
): { path: string; pattern: string } | undefined => {
  const patterns = payload.scope.ignoredPathPatterns ?? [];
  const targetPaths = (command.targetPaths ?? [])
    .map(normalizePathForPolicy)
    .filter(Boolean);

  for (const targetPath of targetPaths) {
    const pattern = patterns.find((item) =>
      ignoredPathPatternMatches(targetPath, item),
    );
    if (pattern) {
      return {
        path: targetPath,
        pattern: formatIgnoredPathPattern(pattern),
      };
    }
  }

  return undefined;
};

const normalizePathForPolicy = (value: string): string =>
  value.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/+/g, "/");

const pathMatchesProtectedPath = (
  targetPath: string,
  protectedPath: string,
): boolean =>
  targetPath === protectedPath ||
  targetPath.endsWith(`/${protectedPath}`) ||
  protectedPath.endsWith(`/${targetPath}`);

const ignoredPathPatternMatches = (
  targetPath: string,
  pattern: string,
): boolean => {
  const normalizedPattern = normalizePathForPolicy(pattern).replace(
    /^\*\*\//,
    "",
  );
  if (!normalizedPattern) {
    return false;
  }
  if (normalizedPattern.endsWith("/**")) {
    const prefix = normalizedPattern.slice(0, -3);
    return targetPath === prefix || targetPath.startsWith(`${prefix}/`);
  }
  if (normalizedPattern.endsWith("/")) {
    return (
      targetPath.startsWith(normalizedPattern) ||
      targetPath.includes(`/${normalizedPattern}`)
    );
  }
  return (
    targetPath === normalizedPattern ||
    targetPath.endsWith(`/${normalizedPattern}`) ||
    targetPath.includes(normalizedPattern)
  );
};

const formatIgnoredPathPattern = (pattern: string): string => {
  const normalizedPattern = normalizePathForPolicy(pattern).replace(
    /^\*\*\//,
    "",
  );
  if (normalizedPattern.endsWith("/")) {
    return `**/${normalizedPattern}**`;
  }
  return pattern;
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

export const mergeBuildModeCommandReceipt = (
  payload: ValorTaskBridgePayload,
  receipt: BuildModeCommandReceipt,
): ValorTaskBridgePayload => {
  const sanitizedReceipt = sanitizeBuildModeCommandReceipt(receipt);
  const commandReceipts = [
    ...payload.commandReceipts.filter(
      (item) => item.id !== sanitizedReceipt.id,
    ),
    sanitizedReceipt,
  ];
  const commands = payload.commands.map((command) =>
    command.id === sanitizedReceipt.commandId
      ? {
          ...command,
          receiptId: sanitizedReceipt.id,
          status: sanitizedReceipt.status,
        }
      : command,
  );
  const browserVerification = deriveBrowserVerification(
    payload.browserVerification,
    sanitizedReceipt,
  );
  const checkpoints = deriveCheckpoints(payload.checkpoints, sanitizedReceipt);
  const safeEditPlans = deriveSafeEditPlans(
    payload.safeEditPlans,
    sanitizedReceipt,
  );
  const evidenceArtifacts = mergeEvidenceArtifacts(
    payload.evidenceArtifacts,
    sanitizedReceipt,
  );
  const scheduledAutomations = deriveScheduledAutomations(
    payload.scheduledAutomations,
    sanitizedReceipt,
  );
  const creditUsageReceipts = mergeCreditUsageReceipt(
    payload.creditUsageReceipts,
    sanitizedReceipt,
  );
  const commandReadinessGates = deriveReadinessGates(
    payload.readinessGates,
    commandReceipts,
    sanitizedReceipt,
  );
  const readinessGates = deriveFinalReportReadinessGate(
    commandReadinessGates,
    commandReceipts,
    browserVerification,
    evidenceArtifacts,
  );
  const executionPlan = deriveExecutionPlan(
    payload.executionPlan,
    commandReceipts,
    readinessGates,
    sanitizedReceipt,
  );
  const partialPayload = {
    ...payload,
    commandReceipts,
    commands,
    checkpoints,
    safeEditPlans,
    evidenceArtifacts,
    scheduledAutomations,
    creditUsageReceipts,
    readinessGates,
    executionPlan,
  };
  const autonomyDecision = deriveBuildModeAutonomyDecision(partialPayload);

  return {
    ...payload,
    commandReceipts,
    commands,
    checkpoints,
    safeEditPlans,
    evidenceArtifacts,
    creditUsageReceipts,
    readinessGates,
    executionPlan,
    autonomyDecision,
    scheduledAutomations,
    agentLoop: deriveAgentLoop(payload.agentLoop, commands, sanitizedReceipt),
    browserVerification,
    finalReport: deriveFinalReport(
      payload,
      commands,
      commandReceipts,
      browserVerification,
      checkpoints,
      evidenceArtifacts,
      creditUsageReceipts,
      autonomyDecision,
      readinessGates,
      executionPlan,
      scheduledAutomations,
      sanitizedReceipt,
    ),
  };
};

export const mergeBuildModeAutomationSnapshot = (
  payload: ValorTaskBridgePayload,
  snapshot: BuildModeAutomationSnapshot,
): ValorTaskBridgePayload => {
  const scheduledAutomations = mergeScheduledAutomationSnapshot(
    payload.scheduledAutomations,
    snapshot,
  );

  return {
    ...payload,
    scheduledAutomations,
    finalReport: deriveAutomationSnapshotFinalReport(
      payload.finalReport,
      scheduledAutomations,
      snapshot,
    ),
  };
};

const getRequiredApprovalThreshold = (
  payload: ValorTaskBridgePayload,
  capabilityId: string,
): BuildModeApprovalThreshold => {
  const permission = payload.toolPermissions.find(
    (item) => item.capabilityId === capabilityId,
  );
  if (
    permission?.approvalThreshold &&
    permission.approvalThreshold !== "none"
  ) {
    return permission.approvalThreshold;
  }
  return "operator";
};

const getLatestAutonomyDecisionTimestamp = (
  payload: ValorTaskBridgePayload,
): string => {
  const commandReceiptTimes = payload.commandReceipts.map(
    (receipt) => receipt.createdAt,
  );
  const creditReceiptTimes = payload.creditUsageReceipts.map(
    (receipt) => receipt.createdAt,
  );
  const timestamps = [
    ...commandReceiptTimes,
    ...creditReceiptTimes,
    payload.appBundle.createdAt,
  ].sort();
  return timestamps[timestamps.length - 1] ?? payload.appBundle.createdAt;
};

const mergeCreditUsageReceipt = (
  creditUsageReceipts: ValorTaskBridgePayload["creditUsageReceipts"],
  receipt: BuildModeCommandReceipt,
): ValorTaskBridgePayload["creditUsageReceipts"] => {
  if (!receipt.creditUsageReceipt) {
    return creditUsageReceipts;
  }
  return [
    ...creditUsageReceipts.filter(
      (item) => item.id !== receipt.creditUsageReceipt!.id,
    ),
    receipt.creditUsageReceipt,
  ];
};

const deriveExecutionPlan = (
  plan: BuildModeExecutionPlanStep[],
  commandReceipts: BuildModeCommandReceipt[],
  readinessGates: BuildModeReadinessGate[],
  receipt: BuildModeCommandReceipt,
): BuildModeExecutionPlanStep[] => {
  const latestReceiptByCommandId = getLatestReceiptByCommandId(commandReceipts);

  return plan.map((step) => {
    if (!step.commandIds.includes(receipt.commandId)) {
      return step;
    }

    const receiptIds = Array.from(new Set([...step.receiptIds, receipt.id]));
    const commandStatuses = step.commandIds
      .map((commandId) => latestReceiptByCommandId.get(commandId))
      .filter(Boolean)
      .map((item) => item!.status);
    const gateStatuses = step.readinessGateIds
      .map((gateId) => readinessGates.find((gate) => gate.id === gateId))
      .filter(Boolean)
      .map((gate) => gate!.status);

    return {
      ...step,
      receiptIds,
      status: toExecutionPlanStepStatus(
        commandStatuses,
        gateStatuses,
        step.commandIds.length,
      ),
    };
  });
};

const toExecutionPlanStepStatus = (
  commandStatuses: BuildModeCommandReceipt["status"][],
  gateStatuses: BuildModeReadinessGate["status"][],
  expectedCommandCount: number,
): BuildModeExecutionPlanStep["status"] => {
  if (
    commandStatuses.some(
      (status) => status === "failed" || status === "rejected",
    ) ||
    gateStatuses.some((status) => status === "failed")
  ) {
    return "failed";
  }
  if (
    commandStatuses.some((status) => status === "approval-required") ||
    gateStatuses.some((status) => status === "blocked")
  ) {
    return "approval-required";
  }
  if (commandStatuses.some((status) => status === "running")) {
    return "running";
  }
  if (
    expectedCommandCount > 0 &&
    commandStatuses.length < expectedCommandCount &&
    commandStatuses.some((status) => status === "succeeded")
  ) {
    return "running";
  }
  if (
    commandStatuses.length > 0 &&
    commandStatuses.every((status) => status === "succeeded") &&
    gateStatuses.every((status) => status === "passed")
  ) {
    return "complete";
  }
  if (commandStatuses.some((status) => status === "queued")) {
    return "running";
  }
  return "ready";
};

const deriveReadinessGates = (
  gates: BuildModeReadinessGate[],
  commandReceipts: BuildModeCommandReceipt[],
  receipt: BuildModeCommandReceipt,
): BuildModeReadinessGate[] => {
  const latestReceiptByCommandId = getLatestReceiptByCommandId(commandReceipts);

  return gates.map((gate) => {
    if (!gate.commandIds.includes(receipt.commandId)) {
      return gate;
    }

    const receiptIds = Array.from(
      new Set([...gate.requiredReceiptIds, receipt.id]),
    );
    const evidenceArtifactIds = Array.from(
      new Set([
        ...gate.evidenceArtifactIds,
        ...(receipt.artifacts ?? []).map((artifact) => artifact.id),
      ]),
    );
    const commandStatuses = gate.commandIds
      .map((commandId) => latestReceiptByCommandId.get(commandId))
      .filter(Boolean)
      .map((item) => item!.status);

    return {
      ...gate,
      requiredReceiptIds: receiptIds,
      evidenceArtifactIds,
      status: toReadinessGateStatus(commandStatuses, gate.commandIds.length),
    };
  });
};

const toReadinessGateStatus = (
  statuses: BuildModeCommandReceipt["status"][],
  expectedCommandCount: number,
): BuildModeReadinessGate["status"] => {
  if (!statuses.length) {
    return "pending";
  }
  if (statuses.some((status) => status === "failed" || status === "rejected")) {
    return "failed";
  }
  if (statuses.some((status) => status === "approval-required")) {
    return "blocked";
  }
  if (
    expectedCommandCount > 0 &&
    statuses.length >= expectedCommandCount &&
    statuses.every((status) => status === "succeeded")
  ) {
    return "passed";
  }
  return "pending";
};

const deriveFinalReportReadinessGate = (
  gates: BuildModeReadinessGate[],
  commandReceipts: BuildModeCommandReceipt[],
  browserVerification: BrowserVerificationStatus,
  evidenceArtifacts: BuildModeEvidenceArtifact[],
): BuildModeReadinessGate[] => {
  const latestReceipts = Array.from(
    getLatestReceiptByCommandId(commandReceipts, {
      ignoreScheduledAutomationRunAttempts: true,
    }).values(),
  );
  const hasFailedCommand = latestReceipts.some(
    (receipt) => receipt.status === "failed" || receipt.status === "rejected",
  );
  const blockingGates = gates.filter(
    (gate) => gate.blocksRun && gate.id !== "gate-final-report-ready",
  );
  const finalReportArtifacts = evidenceArtifacts.filter(
    (artifact) => artifact.kind === "final_report",
  );
  const finalReportReceiptIds = finalReportArtifacts
    .map((artifact) => artifact.receiptId)
    .filter((receiptId): receiptId is string => Boolean(receiptId));
  const finalReportArtifactIds = finalReportArtifacts.map(
    (artifact) => artifact.id,
  );

  return gates.map((gate) => {
    if (gate.id !== "gate-final-report-ready") {
      return gate;
    }

    const blockingFailure =
      hasFailedCommand ||
      blockingGates.some((item) => item.status === "failed");
    const blockingIncomplete = blockingGates.some(
      (item) => item.status !== "passed",
    );
    const hasFinalReportProof = finalReportReceiptIds.length > 0;
    const browserPassed = browserVerification.status === "passed";
    const status: BuildModeReadinessGate["status"] = blockingFailure
      ? "failed"
      : blockingIncomplete || !browserPassed || !hasFinalReportProof
        ? "pending"
        : "passed";

    return {
      ...gate,
      evidenceArtifactIds: Array.from(
        new Set([...gate.evidenceArtifactIds, ...finalReportArtifactIds]),
      ),
      requiredReceiptIds: Array.from(
        new Set([...gate.requiredReceiptIds, ...finalReportReceiptIds]),
      ),
      status,
      summary:
        status === "passed"
          ? "Final report has a receipt and all blocking readiness gates passed."
          : gate.summary,
    };
  });
};

const mergeEvidenceArtifacts = (
  current: ValorTaskBridgePayload["evidenceArtifacts"],
  receipt: BuildModeCommandReceipt,
): ValorTaskBridgePayload["evidenceArtifacts"] => {
  const nextArtifacts = receipt.artifacts ?? [];
  if (!nextArtifacts.length) {
    return current;
  }
  const byId = new Map(current.map((artifact) => [artifact.id, artifact]));
  for (const artifact of nextArtifacts) {
    byId.set(artifact.id, artifact);
  }
  return Array.from(byId.values());
};

const deriveCheckpoints = (
  checkpoints: ValorTaskBridgePayload["checkpoints"],
  receipt: BuildModeCommandReceipt,
): ValorTaskBridgePayload["checkpoints"] =>
  checkpoints.map((checkpoint) => {
    if (
      receipt.commandId !== checkpoint.commandId &&
      receipt.commandId !== checkpoint.rollbackCommandId
    ) {
      return checkpoint;
    }

    return {
      ...checkpoint,
      hash: getCheckpointHashFromReceipt(receipt) ?? checkpoint.hash,
      receiptIds: Array.from(new Set([...checkpoint.receiptIds, receipt.id])),
      status: toCheckpointStatus(
        receipt.status,
        receipt.commandId === checkpoint.rollbackCommandId,
      ),
    };
  });

const toCheckpointStatus = (
  status: BuildModeCommandReceipt["status"],
  isRollback: boolean,
): ValorTaskBridgePayload["checkpoints"][number]["status"] => {
  switch (status) {
    case "succeeded":
      return isRollback ? "restored" : "created";
    case "queued":
    case "running":
      return isRollback ? "rollback-ready" : "planned";
    case "approval-required":
      return "rollback-ready";
    case "failed":
    case "rejected":
      return "failed";
    default:
      return "planned";
  }
};

const getCheckpointHashFromReceipt = (
  receipt: BuildModeCommandReceipt,
): string | undefined => {
  for (const artifact of receipt.artifacts ?? []) {
    const checkpointHash = artifact.metadata?.checkpointHash;
    if (typeof checkpointHash === "string" && checkpointHash.length > 0) {
      return checkpointHash;
    }
  }
  return undefined;
};

const deriveSafeEditPlans = (
  safeEditPlans: ValorTaskBridgePayload["safeEditPlans"],
  receipt: BuildModeCommandReceipt,
): ValorTaskBridgePayload["safeEditPlans"] =>
  safeEditPlans.map((plan) => {
    if (receipt.commandId !== plan.commandId) {
      return plan;
    }

    return {
      ...plan,
      receiptIds: Array.from(new Set([...plan.receiptIds, receipt.id])),
      status: toSafeEditStatus(receipt.status),
    };
  });

const toSafeEditStatus = (
  status: BuildModeCommandReceipt["status"],
): ValorTaskBridgePayload["safeEditPlans"][number]["status"] => {
  switch (status) {
    case "succeeded":
      return "applied";
    case "queued":
    case "running":
      return "queued";
    case "approval-required":
      return "approval-required";
    case "failed":
    case "rejected":
      return "blocked";
    default:
      return "draft";
  }
};

const deriveScheduledAutomations = (
  automations: ScheduledAutomationBinding[],
  receipt: BuildModeCommandReceipt,
): ScheduledAutomationBinding[] =>
  automations.map((automation) => {
    if (receipt.commandId !== `cmd-automation-${automation.id}`) {
      return automation;
    }

    const runStatus = getScheduledAutomationRunStatus(receipt);
    const runHistory = runStatus
      ? [
          {
            completedAt: receipt.createdAt,
            error: getScheduledAutomationRunError(receipt),
            receiptId: receipt.id,
            status: runStatus,
          },
          ...(automation.runHistory ?? []),
        ].slice(0, 20)
      : automation.runHistory;

    return sanitizeScheduledAutomationBinding({
      ...automation,
      lastRunAt: runStatus ? receipt.createdAt : automation.lastRunAt,
      lastRunReceiptId: runStatus ? receipt.id : automation.lastRunReceiptId,
      lastRunStatus: runStatus ?? automation.lastRunStatus,
      nextRunAt:
        getScheduledAutomationNextRunAt(receipt) ?? automation.nextRunAt,
      receiptIds: Array.from(new Set([...automation.receiptIds, receipt.id])),
      runHistory,
      status:
        getScheduledAutomationLifecycleStatus(receipt) ??
        (runStatus ? automation.status : undefined) ??
        toScheduledAutomationStatus(receipt.status),
    });
  });

const mergeScheduledAutomationSnapshot = (
  automations: ScheduledAutomationBinding[],
  snapshot: BuildModeAutomationSnapshot,
): ScheduledAutomationBinding[] => {
  const automationById = new Map(
    automations.map((automation) => [automation.id, automation]),
  );
  for (const record of snapshot.records) {
    const existing = automationById.get(record.id);
    automationById.set(
      record.id,
      sanitizeScheduledAutomationBinding({
        approvalRequired: existing?.approvalRequired ?? true,
        commandRef: existing?.commandRef ?? record.workflowCommandId,
        id: record.id,
        label: existing?.label ?? record.label,
        lastRunAt: record.lastRunAt ?? existing?.lastRunAt,
        lastRunReceiptId: record.lastRunReceiptId ?? existing?.lastRunReceiptId,
        lastRunStatus: record.lastRunStatus ?? existing?.lastRunStatus,
        nextRunAt: record.nextRunAt ?? existing?.nextRunAt,
        promptContext: record.promptContext ?? existing?.promptContext,
        providerRoute: record.providerRoute ?? existing?.providerRoute,
        receiptIds: Array.from(
          new Set([
            ...(existing?.receiptIds ?? []),
            ...(record.lastRunReceiptId ? [record.lastRunReceiptId] : []),
          ]),
        ),
        runHistory: record.runHistory ?? existing?.runHistory,
        schedule: record.schedule,
        scheduler: record.scheduler ?? existing?.scheduler,
        status: existing?.status === "blocked" ? "blocked" : record.status,
        valkyraiScheduleUri:
          record.valkyraiScheduleUri ?? existing?.valkyraiScheduleUri,
        valkyraiWorkflowId:
          record.valkyraiWorkflowId ?? existing?.valkyraiWorkflowId,
        workflowRef: record.workflowRef,
      }),
    );
  }
  return Array.from(automationById.values());
};

const getScheduledAutomationNextRunAt = (
  receipt: BuildModeCommandReceipt,
): string | undefined => {
  for (const artifact of receipt.artifacts ?? []) {
    const nextRunAt = artifact.metadata?.nextRunAt;
    if (typeof nextRunAt === "string" && nextRunAt.length > 0) {
      return nextRunAt;
    }
  }
  return undefined;
};

const getScheduledAutomationLifecycleStatus = (
  receipt: BuildModeCommandReceipt,
): ScheduledAutomationBinding["status"] | undefined => {
  for (const artifact of receipt.artifacts ?? []) {
    const automationStatus = artifact.metadata?.automationStatus;
    if (automationStatus === "paused" || automationStatus === "scheduled") {
      return automationStatus;
    }
  }
  return undefined;
};

const getScheduledAutomationRunStatus = (
  receipt: BuildModeCommandReceipt,
): ScheduledAutomationBinding["lastRunStatus"] | undefined => {
  for (const artifact of receipt.artifacts ?? []) {
    const automationRunStatus = artifact.metadata?.automationRunStatus;
    if (
      automationRunStatus === "failed" ||
      automationRunStatus === "skipped" ||
      automationRunStatus === "succeeded"
    ) {
      return automationRunStatus;
    }
  }
  return undefined;
};

const getScheduledAutomationRunError = (
  receipt: BuildModeCommandReceipt,
): string | undefined => {
  for (const artifact of receipt.artifacts ?? []) {
    const error = artifact.metadata?.error;
    if (typeof error === "string" && error.length > 0) {
      return error;
    }
  }
  return undefined;
};

const toScheduledAutomationStatus = (
  status: BuildModeCommandReceipt["status"],
): ScheduledAutomationBinding["status"] => {
  switch (status) {
    case "queued":
    case "running":
    case "succeeded":
      return "scheduled";
    case "approval-required":
    case "failed":
    case "rejected":
      return "blocked";
    default:
      return "draft";
  }
};

const deriveAgentLoop = (
  phases: BuildModeAgentLoopPhase[],
  commands: BuildModeCommand[],
  receipt: BuildModeCommandReceipt,
): BuildModeAgentLoopPhase[] => {
  const command = commands.find((item) => item.id === receipt.commandId);
  return phases.map((phase) => {
    const matchesReceipt =
      phase.receiptIds.includes(receipt.id) ||
      phase.capabilityIds.includes(receipt.capabilityId) ||
      Boolean(command && phase.capabilityIds.includes(command.capabilityId));

    if (!matchesReceipt) {
      return phase;
    }

    return {
      ...phase,
      receiptIds: Array.from(new Set([...phase.receiptIds, receipt.id])),
      status: toAgentLoopStatus(receipt.status),
    };
  });
};

const toAgentLoopStatus = (
  status: BuildModeCommandReceipt["status"],
): BuildModeAgentLoopPhase["status"] => {
  switch (status) {
    case "queued":
    case "running":
      return "running";
    case "succeeded":
      return "complete";
    case "approval-required":
    case "failed":
    case "rejected":
      return "blocked";
    default:
      return "ready";
  }
};

const deriveBrowserVerification = (
  current: BrowserVerificationStatus,
  receipt: BuildModeCommandReceipt,
): BrowserVerificationStatus => {
  if (receipt.capabilityId !== "browser.automation") {
    return current;
  }
  const artifactIds = Array.from(
    new Set([
      ...current.artifactIds,
      ...(receipt.artifacts ?? []).map((artifact) => artifact.id),
    ]),
  );

  if (receipt.status === "succeeded") {
    return {
      ...current,
      artifactIds,
      status: "passed",
      screenshotReceiptId: receipt.id,
    };
  }
  if (receipt.status === "failed" || receipt.status === "rejected") {
    return {
      ...current,
      artifactIds,
      status: "failed",
      screenshotReceiptId: receipt.id,
    };
  }
  if (receipt.status === "queued" || receipt.status === "running") {
    return { ...current, artifactIds, status: "running" };
  }
  return { ...current, artifactIds };
};

const deriveFinalReport = (
  payload: ValorTaskBridgePayload,
  commands: BuildModeCommand[],
  commandReceipts: BuildModeCommandReceipt[],
  browserVerification: BrowserVerificationStatus,
  checkpoints: ValorTaskBridgePayload["checkpoints"],
  evidenceArtifacts: ValorTaskBridgePayload["evidenceArtifacts"],
  creditUsageReceipts: ValorTaskBridgePayload["creditUsageReceipts"],
  autonomyDecision: BuildModeAutonomyDecision,
  readinessGates: ValorTaskBridgePayload["readinessGates"],
  executionPlan: ValorTaskBridgePayload["executionPlan"],
  scheduledAutomations: ValorTaskBridgePayload["scheduledAutomations"],
  receipt: BuildModeCommandReceipt,
): ValorTaskBridgePayload["finalReport"] => {
  const reportPayload = {
    ...payload,
    commandReceipts,
    commands,
    scheduledAutomations,
  };
  const commandCatalog = getBuildModeCommandCatalog(reportPayload);
  const command = commandCatalog.find((item) => item.id === receipt.commandId);
  const testsRun = deriveTestsRun(
    payload.finalReport.testsRun,
    command,
    receipt,
  );
  const filesChanged = deriveFilesChanged(
    payload.finalReport.filesChanged,
    command,
    receipt,
  );
  const gaps = deriveReportGaps(
    payload.finalReport.gaps,
    commandReceipts,
    readinessGates,
    scheduledAutomations,
  );

  return {
    ...payload.finalReport,
    status: isFinalReportReady(
      commandCatalog,
      browserVerification,
      readinessGates,
    )
      ? "ready"
      : "draft",
    filesChanged,
    testsRun,
    gaps,
    nextHandoff: [
      `Latest command receipt: ${receipt.id} (${receipt.status}).`,
      ...deriveOperatorActionHandoff(receipt),
      `Autonomy decision: ${autonomyDecision.status} - ${autonomyDecision.summary}`,
      ...deriveEvidenceHandoff(evidenceArtifacts, receipt),
      ...deriveAutomationRunHandoff(scheduledAutomations, receipt),
      ...deriveCreditUsageHandoff(creditUsageReceipts, receipt),
      ...deriveCheckpointHandoff(checkpoints),
      ...deriveExecutionPlanHandoff(executionPlan),
      ...payload.finalReport.nextHandoff.filter(
        (item) =>
          !item.startsWith("Latest command receipt:") &&
          !item.startsWith("Operator action:") &&
          !item.startsWith("Autonomy decision:") &&
          !item.startsWith("Automation ") &&
          !item.startsWith("Evidence artifacts:") &&
          !item.startsWith("Credit usage:") &&
          !item.startsWith("Checkpoint ") &&
          !item.startsWith("Next execution step:"),
      ),
    ],
  };
};

const isFinalReportReady = (
  commandCatalog: BuildModeCommand[],
  browserVerification: BrowserVerificationStatus,
  readinessGates: BuildModeReadinessGate[],
): boolean => {
  const finalReportGate = readinessGates.find(
    (gate) => gate.id === "gate-final-report-ready",
  );
  return (
    commandCatalog.length > 0 &&
    commandCatalog.every((item) => item.status === "succeeded") &&
    browserVerification.status === "passed" &&
    readinessGates
      .filter((gate) => gate.blocksRun)
      .every((gate) => gate.status === "passed") &&
    (!finalReportGate || finalReportGate.status === "passed")
  );
};

const deriveOperatorActionHandoff = (
  receipt: BuildModeCommandReceipt,
): string[] =>
  receipt.operatorActionSummary
    ? [
        `Operator action: ${receipt.nextOperatorAction ?? "inspect"} (${receipt.executionMode ?? "operator-handoff"}) - ${receipt.operatorActionSummary}`,
      ]
    : [];

const deriveCreditUsageHandoff = (
  creditUsageReceipts: ValorTaskBridgePayload["creditUsageReceipts"],
  receipt: BuildModeCommandReceipt,
): string[] => {
  const usage = receipt.creditUsageReceipt
    ? creditUsageReceipts.find(
        (item) => item.id === receipt.creditUsageReceipt!.id,
      )
    : undefined;
  return usage
    ? [
        `Credit usage: ${usage.actualCredits} actual (${usage.providerCredits} provider, ${usage.hostedInfrastructureCredits} hosted) for ${usage.commandId} via ${usage.providerRoute}.`,
        usage.billingSummary
          ? `Billing note: ${usage.billingSummary}`
          : undefined,
      ].filter((item): item is string => Boolean(item))
    : [];
};

const deriveExecutionPlanHandoff = (
  plan: BuildModeExecutionPlanStep[],
): string[] => {
  const nextStep = plan.find((step) =>
    ["ready", "approval-required", "pending", "blocked"].includes(step.status),
  );
  return nextStep
    ? [`Next execution step: ${nextStep.label} (${nextStep.status}).`]
    : [];
};

const deriveEvidenceHandoff = (
  evidenceArtifacts: ValorTaskBridgePayload["evidenceArtifacts"],
  receipt: BuildModeCommandReceipt,
): string[] => {
  const count = evidenceArtifacts.filter(
    (artifact) => artifact.receiptId === receipt.id,
  ).length;
  return count
    ? [`Evidence artifacts: ${count} captured for ${receipt.id}.`]
    : [];
};

const deriveAutomationRunHandoff = (
  automations: ScheduledAutomationBinding[],
  receipt: BuildModeCommandReceipt,
): string[] => {
  const automation = automations.find(
    (item) => receipt.commandId === `cmd-automation-${item.id}`,
  );
  if (
    !automation?.lastRunReceiptId ||
    automation.lastRunReceiptId !== receipt.id
  ) {
    return [];
  }
  return [
    `Automation ${automation.label}: last run ${automation.lastRunStatus ?? "unknown"} at ${automation.lastRunAt ?? receipt.createdAt}; next ${automation.nextRunAt ?? "not scheduled"}.`,
  ];
};

const deriveCheckpointHandoff = (
  checkpoints: ValorTaskBridgePayload["checkpoints"],
): string[] =>
  checkpoints.map(
    (checkpoint) => `Checkpoint ${checkpoint.label}: ${checkpoint.status}.`,
  );

const deriveAutomationSnapshotFinalReport = (
  current: ValorTaskBridgePayload["finalReport"],
  automations: ScheduledAutomationBinding[],
  snapshot: BuildModeAutomationSnapshot,
): ValorTaskBridgePayload["finalReport"] => {
  const snapshotRecordIds = new Set(
    snapshot.records.map((record) => record.id),
  );
  const snapshotAutomations = automations.filter((automation) =>
    snapshotRecordIds.has(automation.id),
  );
  const automationHandoff = [
    `Automation snapshot: ${snapshot.records.length} record${snapshot.records.length === 1 ? "" : "s"} refreshed at ${snapshot.refreshedAt} from ${snapshot.storageUri}.`,
    ...snapshotAutomations.map((automation) =>
      [
        `Automation ${automation.label}: ${automation.status}`,
        `schedule ${automation.schedule}`,
        `next ${automation.nextRunAt ?? "not scheduled"}`,
        automation.lastRunAt
          ? `last ${automation.lastRunStatus ?? "unknown"} at ${automation.lastRunAt}`
          : "last never",
        automation.lastRunReceiptId
          ? `receipt ${automation.lastRunReceiptId}`
          : undefined,
      ]
        .filter(Boolean)
        .join("; "),
    ),
  ];
  const automationGaps = snapshotAutomations
    .filter(
      (automation) =>
        automation.lastRunStatus === "failed" ||
        automation.lastRunStatus === "skipped" ||
        automation.status === "blocked",
    )
    .map((automation) => {
      if (automation.status === "blocked") {
        return `Automation ${automation.label} is blocked.`;
      }
      return `Automation ${automation.label} last run ${automation.lastRunStatus}.`;
    });

  return {
    ...current,
    gaps: Array.from(new Set([...automationGaps, ...current.gaps])),
    nextHandoff: [
      ...automationHandoff,
      ...current.nextHandoff.filter(
        (item) =>
          !item.startsWith("Automation snapshot:") &&
          !item.startsWith("Automation "),
      ),
    ],
  };
};

const deriveTestsRun = (
  current: string[],
  command: BuildModeCommand | undefined,
  receipt: BuildModeCommandReceipt,
): string[] => {
  if (command?.kind !== "test") {
    return current;
  }

  const nextLine = `${command.label}: ${receipt.status}`;
  return [
    nextLine,
    ...current.filter(
      (item) => item !== "pending" && !item.startsWith(`${command.label}:`),
    ),
  ];
};

const deriveFilesChanged = (
  current: string[],
  command: BuildModeCommand | undefined,
  receipt: BuildModeCommandReceipt,
): string[] => {
  if (command?.kind !== "edit" || receipt.status !== "succeeded") {
    return current;
  }
  return Array.from(new Set([...(command.targetPaths ?? []), ...current]));
};

const deriveReportGaps = (
  current: string[],
  commandReceipts: BuildModeCommandReceipt[],
  readinessGates: BuildModeReadinessGate[] = [],
  scheduledAutomations: ScheduledAutomationBinding[] = [],
): string[] => {
  const policyGaps = commandReceipts
    .filter((receipt) => receipt.status === "approval-required")
    .map((receipt) => `Approval pending for ${receipt.commandId}.`);
  const failureGaps = commandReceipts
    .filter(
      (receipt) => receipt.status === "failed" || receipt.status === "rejected",
    )
    .map((receipt) => `Command ${receipt.commandId} needs operator review.`);
  const readinessGaps = readinessGates
    .filter((gate) => gate.status !== "passed" && gate.blocksRun)
    .map((gate) => `Readiness gate ${gate.label}: ${gate.status}.`);
  const automationGaps = scheduledAutomations
    .filter(
      (automation) =>
        automation.lastRunStatus === "failed" ||
        automation.lastRunStatus === "skipped",
    )
    .map(
      (automation) =>
        `Automation ${automation.label} last run ${automation.lastRunStatus}.`,
    );

  return Array.from(
    new Set([
      ...policyGaps,
      ...failureGaps,
      ...readinessGaps,
      ...automationGaps,
      ...current,
    ]),
  );
};

export const renderBuildModeFinalReport = (
  payload: ValorTaskBridgePayload,
): string => {
  const section = (title: string, values: string[]) =>
    [`## ${title}`, ...(values.length ? values : ["None"]).map((v) => `- ${v}`)]
      .join("\n")
      .trim();

  const commandLines = getBuildModeCommandCatalog(payload).map((command) => {
    const receipt = payload.commandReceipts.find(
      (item) => item.commandId === command.id,
    );
    return [
      `${command.label}: ${command.status}`,
      `kind ${command.kind}`,
      `capability ${command.capabilityId}`,
      command.assignedSwarmRole
        ? `role ${command.assignedSwarmRole}`
        : undefined,
      command.assignedRuntimeId
        ? `runtime ${command.assignedRuntimeId}`
        : undefined,
      command.executionPlanStepId
        ? `step ${command.executionPlanStepId}`
        : undefined,
      receipt ? `receipt ${receipt.id}` : undefined,
      receipt?.policyDecision ? `policy ${receipt.policyDecision}` : undefined,
      receipt?.summary ? `summary ${receipt.summary}` : undefined,
    ]
      .filter(Boolean)
      .join("; ");
  });
  const nextExecutionAction = getNextBuildModeExecutionAction(payload);
  const autonomousQueuePlan = deriveBuildModeAutonomousQueuePlan(payload);
  const receiptLines = [
    ...payload.receipts.map((receipt) => `${receipt.id}: ${receipt.status}`),
    ...payload.commandReceipts.map(
      (receipt) =>
        `${receipt.id}: ${receipt.status} [${
          receipt.executionMode ?? "legacy-receipt"
        }; next: ${receipt.nextOperatorAction ?? "inspect"}]${
          receipt.policyReasons?.length
            ? ` (${receipt.policyReasons.join("; ")})`
            : ""
        }${
          receipt.approval
            ? ` approved by ${receipt.approval.approverPrincipalId} (${receipt.approval.threshold})`
            : ""
        }${
          receipt.assignedSwarmRole
            ? ` role ${receipt.assignedSwarmRole}${receipt.assignedRuntimeId ? ` (${receipt.assignedRuntimeId})` : ""}`
            : ""
        }${
          receipt.executionPlanStepId
            ? ` step ${receipt.executionPlanStepId}`
            : ""
        }${
          receipt.promptContext
            ? ` prompt ${receipt.promptContext.promptProfileName} (${receipt.promptContext.promptBundleId}@${receipt.promptContext.promptBundleVersion})`
            : ""
        }${
          receipt.grayMatterContextProof
            ? ` context ${receipt.grayMatterContextProof.contextPackId} (${receipt.grayMatterContextProof.retrievalStatus}, preflight ${receipt.grayMatterContextProof.invariantPreflightStatus}, receipts ${receipt.grayMatterContextProof.retrievalReceiptIds.join(", ") || "none"})`
            : ""
        } - ${receipt.summary}`,
    ),
  ];
  const creditUsageLines = payload.creditUsageReceipts.map(
    (receipt) =>
      `${receipt.id}: ${receipt.commandId} ${receipt.commandStatus} on ${receipt.capabilityId} via ${receipt.providerRoute}; ${receipt.actualCredits} actual (${receipt.providerCredits} provider, ${receipt.hostedInfrastructureCredits} hosted) from ${receipt.estimateId}${receipt.billingSummary ? ` - ${receipt.billingSummary}` : ""}`,
  );
  const commandOutcomeLines = [
    `succeeded: ${payload.commandReceipts.filter((receipt) => receipt.status === "succeeded").length}`,
    `running: ${payload.commandReceipts.filter((receipt) => receipt.status === "running" || receipt.status === "queued").length}`,
    `approval required: ${payload.commandReceipts.filter((receipt) => receipt.status === "approval-required").length}`,
    `failed or rejected: ${payload.commandReceipts.filter((receipt) => receipt.status === "failed" || receipt.status === "rejected").length}`,
    `evidence artifacts: ${payload.evidenceArtifacts.length}`,
    `automation bindings: ${payload.scheduledAutomations.length}`,
  ];
  const contextPack = payload.grayMatterContextPack;
  const grayMatterContextLines = [
    `source: ${contextPack.source}`,
    `policy: ${contextPack.policy}`,
    `answer policy: ${contextPack.answerPolicy}`,
    `retrieval status: ${contextPack.retrievalStatus}`,
    `invariant preflight: ${contextPack.invariantPreflightStatus}`,
    `compiled at: ${contextPack.compiledAt}`,
    `retrieval receipts: ${contextPack.retrievalReceiptIds.join(", ") || "none"}`,
    `memory entries: ${contextPack.memoryEntryIds.join(", ") || "none"}`,
    `trace: ${contextPack.retrievalTraceId ?? "none"}`,
    `preflight receipt: ${contextPack.preflightReceiptId ?? "none"}`,
    `source refs: ${contextPack.sourceRefs.join(", ") || "none"}`,
    `major task refs: ${contextPack.majorTaskRefs.join(", ") || "none"}`,
    contextPack.summary,
  ];

  return redactBuildModeText(
    [
      `# ${payload.finalReport.title}`,
      `Status: ${payload.finalReport.status}`,
      `Task: ${payload.taskId}`,
      `App Bundle: ${payload.appBundle.name} ${payload.appBundle.version}`,
      `Tenant: ${payload.scope.tenantId}`,
      `Principal: ${payload.scope.principalId}`,
      `Workspace: ${payload.scope.workspaceRoot}`,
      `Context Pack: ${payload.grayMatterContextPack.id}`,
      section("GrayMatter Context", grayMatterContextLines),
      section("Run Audit Summary", commandOutcomeLines),
      section(
        "Agent Loop",
        payload.agentLoop.map((phase) => `${phase.label}: ${phase.status}`),
      ),
      section(
        "Agent Runtime Lanes",
        payload.agentRuntimes.map(
          (runtime) =>
            `${runtime.label}: ${runtime.runtime} ${runtime.status} (${runtime.handoffPolicy}, phases: ${runtime.loopPhaseIds.join(", ") || "none"})`,
        ),
      ),
      section(
        "ThorAPI And VAIX",
        payload.thorApiVaixBindings.map(
          (binding) =>
            `${binding.serviceName}: ${binding.surface} ${binding.policy} (${binding.clientRef}; generated: ${binding.generatedPaths.join(", ") || "none"})`,
        ),
      ),
      section("Autonomy Policy", [
        `${payload.autonomyPolicy.label}: ${payload.autonomyPolicy.mode}`,
        `max consecutive commands: ${payload.autonomyPolicy.maxConsecutiveCommands}`,
        `current command receipts: ${payload.commandReceipts.length}`,
        `max estimated credits: ${payload.autonomyPolicy.maxEstimatedCredits}`,
        `estimated credits: ${payload.creditEstimate.estimatedCredits}`,
        `allowed capabilities: ${payload.autonomyPolicy.allowedCapabilityIds.join(", ") || "none"}`,
        `approval required: ${payload.autonomyPolicy.approvalRequiredCapabilityIds.join(", ") || "none"}`,
      ]),
      section("Autonomy Decision", [
        `${payload.autonomyDecision.status}: ${payload.autonomyDecision.summary}`,
        `next step: ${payload.autonomyDecision.nextStepId ?? "none"}`,
        `next command: ${payload.autonomyDecision.nextCommandId ?? "none"}`,
        `capability: ${payload.autonomyDecision.capabilityId ?? "none"}`,
        `approval threshold: ${payload.autonomyDecision.requiredApprovalThreshold ?? "none"}`,
        `command slots remaining: ${payload.autonomyDecision.commandSlotsRemaining}`,
        `estimated credits remaining: ${payload.autonomyDecision.estimatedCreditsRemaining}`,
        `blocking gates: ${payload.autonomyDecision.blockingGateIds.join(", ") || "none"}`,
        `blocking receipts: ${payload.autonomyDecision.blockingReceiptIds.join(", ") || "none"}`,
        `reasons: ${payload.autonomyDecision.reasonCodes.join(", ") || "none"}`,
      ]),
      section("Autonomous Queue Plan", [
        `${autonomousQueuePlan.status}: ${autonomousQueuePlan.summary}`,
        `next step: ${autonomousQueuePlan.nextStepId ?? "none"}`,
        `next command: ${autonomousQueuePlan.nextCommandId ?? "none"}`,
        `dispatchable commands: ${autonomousQueuePlan.dispatchableCommandIds.join(", ") || "none"}`,
        `approval commands: ${autonomousQueuePlan.approvalCommandIds.join(", ") || "none"}`,
        `blocked commands: ${autonomousQueuePlan.blockedCommandIds.join(", ") || "none"}`,
        `approval threshold: ${autonomousQueuePlan.requiredApprovalThreshold ?? "none"}`,
        `command slots remaining: ${autonomousQueuePlan.commandSlotsRemaining}`,
        `estimated credits remaining: ${autonomousQueuePlan.estimatedCreditsRemaining}`,
        `blocking gates: ${autonomousQueuePlan.blockingGateIds.join(", ") || "none"}`,
        `blocking receipts: ${autonomousQueuePlan.blockingReceiptIds.join(", ") || "none"}`,
        `receipt required: ${autonomousQueuePlan.receiptRequired ? "yes" : "no"}`,
        `reasons: ${autonomousQueuePlan.reasonCodes.join(", ") || "none"}`,
      ]),
      section("Credit Usage", [
        `estimate: ${payload.creditEstimate.estimatedCredits} ${payload.creditEstimate.currency}`,
        `provider route: ${payload.selectedProviderRoute}`,
        ...creditUsageLines,
      ]),
      section(
        "Readiness Gates",
        payload.readinessGates.map(
          (gate) =>
            `${gate.label}: ${gate.status}${gate.blocksRun ? " (blocks run)" : ""}`,
        ),
      ),
      section(
        "Execution Plan",
        payload.executionPlan.map(
          (step) =>
            `${step.label}: ${step.status} (${step.runtimeId}; commands: ${step.commandIds.join(", ") || "none"}; next: ${step.nextAction})`,
        ),
      ),
      section(
        "Next Runbook Action",
        nextExecutionAction
          ? [
              `${nextExecutionAction.step.label} -> ${nextExecutionAction.command.label} (${nextExecutionAction.command.capabilityId})`,
            ]
          : [],
      ),
      section("Command Status", commandLines),
      section("Receipt Trail", receiptLines),
      section(
        "Prompt Bundles",
        payload.promptBundles.map(
          (bundle) =>
            `${bundle.name}: ${bundle.policy} (${bundle.sections.length} sections, receipts: ${bundle.receiptIds.join(", ") || "none"})`,
        ),
      ),
      section(
        "Guardrails",
        payload.guardrails.map(
          (guardrail) => `${guardrail.label}: ${guardrail.enforcement}`,
        ),
      ),
      section(
        "Tool Permissions",
        payload.toolPermissions.map(
          (permission) =>
            `${permission.label}: ${permission.decision} (${permission.capabilityId}, threshold: ${permission.approvalThreshold}, receipt: ${permission.receiptRequired ? "required" : "optional"})`,
        ),
      ),
      section(
        "Command Policy",
        payload.commandPolicyRules.map(
          (rule) => `${rule.label}: ${rule.effect} (${rule.pattern})`,
        ),
      ),
      section(
        "Checkpoints",
        payload.checkpoints.map(
          (checkpoint) =>
            `${checkpoint.label}: ${checkpoint.status}${checkpoint.hash ? ` (${checkpoint.hash})` : ""}`,
        ),
      ),
      section(
        "Safe Edits",
        payload.safeEditPlans.map(
          (plan) =>
            `${plan.label}: ${plan.status} (${plan.targetPaths.join(", ")})`,
        ),
      ),
      section("Browser Verification", [
        `status: ${payload.browserVerification.status}`,
        `preview: ${payload.browserVerification.previewUrl ?? "not ready"}`,
        `screenshot receipt: ${payload.browserVerification.screenshotReceiptId ?? "none"}`,
        `console errors: ${payload.browserVerification.consoleErrorCount}`,
        `artifacts: ${payload.browserVerification.artifactIds.join(", ") || "none"}`,
      ]),
      section(
        "Evidence Artifacts",
        payload.evidenceArtifacts.map((artifact) => {
          const proof = formatEvidenceArtifactProof(artifact);
          return `${artifact.title}: ${artifact.kind} (${artifact.uri})${artifact.receiptId ? ` receipt ${artifact.receiptId}` : ""}${artifact.summary ? ` - ${artifact.summary}` : ""}${proof ? `; ${proof}` : ""}`;
        }),
      ),
      section(
        "Scheduled Automations",
        payload.scheduledAutomations.map((automation) =>
          [
            `${automation.label}: ${automation.status}`,
            `schedule ${automation.schedule}`,
            `scheduler ${automation.scheduler ?? "valkyrai-cron"}`,
            automation.providerRoute
              ? `provider ${automation.providerRoute}`
              : undefined,
            automation.promptContext
              ? `prompt ${automation.promptContext.promptProfileName} (${automation.promptContext.promptBundleId}@${automation.promptContext.promptBundleVersion})`
              : undefined,
            `workflow ${automation.workflowRef}`,
            automation.valkyraiWorkflowId
              ? `valkyrai workflow ${automation.valkyraiWorkflowId}`
              : undefined,
            `next ${automation.nextRunAt ?? "not scheduled"}`,
            automation.lastRunAt
              ? `last ${automation.lastRunStatus ?? "unknown"} at ${automation.lastRunAt}`
              : "last never",
            automation.lastRunReceiptId
              ? `receipt ${automation.lastRunReceiptId}`
              : undefined,
            automation.runHistory?.length
              ? `history ${automation.runHistory
                  .slice(0, 3)
                  .map(
                    (run) =>
                      `${run.status}@${run.completedAt}${run.error ? `:${run.error}` : ""}`,
                  )
                  .join(", ")}`
              : undefined,
          ]
            .filter(Boolean)
            .join("; "),
        ),
      ),
      section("Scope", [
        `tenant: ${payload.scope.tenantId}`,
        `principal: ${payload.scope.principalId}`,
        `workspace: ${payload.scope.workspaceRoot}`,
        `roles: ${payload.scope.roles.join(", ") || "none"}`,
        `policies: ${payload.scope.policyRefs.join(", ") || "none"}`,
      ]),
      section("Files Changed", payload.finalReport.filesChanged),
      section("Tests Run", payload.finalReport.testsRun),
      section("Gaps", payload.finalReport.gaps),
      section("Next Handoff", payload.finalReport.nextHandoff),
    ].join("\n\n"),
  );
};

export const formatEvidenceArtifactProof = (
  artifact: Pick<BuildModeEvidenceArtifact, "metadata">,
): string | undefined => {
  const metadata = artifact.metadata;
  if (!metadata) {
    return undefined;
  }
  const parts = [
    formatProofPart("execution", metadata.executionId),
    formatProofPart("state", metadata.executionState),
    formatProofPart("receipt", metadata.receiptRef),
    formatProofPart("trace", metadata.traceId),
    formatProofPart("status", metadata.status),
    formatProofPart("workflow", metadata.workflowRef),
    formatProofPart("schedule", metadata.scheduleId),
    formatProofPart("checkpoint", metadata.checkpointHash),
    formatProofPart("connector", metadata.connectorId),
    formatProofPart("data", metadata.dataClass),
    formatProofPart("query", metadata.queryRef),
    formatProofPart("records", metadata.recordCount),
    formatProofPart("resource", metadata.resourceUri),
  ].filter(Boolean);
  return parts.length ? parts.join("; ") : undefined;
};

const formatProofPart = (
  label: string,
  value: string | number | boolean | undefined,
): string | undefined => {
  if (value === undefined || value === "") {
    return undefined;
  }
  return `${label} ${String(value)}`;
};
