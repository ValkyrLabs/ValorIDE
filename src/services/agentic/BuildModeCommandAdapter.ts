import type {
  BuildModeAutonomyPolicy,
  BuildModeCommand,
  BuildModeCommandApproval,
  BuildModeCommandExecutionMode,
  BuildModeCommandPolicyRule,
  BuildModeCommandReceipt,
  BuildModeCommandStatus,
  BuildModeCheckpoint,
  BuildModeNextOperatorAction,
  CreditUsageReceipt,
  BuildModeEvidenceArtifact,
  BuildModeEvidenceArtifactKind,
  BuildModeExecutionPlanStep,
  BuildModeGrayMatterContextProof,
  BuildModePromptExecutionContext,
  BuildModeReadinessGate,
  BuildModeScopeContext,
  BuildModeToolPermission,
  GrayMatterContextPack,
  ProviderRoute,
} from "@shared/BuildMode";
import {
  AgenticCommand,
  AgenticCommandBus,
  AgenticCommandResult,
} from "./CommandBus";
import {
  CapabilityRegistry,
  createDefaultValorCapabilities,
} from "./CapabilityRegistry";
import type { BuildModeCommandPolicyEvaluation } from "./BuildModeCommandPolicy";
import {
  evaluateBuildModeCommandPolicy,
  redactCommandSecrets,
} from "./BuildModeCommandPolicy";

export interface BuildModeCommandRequest {
  approval?: BuildModeCommandApproval;
  autonomyPolicy?: BuildModeAutonomyPolicy;
  browserPreviewUrl?: string;
  command: BuildModeCommand;
  commandCatalog?: BuildModeCommand[];
  commandPolicyRules?: BuildModeCommandPolicyRule[];
  checkpoints?: BuildModeCheckpoint[];
  currentConsecutiveCommands?: number;
  creditEstimateId?: string;
  estimatedCredits?: number;
  executionHooks?: BuildModeCommandExecutionHooks;
  executionPlan?: BuildModeExecutionPlanStep[];
  finalReportMarkdown?: string;
  grayMatterContextPack?: GrayMatterContextPack;
  protectedPaths?: string[];
  promptContext?: BuildModePromptExecutionContext;
  providerRoute?: ProviderRoute;
  readinessGates?: BuildModeReadinessGate[];
  requireGrayMatterContext?: boolean;
  scope?: BuildModeScopeContext;
  taskId: string;
  toolPermissions?: BuildModeToolPermission[];
  workspaceRoot?: string;
}

export interface BuildModeCommandExecutionHooks {
  executeAutomationSchedule?: (
    request: BuildModeCommandRequest,
  ) =>
    | Promise<BuildModeAutomationScheduleExecutionResult>
    | BuildModeAutomationScheduleExecutionResult;
  executeBrowserVerification?: (
    request: BuildModeCommandRequest,
  ) =>
    | Promise<BuildModeBrowserVerificationResult>
    | BuildModeBrowserVerificationResult;
  executeCheckpoint?: (
    request: BuildModeCommandRequest,
  ) =>
    | Promise<BuildModeCheckpointExecutionResult>
    | BuildModeCheckpointExecutionResult;
  executeConnectorRead?: (
    request: BuildModeCommandRequest,
  ) => Promise<BuildModeConnectorReadResult> | BuildModeConnectorReadResult;
  executeMcpTool?: (
    request: BuildModeCommandRequest,
  ) => Promise<BuildModeMcpExecutionResult> | BuildModeMcpExecutionResult;
  publishFinalReport?: (
    request: BuildModeCommandRequest,
  ) =>
    | Promise<BuildModeFinalReportPublishResult>
    | BuildModeFinalReportPublishResult;
  executeSwarmHandoff?: (
    request: BuildModeCommandRequest,
  ) => Promise<BuildModeSwarmHandoffResult> | BuildModeSwarmHandoffResult;
  executeSafeEdit?: (
    request: BuildModeCommandRequest,
  ) =>
    | Promise<BuildModeSafeEditExecutionResult>
    | BuildModeSafeEditExecutionResult;
  executeTerminalCommand?: (
    request: BuildModeCommandRequest,
  ) =>
    | Promise<BuildModeTerminalExecutionResult>
    | BuildModeTerminalExecutionResult;
}

export interface BuildModeSafeEditExecutionResult {
  artifactUri?: string;
  bytesDelta?: number;
  editsApplied: number;
  editsRequested: number;
  filePath: string;
  postHash?: string;
  skipped?: Array<{ index: number; reason: string }>;
  warnings?: string[];
}

export interface BuildModeBrowserVerificationResult {
  consoleErrorCount?: number;
  consoleLogUri?: string;
  currentUrl?: string;
  logs?: string;
  screenshot?: string;
  screenshotUri?: string;
  status?: "failed" | "passed";
}

export interface BuildModeTerminalExecutionResult {
  artifactUri?: string;
  background?: boolean;
  completed?: boolean;
  exitCode?: number;
  stderr?: string;
  stdout?: string;
  timedOut?: boolean;
}

export interface BuildModeCheckpointExecutionResult {
  action: "create" | "rollback";
  checkpointHash?: string;
  checkpointRef?: string;
  restored?: boolean;
  warnings?: string[];
  workspaceRoot?: string;
}

export interface BuildModeConnectorReadResult {
  artifactUri?: string;
  connectorId: string;
  connectorName?: string;
  dataClass: string;
  isError?: boolean;
  queryRef: string;
  receiptRef?: string;
  recordCount?: number;
  resourceUri?: string;
  scopeRef?: string;
  status?: "authorized" | "blocked" | "failed" | "partial";
  summary?: string;
  traceId?: string;
}

export interface BuildModeFinalReportPublishResult {
  artifactUri?: string;
  byteSize?: number;
  reportTitle?: string;
  summary?: string;
}

export interface BuildModeMcpExecutionResult {
  contentText?: string;
  executionId?: string;
  executionState?: string;
  isError?: boolean;
  resourceUris?: string[];
  receiptRef?: string;
  serverName: string;
  status?: string;
  toolName: string;
  traceId?: string;
  workflowRef?: string;
}

export interface BuildModeSwarmHandoffResult {
  artifactUri?: string;
  handoffId?: string;
  isError?: boolean;
  runtimeId?: string;
  status?: "accepted" | "blocked" | "queued";
  summary?: string;
  swarmRole: string;
  taskId?: string;
  traceId?: string;
}

export interface BuildModeAutomationScheduleExecutionResult {
  nextRunAt?: string;
  schedule: string;
  scheduleId: string;
  storageUri?: string;
  workflowCommandId?: string;
  workflowRef: string;
}

export interface BuildModeCommandQueueResult {
  agenticResult: AgenticCommandResult;
  receipt: BuildModeCommandReceipt;
}

const commandKindCapability: Record<BuildModeCommand["kind"], string> = {
  automation: "automation.schedule",
  build: "terminal.execute",
  checkpoint: "checkpoint.manage",
  connector: "connector.read",
  deploy: "terminal.execute",
  edit: "psr.edit",
  mcp: "mcp.tool",
  report: "graymatter.memory",
  swarm: "swarm.command",
  test: "terminal.execute",
  verify: "browser.automation",
  workflow: "mcp.tool",
};

export const toAgenticCommand = (
  request: BuildModeCommandRequest,
): AgenticCommand => ({
  capabilityId:
    request.command.capabilityId || commandKindCapability[request.command.kind],
  correlationId: request.taskId,
  id: request.command.id,
  payload: {
    ...(request.command.assignedRuntimeId
      ? { assignedRuntimeId: request.command.assignedRuntimeId }
      : {}),
    ...(request.command.assignedSwarmRole
      ? { assignedSwarmRole: request.command.assignedSwarmRole }
      : {}),
    command: request.command.command,
    ...(request.command.executionPlanStepId
      ? { executionPlanStepId: request.command.executionPlanStepId }
      : {}),
    kind: request.command.kind,
    label: request.command.label,
    ...(request.promptContext ? { promptContext: request.promptContext } : {}),
    ...(request.finalReportMarkdown
      ? { finalReportMarkdown: request.finalReportMarkdown }
      : {}),
    taskId: request.taskId,
  },
  requiresApproval: request.command.requiresApproval,
  source: "local",
});

export const queueBuildModeCommand = async (
  request: BuildModeCommandRequest,
  now: () => Date = () => new Date(),
): Promise<BuildModeCommandQueueResult> => {
  const requestWithRedactedApproval = redactApprovalInRequest(request);
  const policy = evaluateBuildModeCommandPolicy(request.command, {
    approval: requestWithRedactedApproval.approval,
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
  const guardedRequest = applyPolicyToRequest(
    requestWithRedactedApproval,
    policy,
  );
  if (policy.decision === "reject") {
    const agenticResult = redactAgenticCommandResult(
      createPolicyRejectedResult(guardedRequest, policy, now),
    );
    return {
      agenticResult,
      receipt: toBuildModeCommandReceipt(
        agenticResult,
        now,
        policy,
        request.scope,
        undefined,
        createCreditUsageReceipt(guardedRequest, agenticResult, now, policy),
        request.promptContext,
        guardedRequest.command,
        createGrayMatterContextProof(request.grayMatterContextPack),
      ),
    };
  }

  const registry = new CapabilityRegistry(
    createDefaultValorCapabilities(),
    now,
  );
  const bus = new AgenticCommandBus({
    approve: request.approval
      ? () => ({
          approved: request.approval!.approved,
          reason: request.approval!.reason,
        })
      : undefined,
    capabilities: registry,
    now,
  });
  bus.registerHandler("terminal.execute", async (command) => {
    if (request.executionHooks?.executeTerminalCommand) {
      const execution =
        await request.executionHooks.executeTerminalCommand(guardedRequest);
      return toTerminalExecutionOutput(
        command.id,
        command.correlationId,
        request.command.label,
        execution,
      );
    }
    return toQueuedTerminalOutput(
      command.id,
      command.correlationId,
      request.command.label,
    );
  });
  bus.registerHandler("browser.automation", async (command) => {
    if (request.executionHooks?.executeBrowserVerification) {
      const verification =
        await request.executionHooks.executeBrowserVerification(guardedRequest);
      return toBrowserVerificationOutput(
        command.id,
        command.correlationId,
        request.command.label,
        verification,
      );
    }
    return toQueuedBrowserVerificationOutput(
      command.id,
      command.correlationId,
      request.command.label,
    );
  });
  bus.registerHandler("mcp.tool", async (command) => {
    if (request.executionHooks?.executeMcpTool) {
      const mcpResult =
        await request.executionHooks.executeMcpTool(guardedRequest);
      return toMcpExecutionOutput(
        command.id,
        command.correlationId,
        request.command.label,
        request.command.kind,
        mcpResult,
      );
    }
    return toQueuedMcpOutput(
      command.id,
      command.correlationId,
      request.command.label,
    );
  });
  bus.registerHandler("automation.schedule", async (command) => {
    if (request.executionHooks?.executeAutomationSchedule) {
      const automationResult =
        await request.executionHooks.executeAutomationSchedule(guardedRequest);
      return toAutomationScheduleOutput(
        command.id,
        command.correlationId,
        request.command.label,
        automationResult,
      );
    }
    return toQueuedAutomationScheduleOutput(
      command.id,
      command.correlationId,
      request.command.label,
    );
  });
  bus.registerHandler("checkpoint.manage", async (command) => {
    if (request.executionHooks?.executeCheckpoint) {
      const checkpointResult =
        await request.executionHooks.executeCheckpoint(guardedRequest);
      return toCheckpointExecutionOutput(
        command.id,
        command.correlationId,
        request.command.label,
        checkpointResult,
      );
    }
    return toQueuedCheckpointOutput(
      command.id,
      command.correlationId,
      request.command.label,
    );
  });
  bus.registerHandler("connector.read", async (command) => {
    if (request.executionHooks?.executeConnectorRead) {
      const connectorResult =
        await request.executionHooks.executeConnectorRead(guardedRequest);
      return toConnectorReadOutput(
        command.id,
        command.correlationId,
        request.command.label,
        connectorResult,
      );
    }
    return toQueuedConnectorReadOutput(
      command.id,
      command.correlationId,
      request.command.label,
    );
  });
  bus.registerHandler("swarm.command", async (command) => {
    if (request.executionHooks?.executeSwarmHandoff) {
      const handoff =
        await request.executionHooks.executeSwarmHandoff(guardedRequest);
      return toSwarmHandoffOutput(
        command.id,
        command.correlationId,
        request.command.label,
        handoff,
      );
    }
    return toQueuedSwarmHandoffOutput(
      command.id,
      command.correlationId,
      request.command.label,
      request.command,
    );
  });
  bus.registerHandler("psr.edit", async (command) => {
    if (request.executionHooks?.executeSafeEdit) {
      const editResult =
        await request.executionHooks.executeSafeEdit(guardedRequest);
      return toSafeEditOutput(
        command.id,
        command.correlationId,
        request.command.label,
        editResult,
      );
    }
    return toQueuedSafeEditOutput(
      command.id,
      command.correlationId,
      request.command.label,
      "psr",
      "Build Mode precision edit runner",
    );
  });
  bus.registerHandler("filesystem.write", async (command) => {
    if (request.executionHooks?.executeSafeEdit) {
      const editResult =
        await request.executionHooks.executeSafeEdit(guardedRequest);
      return toSafeEditOutput(
        command.id,
        command.correlationId,
        request.command.label,
        editResult,
      );
    }
    return toQueuedSafeEditOutput(
      command.id,
      command.correlationId,
      request.command.label,
      "filesystem",
      "Build Mode file writer",
    );
  });
  bus.registerHandler("graymatter.memory", async (command) => {
    if (request.executionHooks?.publishFinalReport) {
      const reportResult =
        await request.executionHooks.publishFinalReport(guardedRequest);
      return toFinalReportPublishOutput(
        command.id,
        command.correlationId,
        request.command.label,
        reportResult,
      );
    }
    return toQueuedFinalReportOutput(
      command.id,
      command.correlationId,
      request.command.label,
    );
  });

  const agenticResult = redactAgenticCommandResult(
    await bus.execute(toAgenticCommand(guardedRequest)),
  );
  return {
    agenticResult,
    receipt: toBuildModeCommandReceipt(
      agenticResult,
      now,
      policy,
      request.scope,
      guardedRequest.approval,
      createCreditUsageReceipt(guardedRequest, agenticResult, now, policy),
      request.promptContext,
      guardedRequest.command,
      createGrayMatterContextProof(request.grayMatterContextPack),
    ),
  };
};

export const toBuildModeCommandReceipt = (
  result: AgenticCommandResult,
  now: () => Date = () => new Date(),
  policy?: BuildModeCommandPolicyEvaluation,
  scope?: BuildModeScopeContext,
  approval?: BuildModeCommandApproval,
  creditUsageReceipt?: CreditUsageReceipt,
  promptContext?: BuildModePromptExecutionContext,
  command?: BuildModeCommand,
  grayMatterContextProof?: BuildModeGrayMatterContextProof,
): BuildModeCommandReceipt => {
  const status =
    policy?.decision === "reject"
      ? "rejected"
      : toBuildModeCommandStatus(result.status, result.audit.approved, result);
  const baseSummary =
    result.error?.message ?? result.stdout ?? `${result.tool.label} ${status}.`;
  const executionMode = getExecutionMode(status, result, policy);
  const nextOperatorAction = getNextOperatorAction(status, executionMode);
  const createdAt = result.audit.completedAt || now().toISOString();
  const receiptId = createCommandReceiptId(result, status, createdAt);
  return {
    id: receiptId,
    commandId: result.commandId,
    capabilityId: result.audit.capabilityId,
    status,
    approved: result.audit.approved,
    requiresApproval: result.audit.requiresApproval,
    summary: appendPolicySummary(baseSummary, policy),
    createdAt,
    executionMode,
    nextOperatorAction,
    operatorActionSummary: getOperatorActionSummary(
      status,
      executionMode,
      nextOperatorAction,
      policy,
    ),
    assignedRuntimeId: command?.assignedRuntimeId,
    assignedSwarmRole: command?.assignedSwarmRole,
    executionPlanStepId: command?.executionPlanStepId,
    policyDecision: policy?.decision,
    policyReasons: policy?.reasons.length ? policy.reasons : undefined,
    approval,
    scope,
    promptContext,
    grayMatterContextProof,
    artifacts: toBuildModeEvidenceArtifacts(result, receiptId, createdAt),
    creditUsageReceipt,
  };
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

const createCommandReceiptId = (
  result: AgenticCommandResult,
  status: BuildModeCommandStatus,
  createdAt: string,
): string =>
  `build-command-receipt-${result.commandId}-${stableHash(
    [
      result.commandId,
      result.audit.startedAt,
      createdAt,
      status,
      result.audit.correlationId ?? "",
    ].join(":"),
  ).slice(0, 12)}`;

const getExecutionMode = (
  status: BuildModeCommandStatus,
  result: AgenticCommandResult,
  policy?: BuildModeCommandPolicyEvaluation,
): BuildModeCommandExecutionMode => {
  if (policy?.decision === "reject" || status === "rejected") {
    return "policy-blocked";
  }
  if (status === "approval-required") {
    return "approval-gate";
  }
  if (result.status === "success" || result.status === "failed") {
    return "agentic-command-bus";
  }
  return "operator-handoff";
};

const getNextOperatorAction = (
  status: BuildModeCommandStatus,
  executionMode: BuildModeCommandExecutionMode,
): BuildModeNextOperatorAction => {
  if (executionMode === "policy-blocked") {
    return "revise";
  }
  if (executionMode === "approval-gate") {
    return "approve";
  }
  switch (status) {
    case "queued":
    case "running":
      return "monitor";
    case "failed":
      return "inspect";
    case "succeeded":
      return "continue";
    default:
      return "none";
  }
};

const getOperatorActionSummary = (
  status: BuildModeCommandStatus,
  executionMode: BuildModeCommandExecutionMode,
  nextOperatorAction: BuildModeNextOperatorAction,
  policy?: BuildModeCommandPolicyEvaluation,
): string => {
  if (executionMode === "policy-blocked") {
    return "Revise the command, scope, policy, or approval packet before retrying.";
  }
  if (executionMode === "approval-gate") {
    const policySummary = policy?.reasons.length
      ? ` Reasons: ${policy.reasons.map(redactBuildModeEvidenceText).join(" ")}`
      : "";
    return `Review and approve this command with the required threshold before dispatch.${policySummary}`;
  }
  if (nextOperatorAction === "monitor") {
    return "Monitor the dispatched capability and merge the completion receipt before advancing the runbook.";
  }
  if (nextOperatorAction === "inspect") {
    return "Inspect the failed receipt, decide whether to retry, revise, or roll back.";
  }
  if (nextOperatorAction === "continue") {
    return "Continue to the next eligible runbook command.";
  }
  return `No immediate operator action is required for ${status}.`;
};

const createCreditUsageReceipt = (
  request: BuildModeCommandRequest,
  result: AgenticCommandResult,
  now: () => Date,
  policy?: BuildModeCommandPolicyEvaluation,
): CreditUsageReceipt => {
  const usage = estimateCommandCreditUsage(request, result);
  const commandStatus =
    policy?.decision === "reject"
      ? "rejected"
      : toBuildModeCommandStatus(result.status, result.audit.approved, result);
  return {
    id: `credit-usage-${result.commandId}-${stableHash(
      [
        result.commandId,
        result.audit.startedAt,
        result.audit.completedAt,
        commandStatus,
      ].join(":"),
    ).slice(0, 12)}`,
    estimateId: request.creditEstimateId ?? `credit-estimate-${request.taskId}`,
    commandId: result.commandId,
    capabilityId: result.audit.capabilityId,
    providerRoute: request.providerRoute ?? "valkyr-credits",
    commandStatus,
    actualCredits: usage.actualCredits,
    providerCredits: usage.providerCredits,
    hostedInfrastructureCredits: usage.hostedInfrastructureCredits,
    billingSummary: summarizeCreditUsage(
      request.providerRoute ?? "valkyr-credits",
      usage,
    ),
    createdAt: result.audit.completedAt || now().toISOString(),
  };
};

const estimateCommandCreditUsage = (
  request: BuildModeCommandRequest,
  result: AgenticCommandResult,
): Pick<
  CreditUsageReceipt,
  "actualCredits" | "hostedInfrastructureCredits" | "providerCredits"
> => {
  const commandStatus = toBuildModeCommandStatus(
    result.status,
    result.audit.approved,
    result,
  );
  if (
    result.status !== "success" ||
    ["approval-required", "failed", "rejected"].includes(commandStatus)
  ) {
    return {
      actualCredits: 0,
      hostedInfrastructureCredits: 0,
      providerCredits: 0,
    };
  }

  const baseCredits = getCommandBaseCredits(request.command.kind);
  const hostedInfrastructureCredits = getHostedInfrastructureCredits(
    request.command.kind,
  );
  const providerCredits =
    request.providerRoute === "local-model" ||
    request.providerRoute === "bring-your-own-key"
      ? 0
      : Math.max(0, baseCredits - hostedInfrastructureCredits);

  return {
    actualCredits: providerCredits + hostedInfrastructureCredits,
    hostedInfrastructureCredits,
    providerCredits,
  };
};

const getCommandBaseCredits = (kind: BuildModeCommand["kind"]): number => {
  switch (kind) {
    case "automation":
    case "mcp":
    case "verify":
    case "workflow":
      return 2;
    case "deploy":
      return 3;
    default:
      return 1;
  }
};

const getHostedInfrastructureCredits = (
  kind: BuildModeCommand["kind"],
): number => {
  switch (kind) {
    case "automation":
    case "verify":
      return 1;
    default:
      return 0;
  }
};

const summarizeCreditUsage = (
  providerRoute: ProviderRoute,
  usage: Pick<
    CreditUsageReceipt,
    "actualCredits" | "hostedInfrastructureCredits" | "providerCredits"
  >,
): string => {
  if (usage.actualCredits === 0) {
    return "No credits charged because the command did not complete billable execution.";
  }
  const hostedCreditText = `${usage.hostedInfrastructureCredits} Valkyr hosted infrastructure credit${usage.hostedInfrastructureCredits === 1 ? "" : "s"}`;
  if (providerRoute === "bring-your-own-key") {
    return `BYO provider key covers model/provider spend; ${hostedCreditText} still appl${usage.hostedInfrastructureCredits === 1 ? "ies" : "y"}.`;
  }
  if (providerRoute === "local-model") {
    return `Local model route has no provider credit charge; ${hostedCreditText} still appl${usage.hostedInfrastructureCredits === 1 ? "ies" : "y"}.`;
  }
  return `${usage.providerCredits} provider credit${usage.providerCredits === 1 ? "" : "s"} and ${usage.hostedInfrastructureCredits} hosted infrastructure credit${usage.hostedInfrastructureCredits === 1 ? "" : "s"} charged through ${providerRoute}.`;
};

const toQueuedTerminalOutput = (
  commandId: string,
  taskId: string | undefined,
  label: string,
) => ({
  artifacts: [
    createCommandArtifact(commandId, "command_stdout", "Command stdout"),
  ],
  output: {
    buildModeStatus: "queued",
    queued: true,
    taskId,
  },
  stdout: `${label} queued for ValorIDE operator approval/execution.`,
  tool: {
    capabilityId: "terminal.execute",
    kind: "terminal",
    label: "Build Mode command runner",
  },
});

const toQueuedFinalReportOutput = (
  commandId: string,
  taskId: string | undefined,
  label: string,
) => ({
  artifacts: [
    createCommandArtifact(commandId, "final_report", "Final report receipt"),
  ],
  output: {
    buildModeStatus: "queued",
    queued: true,
    taskId,
  },
  stdout: `${label} queued for final report publication.`,
  tool: {
    capabilityId: "graymatter.memory",
    kind: "graymatter",
    label: "Build Mode final report publisher",
  },
});

const toQueuedConnectorReadOutput = (
  commandId: string,
  taskId: string | undefined,
  label: string,
) => ({
  artifacts: [
    createCommandArtifact(
      commandId,
      "connector_data",
      "Connector data receipt",
    ),
  ],
  output: {
    buildModeStatus: "queued",
    queued: true,
    taskId,
  },
  stdout: `${label} queued for authorized connector read.`,
  tool: {
    capabilityId: "connector.read",
    kind: "connector",
    label: "Build Mode connector reader",
  },
});

const toConnectorReadOutput = (
  commandId: string,
  taskId: string | undefined,
  label: string,
  result: BuildModeConnectorReadResult,
) => {
  const buildModeStatus: BuildModeCommandStatus = result.isError
    ? "failed"
    : "succeeded";
  const recordSummary =
    result.recordCount === undefined
      ? "authorized connector records"
      : `${result.recordCount} authorized connector record${
          result.recordCount === 1 ? "" : "s"
        }`;
  const summary =
    result.summary ??
    `${label} read ${recordSummary} from ${result.connectorName ?? result.connectorId}.`;
  return {
    artifacts: [
      {
        ...createCommandArtifact(commandId, "connector_data", label),
        metadata: {
          connectorId: result.connectorId,
          connectorName: result.connectorName,
          dataClass: result.dataClass,
          queryRef: result.queryRef,
          receiptRef: result.receiptRef,
          recordCount: result.recordCount,
          resourceUri: result.resourceUri,
          scopeRef: result.scopeRef,
          status: result.status ?? (result.isError ? "failed" : "authorized"),
          summary,
          taskId,
          traceId: result.traceId,
        },
        uri:
          result.artifactUri ??
          `valoride://build-mode/commands/${encodeURIComponent(commandId)}/connector_data/${encodeURIComponent(
            result.connectorId,
          )}`,
      },
    ],
    output: {
      buildModeStatus,
      connectorId: result.connectorId,
      dataClass: result.dataClass,
      queued: false,
      queryRef: result.queryRef,
      recordCount: result.recordCount,
      taskId,
    },
    stdout: `${label} ${result.isError ? "failed" : "completed"}. ${summary}`,
    tool: {
      capabilityId: "connector.read",
      kind: "connector",
      label: "Build Mode connector reader",
    },
  };
};

const toQueuedSwarmHandoffOutput = (
  commandId: string,
  taskId: string | undefined,
  label: string,
  command: BuildModeCommand,
) => ({
  artifacts: [
    {
      ...createCommandArtifact(
        commandId,
        "swarm_handoff",
        "Swarm handoff receipt",
      ),
      metadata: {
        runtimeId: command.assignedRuntimeId,
        status: "queued",
        summary: `${label} queued for ${command.assignedSwarmRole ?? "assigned swarm role"}.`,
        swarmRole: command.assignedSwarmRole,
        taskId,
      },
    },
  ],
  output: {
    buildModeStatus: "queued",
    queued: true,
    runtimeId: command.assignedRuntimeId,
    swarmRole: command.assignedSwarmRole,
    taskId,
  },
  stdout: `${label} queued for swarm role coordination.`,
  tool: {
    capabilityId: "swarm.command",
    kind: "swarm",
    label: "Build Mode swarm coordinator",
  },
});

const toSwarmHandoffOutput = (
  commandId: string,
  taskId: string | undefined,
  label: string,
  result: BuildModeSwarmHandoffResult,
) => {
  const buildModeStatus: BuildModeCommandStatus = result.isError
    ? "failed"
    : result.status === "accepted"
      ? "succeeded"
      : "queued";
  const summary =
    result.summary ??
    `${label} ${result.status ?? "queued"} for ${result.swarmRole}.`;
  return {
    artifacts: [
      {
        ...createCommandArtifact(
          commandId,
          "swarm_handoff",
          "Swarm handoff receipt",
        ),
        metadata: {
          handoffId: result.handoffId,
          runtimeId: result.runtimeId,
          status: result.status ?? (result.isError ? "blocked" : "queued"),
          summary,
          swarmRole: result.swarmRole,
          taskId: result.taskId ?? taskId,
          traceId: result.traceId,
        },
        uri:
          result.artifactUri ??
          `valoride://build-mode/commands/${encodeURIComponent(commandId)}/swarm_handoff/${encodeURIComponent(
            result.handoffId ?? result.swarmRole,
          )}`,
      },
    ],
    output: {
      buildModeStatus,
      handoffId: result.handoffId,
      queued: buildModeStatus === "queued",
      runtimeId: result.runtimeId,
      swarmRole: result.swarmRole,
      taskId,
      traceId: result.traceId,
    },
    stdout: `${label} ${result.isError ? "failed" : buildModeStatus === "succeeded" ? "accepted" : "queued"} for ${result.swarmRole}. ${summary}`,
    tool: {
      capabilityId: "swarm.command",
      kind: "swarm",
      label: "Build Mode swarm coordinator",
    },
  };
};

const toFinalReportPublishOutput = (
  commandId: string,
  taskId: string | undefined,
  label: string,
  result: BuildModeFinalReportPublishResult,
) => {
  const summary =
    result.summary ??
    `${result.reportTitle ?? label} captured with Build Mode evidence receipts.`;
  return {
    artifacts: [
      {
        ...createCommandArtifact(commandId, "final_report", "Final report"),
        metadata: {
          byteSize: result.byteSize ?? 0,
          reportTitle: result.reportTitle ?? label,
          summary,
          taskId,
        },
        uri:
          result.artifactUri ??
          `valoride://build-mode/commands/${encodeURIComponent(commandId)}/final_report`,
      },
    ],
    output: {
      buildModeStatus: "succeeded",
      byteSize: result.byteSize ?? 0,
      queued: false,
      taskId,
    },
    stdout: `${label} published. ${summary}`,
    tool: {
      capabilityId: "graymatter.memory",
      kind: "graymatter",
      label: "Build Mode final report publisher",
    },
  };
};

const toTerminalExecutionOutput = (
  commandId: string,
  taskId: string | undefined,
  label: string,
  execution: BuildModeTerminalExecutionResult,
) => {
  const completed = execution.completed ?? execution.exitCode !== undefined;
  const buildModeStatus: BuildModeCommandStatus =
    !completed || execution.background
      ? "queued"
      : execution.exitCode === 0
        ? "succeeded"
        : "failed";
  const stdout =
    execution.stdout ??
    `${label} dispatched through the ValorIDE terminal manager.`;

  return {
    artifacts: [
      {
        ...createCommandArtifact(commandId, "command_stdout", "Command stdout"),
        uri:
          execution.artifactUri ??
          `valoride://build-mode/commands/${encodeURIComponent(commandId)}/terminal-execution`,
      },
    ],
    output: {
      background: execution.background ?? !completed,
      buildModeStatus,
      completed,
      exitCode: execution.exitCode,
      queued: buildModeStatus === "queued",
      taskId,
      timedOut: execution.timedOut,
    },
    stderr: execution.stderr,
    stdout,
    tool: {
      capabilityId: "terminal.execute",
      kind: "terminal",
      label: "Build Mode terminal executor",
    },
  };
};

const toQueuedBrowserVerificationOutput = (
  commandId: string,
  taskId: string | undefined,
  label: string,
) => ({
  artifacts: [
    createCommandArtifact(
      commandId,
      "browser_screenshot",
      "Browser verification screenshot",
    ),
    createCommandArtifact(commandId, "browser_console", "Browser console log"),
  ],
  output: {
    buildModeStatus: "queued",
    queued: true,
    taskId,
  },
  stdout: `${label} queued for browser verification.`,
  tool: {
    capabilityId: "browser.automation",
    kind: "browser",
    label: "Build Mode browser verifier",
  },
});

const toQueuedMcpOutput = (
  commandId: string,
  taskId: string | undefined,
  label: string,
) => ({
  artifacts: [
    createCommandArtifact(commandId, "mcp_result", "MCP tool result"),
  ],
  output: {
    buildModeStatus: "queued",
    queued: true,
    taskId,
  },
  stdout: `${label} queued for MCP/workflow execution.`,
  tool: {
    capabilityId: "mcp.tool",
    kind: "mcp",
    label: "Build Mode MCP workflow runner",
  },
});

const toQueuedAutomationScheduleOutput = (
  commandId: string,
  taskId: string | undefined,
  label: string,
) => ({
  artifacts: [
    createCommandArtifact(
      commandId,
      "workflow_receipt",
      "Scheduled automation receipt",
    ),
  ],
  output: {
    buildModeStatus: "queued",
    queued: true,
    taskId,
  },
  stdout: `${label} queued for scheduled automation setup.`,
  tool: {
    capabilityId: "automation.schedule",
    kind: "automation",
    label: "Build Mode automation scheduler",
  },
});

const toAutomationScheduleOutput = (
  commandId: string,
  taskId: string | undefined,
  label: string,
  result: BuildModeAutomationScheduleExecutionResult,
) => ({
  artifacts: [
    {
      ...createCommandArtifact(
        commandId,
        "workflow_receipt",
        "Scheduled automation receipt",
      ),
      metadata: {
        nextRunAt: result.nextRunAt,
        schedule: result.schedule,
        scheduleId: result.scheduleId,
        storageUri: result.storageUri,
        summary: `${result.scheduleId} scheduled ${result.workflowRef} on ${result.schedule}${result.nextRunAt ? `; next run ${result.nextRunAt}` : ""}.`,
        workflowCommandId: result.workflowCommandId,
        workflowRef: result.workflowRef,
      },
      uri:
        result.storageUri ??
        `valoride://build-mode/commands/${encodeURIComponent(commandId)}/workflow_receipt/${encodeURIComponent(
          result.scheduleId,
        )}`,
    },
  ],
  output: {
    buildModeStatus: "succeeded" as BuildModeCommandStatus,
    nextRunAt: result.nextRunAt,
    queued: false,
    schedule: result.schedule,
    scheduleId: result.scheduleId,
    taskId,
    workflowCommandId: result.workflowCommandId,
    workflowRef: result.workflowRef,
  },
  stdout: `${label} scheduled ${result.workflowRef} on ${result.schedule}${result.nextRunAt ? `; next run ${result.nextRunAt}` : ""}.`,
  tool: {
    capabilityId: "automation.schedule",
    kind: "automation",
    label: "Build Mode automation scheduler",
  },
});

const toMcpExecutionOutput = (
  commandId: string,
  taskId: string | undefined,
  label: string,
  commandKind: BuildModeCommand["kind"],
  result: BuildModeMcpExecutionResult,
) => {
  const buildModeStatus: BuildModeCommandStatus = result.isError
    ? "failed"
    : "succeeded";
  const artifactKind: BuildModeEvidenceArtifactKind =
    commandKind === "workflow" ? "workflow_receipt" : "mcp_result";
  const workflowSummary = result.workflowRef
    ? ` workflow ${result.workflowRef}`
    : "";
  const contentSummary = summarizeMcpContent(result.contentText);

  return {
    artifacts: [
      {
        ...createCommandArtifact(
          commandId,
          artifactKind,
          commandKind === "workflow"
            ? "Workflow execution receipt"
            : "MCP tool result",
        ),
        metadata: {
          executionId: result.executionId,
          executionState: result.executionState,
          receiptRef: result.receiptRef,
          resourceCount: result.resourceUris?.length ?? 0,
          serverName: result.serverName,
          status: result.status,
          summary: `${result.serverName}.${result.toolName}${workflowSummary} ${result.isError ? "failed" : "completed"}.${contentSummary ? ` ${contentSummary}` : ""}`,
          toolName: result.toolName,
          traceId: result.traceId,
          workflowRef: result.workflowRef,
        },
        uri: `valoride://build-mode/commands/${encodeURIComponent(commandId)}/${artifactKind}/${encodeURIComponent(
          `${result.serverName}.${result.toolName}`,
        )}`,
      },
    ],
    output: {
      buildModeStatus,
      queued: false,
      resourceUris: result.resourceUris,
      serverName: result.serverName,
      taskId,
      toolName: result.toolName,
      workflowRef: result.workflowRef,
    },
    stdout: `${label} ${result.isError ? "failed" : "completed"} via ${result.serverName}.${result.toolName}.${contentSummary ? ` ${contentSummary}` : ""}`,
    tool: {
      capabilityId: "mcp.tool",
      kind: "mcp",
      label: "Build Mode MCP workflow runner",
    },
  };
};

const summarizeMcpContent = (contentText: string | undefined): string => {
  const normalized = contentText?.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }
  return normalized.length > 180
    ? `${normalized.slice(0, 177).trimEnd()}...`
    : normalized;
};

const toBrowserVerificationOutput = (
  commandId: string,
  taskId: string | undefined,
  label: string,
  verification: BuildModeBrowserVerificationResult,
) => {
  const consoleErrorCount = verification.consoleErrorCount ?? 0;
  const buildModeStatus: BuildModeCommandStatus =
    verification.status === "failed" || consoleErrorCount > 0
      ? "failed"
      : "succeeded";
  const currentUrl = verification.currentUrl ?? "unknown";
  const screenshotUri =
    verification.screenshotUri ??
    `valoride://build-mode/commands/${encodeURIComponent(commandId)}/browser_screenshot`;
  const consoleLogUri =
    verification.consoleLogUri ??
    `valoride://build-mode/commands/${encodeURIComponent(commandId)}/browser_console`;

  return {
    artifacts: [
      {
        ...createCommandArtifact(
          commandId,
          "browser_screenshot",
          "Browser verification screenshot",
        ),
        metadata: {
          screenshotCaptured: Boolean(
            verification.screenshot || verification.screenshotUri,
          ),
          summary: `Captured ${currentUrl}.`,
        },
        uri: screenshotUri,
      },
      {
        ...createCommandArtifact(
          commandId,
          "browser_console",
          "Browser console log",
        ),
        metadata: {
          consoleErrorCount,
          summary: `${consoleErrorCount} console errors captured at ${currentUrl}.`,
        },
        uri: consoleLogUri,
      },
    ],
    output: {
      buildModeStatus,
      consoleErrorCount,
      currentUrl,
      queued: false,
      taskId,
    },
    stdout: `${label} completed for ${currentUrl} with ${consoleErrorCount} console errors.`,
    tool: {
      capabilityId: "browser.automation",
      kind: "browser",
      label: "Build Mode browser verifier",
    },
  };
};

const toQueuedSafeEditOutput = (
  commandId: string,
  taskId: string | undefined,
  label: string,
  kind: "filesystem" | "psr",
  toolLabel: string,
) => ({
  artifacts: [
    createCommandArtifact(commandId, "file_write", "File write receipt"),
  ],
  output: {
    buildModeStatus: "queued",
    queued: true,
    taskId,
  },
  stdout: `${label} queued for guarded edit handling.`,
  tool: {
    capabilityId: kind === "psr" ? "psr.edit" : "filesystem.write",
    kind,
    label: toolLabel,
  },
});

const toQueuedCheckpointOutput = (
  commandId: string,
  taskId: string | undefined,
  label: string,
) => ({
  artifacts: [
    createCommandArtifact(commandId, "checkpoint", "Checkpoint receipt"),
  ],
  output: {
    buildModeStatus: "queued",
    queued: true,
    taskId,
  },
  stdout: `${label} queued for checkpoint handling.`,
  tool: {
    capabilityId: "checkpoint.manage",
    kind: "checkpoint",
    label: "Build Mode checkpoint manager",
  },
});

const toCheckpointExecutionOutput = (
  commandId: string,
  taskId: string | undefined,
  label: string,
  result: BuildModeCheckpointExecutionResult,
) => {
  const succeeded =
    result.action === "create"
      ? Boolean(result.checkpointHash)
      : result.restored === true;
  const buildModeStatus: BuildModeCommandStatus = succeeded
    ? "succeeded"
    : "failed";
  const actionLabel =
    result.action === "create" ? "created" : "restored workspace to";
  const checkpointRef =
    result.checkpointRef ?? result.checkpointHash ?? "unknown checkpoint";
  const warningSummary = result.warnings?.length
    ? ` Warnings: ${result.warnings.join(", ")}.`
    : "";

  return {
    artifacts: [
      {
        ...createCommandArtifact(commandId, "checkpoint", "Checkpoint receipt"),
        metadata: {
          checkpointAction: result.action,
          checkpointHash: result.checkpointHash,
          checkpointRef,
          workspaceRoot: result.workspaceRoot,
          summary:
            result.action === "create"
              ? `Checkpoint ${checkpointRef} created at ${result.checkpointHash ?? "unknown hash"}.`
              : `Workspace restored to checkpoint ${checkpointRef}.`,
        },
        uri: `valoride://build-mode/commands/${encodeURIComponent(commandId)}/checkpoint/${encodeURIComponent(
          result.checkpointHash ?? checkpointRef,
        )}`,
      },
    ],
    output: {
      buildModeStatus,
      checkpointAction: result.action,
      checkpointHash: result.checkpointHash,
      checkpointRef,
      queued: false,
      restored: result.restored,
      taskId,
      workspaceRoot: result.workspaceRoot,
    },
    stdout: `${label} ${actionLabel} ${checkpointRef}${result.checkpointHash ? ` (${result.checkpointHash})` : ""}.${warningSummary}`,
    tool: {
      capabilityId: "checkpoint.manage",
      kind: "checkpoint",
      label: "Build Mode checkpoint manager",
    },
  };
};

const toSafeEditOutput = (
  commandId: string,
  taskId: string | undefined,
  label: string,
  result: BuildModeSafeEditExecutionResult,
) => {
  const buildModeStatus: BuildModeCommandStatus =
    result.editsApplied > 0 ? "succeeded" : "failed";
  const skippedSummary = result.skipped?.length
    ? ` Skipped: ${result.skipped
        .map((item) => `${item.index}:${item.reason}`)
        .join(", ")}.`
    : "";
  const warningSummary = result.warnings?.length
    ? ` Warnings: ${result.warnings.join(", ")}.`
    : "";

  return {
    artifacts: [
      {
        ...createCommandArtifact(
          commandId,
          "file_write",
          "Precision edit receipt",
        ),
        metadata: {
          bytesDelta: result.bytesDelta ?? 0,
          editsApplied: result.editsApplied,
          editsRequested: result.editsRequested,
          filePath: result.filePath,
          postHash: result.postHash,
          summary: `${result.editsApplied}/${result.editsRequested} edits applied to ${result.filePath}.`,
        },
        uri:
          result.artifactUri ??
          `valoride://build-mode/commands/${encodeURIComponent(commandId)}/file_write`,
      },
    ],
    output: {
      buildModeStatus,
      bytesDelta: result.bytesDelta ?? 0,
      editsApplied: result.editsApplied,
      editsRequested: result.editsRequested,
      filePath: result.filePath,
      queued: false,
      taskId,
    },
    stdout: `${label} applied ${result.editsApplied}/${result.editsRequested} edits to ${result.filePath}.${skippedSummary}${warningSummary}`,
    tool: {
      capabilityId: "psr.edit",
      kind: "psr",
      label: "Build Mode precision edit runner",
    },
  };
};

const createCommandArtifact = (
  commandId: string,
  kind: BuildModeEvidenceArtifactKind,
  title: string,
) => ({
  kind,
  title,
  uri: `valoride://build-mode/commands/${encodeURIComponent(commandId)}/${kind}`,
});

const toBuildModeEvidenceArtifacts = (
  result: AgenticCommandResult,
  receiptId: string,
  createdAt: string,
): BuildModeEvidenceArtifact[] | undefined => {
  if (!result.artifacts?.length) {
    return undefined;
  }
  return result.artifacts.map((artifact, index) => ({
    id: `${receiptId}-artifact-${index + 1}`,
    kind: toBuildModeArtifactKind(artifact.kind),
    title: artifact.title ?? `${result.tool.label} artifact ${index + 1}`,
    uri: artifact.uri,
    commandId: result.commandId,
    receiptId,
    summary:
      typeof artifact.metadata?.summary === "string"
        ? artifact.metadata.summary
        : undefined,
    metadata: toBuildModeArtifactMetadata(artifact.kind, artifact.metadata),
    createdAt,
  }));
};

const toBuildModeArtifactMetadata = (
  kind: string | undefined,
  metadata: Record<string, unknown> | undefined,
): BuildModeEvidenceArtifact["metadata"] | undefined => {
  if (!metadata) {
    return undefined;
  }
  if (kind === "workflow_receipt") {
    return {
      executionId: toMetadataPrimitive(metadata.executionId),
      executionState: toMetadataPrimitive(metadata.executionState),
      nextRunAt: toMetadataPrimitive(metadata.nextRunAt),
      receiptRef: toMetadataPrimitive(metadata.receiptRef),
      schedule: toMetadataPrimitive(metadata.schedule),
      scheduleId: toMetadataPrimitive(metadata.scheduleId),
      status: toMetadataPrimitive(metadata.status),
      storageUri: toMetadataPrimitive(metadata.storageUri),
      traceId: toMetadataPrimitive(metadata.traceId),
      workflowCommandId: toMetadataPrimitive(metadata.workflowCommandId),
      workflowRef: toMetadataPrimitive(metadata.workflowRef),
    };
  }
  if (kind === "connector_data") {
    return {
      connectorId: toMetadataPrimitive(metadata.connectorId),
      connectorName: toMetadataPrimitive(metadata.connectorName),
      dataClass: toMetadataPrimitive(metadata.dataClass),
      queryRef: toMetadataPrimitive(metadata.queryRef),
      receiptRef: toMetadataPrimitive(metadata.receiptRef),
      recordCount: toMetadataPrimitive(metadata.recordCount),
      resourceUri: toMetadataPrimitive(metadata.resourceUri),
      scopeRef: toMetadataPrimitive(metadata.scopeRef),
      status: toMetadataPrimitive(metadata.status),
      traceId: toMetadataPrimitive(metadata.traceId),
    };
  }
  if (kind === "final_report") {
    return {
      byteSize: toMetadataPrimitive(metadata.byteSize),
      reportTitle: toMetadataPrimitive(metadata.reportTitle),
      taskId: toMetadataPrimitive(metadata.taskId),
    };
  }
  if (kind === "swarm_handoff") {
    return {
      handoffId: toMetadataPrimitive(metadata.handoffId),
      runtimeId: toMetadataPrimitive(metadata.runtimeId),
      status: toMetadataPrimitive(metadata.status),
      swarmRole: toMetadataPrimitive(metadata.swarmRole),
      taskId: toMetadataPrimitive(metadata.taskId),
      traceId: toMetadataPrimitive(metadata.traceId),
    };
  }
  if (kind !== "checkpoint") {
    return undefined;
  }
  return {
    checkpointAction: toMetadataPrimitive(metadata.checkpointAction),
    checkpointHash: toMetadataPrimitive(metadata.checkpointHash),
    checkpointRef: toMetadataPrimitive(metadata.checkpointRef),
    workspaceRoot: toMetadataPrimitive(metadata.workspaceRoot),
  };
};

const toMetadataPrimitive = (
  value: unknown,
): string | number | boolean | undefined => {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  return undefined;
};

const stableHash = (value: string): string => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
};

const toBuildModeArtifactKind = (
  kind: string | undefined,
): BuildModeEvidenceArtifactKind => {
  switch (kind) {
    case "browser_console":
    case "browser_screenshot":
    case "checkpoint":
    case "command_stdout":
    case "connector_data":
    case "final_report":
    case "file_write":
    case "mcp_result":
    case "swarm_handoff":
    case "workflow_receipt":
      return kind;
    default:
      return "command_stdout";
  }
};

const toBuildModeCommandStatus = (
  status: AgenticCommandResult["status"],
  approved: boolean,
  result?: AgenticCommandResult,
): BuildModeCommandStatus => {
  if (status === "success") {
    return getBuildModeStatusOverride(result) ?? "queued";
  }
  if (status === "queued") {
    return getBuildModeStatusOverride(result) ?? "queued";
  }
  if (status === "approval-required") {
    return "approval-required";
  }
  if (status === "rejected") {
    return "rejected";
  }
  return "failed";
};

const getBuildModeStatusOverride = (
  result: AgenticCommandResult | undefined,
): BuildModeCommandStatus | undefined => {
  const output = result?.output;
  if (!output || typeof output !== "object" || Array.isArray(output)) {
    return undefined;
  }
  const status = (output as Record<string, unknown>).buildModeStatus;
  return isBuildModeCommandStatus(status) ? status : undefined;
};

const isBuildModeCommandStatus = (
  value: unknown,
): value is BuildModeCommandStatus =>
  value === "queued" ||
  value === "approval-required" ||
  value === "running" ||
  value === "succeeded" ||
  value === "failed" ||
  value === "rejected";

const applyPolicyToRequest = (
  request: BuildModeCommandRequest,
  policy: BuildModeCommandPolicyEvaluation,
): BuildModeCommandRequest => ({
  ...request,
  command: {
    ...request.command,
    command: policy.redactedCommand,
    requiresApproval:
      request.command.requiresApproval ||
      policy.decision === "approval-required",
  },
});

const createPolicyRejectedResult = (
  request: BuildModeCommandRequest,
  policy: BuildModeCommandPolicyEvaluation,
  now: () => Date,
): AgenticCommandResult => {
  const timestamp = now().toISOString();
  const capabilityId =
    request.command.capabilityId || commandKindCapability[request.command.kind];

  return {
    audit: {
      approved: false,
      capabilityId,
      completedAt: timestamp,
      correlationId: request.taskId,
      requiresApproval: false,
      source: "local",
      startedAt: timestamp,
    },
    commandId: request.command.id,
    elapsedMs: 0,
    error: {
      code: "ERR_BUILD_MODE_POLICY_REJECTED",
      message: policy.reasons.join(" "),
    },
    status: "rejected",
    tool: {
      capabilityId,
      label: "Build Mode command policy",
    },
  };
};

const appendPolicySummary = (
  summary: string,
  policy?: BuildModeCommandPolicyEvaluation,
): string => {
  const redactedSummary = redactBuildModeEvidenceText(summary);
  if (!policy?.reasons.length) {
    return redactedSummary;
  }
  return `${redactedSummary} Policy: ${policy.reasons.map(redactBuildModeEvidenceText).join(" ")}`;
};

const redactApprovalInRequest = (
  request: BuildModeCommandRequest,
): BuildModeCommandRequest => {
  if (!request.approval) {
    return request;
  }
  return {
    ...request,
    approval: {
      ...request.approval,
      reason: redactBuildModeEvidenceText(request.approval.reason),
    },
  };
};

const redactAgenticCommandResult = (
  result: AgenticCommandResult,
): AgenticCommandResult => ({
  ...result,
  audit: result.audit.approvalReason
    ? {
        ...result.audit,
        approvalReason: redactBuildModeEvidenceText(
          result.audit.approvalReason,
        ),
      }
    : result.audit,
  artifacts: result.artifacts?.map((artifact) => ({
    ...artifact,
    metadata: redactRecord(artifact.metadata),
    title: artifact.title
      ? redactBuildModeEvidenceText(artifact.title)
      : artifact.title,
  })),
  error: result.error
    ? {
        ...result.error,
        message: redactBuildModeEvidenceText(result.error.message),
      }
    : result.error,
  output: redactUnknown(result.output),
  stderr:
    result.stderr !== undefined
      ? redactBuildModeEvidenceText(result.stderr)
      : result.stderr,
  stdout:
    result.stdout !== undefined
      ? redactBuildModeEvidenceText(result.stdout)
      : result.stdout,
});

const redactRecord = (
  record: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined =>
  record
    ? Object.fromEntries(
        Object.entries(record).map(([key, value]) => [
          key,
          redactUnknown(value),
        ]),
      )
    : undefined;

const redactUnknown = (value: unknown): unknown => {
  if (typeof value === "string") {
    return redactBuildModeEvidenceText(value);
  }
  if (Array.isArray(value)) {
    return value.map(redactUnknown);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        redactUnknown(item),
      ]),
    );
  }
  return value;
};

const redactBuildModeEvidenceText = (value: string): string =>
  redactCommandSecrets(value);
