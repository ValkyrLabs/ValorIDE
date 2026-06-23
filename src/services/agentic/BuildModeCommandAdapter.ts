import type {
  AppBundle,
  AppBundleDiff,
  BuildModeAgentRuntimeBinding,
  BuildModeApprovalThreshold,
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
  BuildModeSwarmRoleAssignment,
  BuildModeToolPermission,
  GrayMatterContextPack,
  ProviderCredentialRef,
  ProviderRoute,
  Receipt,
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
import {
  type BuildModeConnectorIntentDescriptor,
  parseBuildModeConnectorIntent,
  summarizeBlockedConnectorMutation,
} from "./BuildModeConnectorCommand";
import {
  type BuildModeFinalReportPublication,
  prepareBuildModeFinalReportPublication,
} from "./BuildModeFinalReportPublisher";
import {
  executeBuildModeFileReadCommand,
  parseBuildModeFileReadCommand,
} from "./BuildModeFileReadCommand";
import {
  executeBuildModeFileWriteCommand,
  parseBuildModeFileWriteCommand,
} from "./BuildModeFileWriteCommand";
import { executeBuildModeTerminalCommand } from "./BuildModeTerminalCommand";
import { createBuildModeArtifactContentHash } from "./BuildModeArtifactStore";
import { PathAccess } from "../access/PathAccess";
import fs from "fs";

export interface BuildModeCommandRequest {
  approval?: BuildModeCommandApproval;
  agentRuntimes?: BuildModeAgentRuntimeBinding[];
  autonomyPolicy?: BuildModeAutonomyPolicy;
  browserPreviewUrl?: string;
  command: BuildModeCommand;
  appBundle?: AppBundle;
  commandCatalog?: BuildModeCommand[];
  commandPolicyRules?: BuildModeCommandPolicyRule[];
  commandReceipts?: BuildModeCommandReceipt[];
  checkpoints?: BuildModeCheckpoint[];
  currentConsecutiveCommands?: number;
  creditEstimateId?: string;
  estimatedCredits?: number;
  executionHooks?: BuildModeCommandExecutionHooks;
  executionPlan?: BuildModeExecutionPlanStep[];
  finalReportMarkdown?: string;
  finalReportPublication?: BuildModeFinalReportPublication;
  grayMatterContextPack?: GrayMatterContextPack;
  protectedPaths?: string[];
  promptContext?: BuildModePromptExecutionContext;
  providerCredentials?: ProviderCredentialRef[];
  providerRoute?: ProviderRoute;
  readinessGates?: BuildModeReadinessGate[];
  receipts?: Receipt[];
  requireGrayMatterContext?: boolean;
  scope?: BuildModeScopeContext;
  swarmRoles?: BuildModeSwarmRoleAssignment[];
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
  executeDeploy?: (
    request: BuildModeCommandRequest,
  ) => Promise<BuildModeDeployExecutionResult> | BuildModeDeployExecutionResult;
  executeFileRead?: (
    request: BuildModeCommandRequest,
  ) =>
    | Promise<BuildModeFileReadExecutionResult>
    | BuildModeFileReadExecutionResult;
  generateAppBundleDiff?: (
    request: BuildModeCommandRequest,
  ) =>
    | Promise<BuildModeAppBundleDiffResult>
    | BuildModeAppBundleDiffResult;
  compileGrayMatterContext?: (
    request: BuildModeCommandRequest,
  ) =>
    | Promise<BuildModeGrayMatterContextCompileResult>
    | BuildModeGrayMatterContextCompileResult;
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
  consoleLogByteSize?: number;
  consoleLogContentHash?: string;
  consoleErrorCount?: number;
  consoleLogUri?: string;
  currentUrl?: string;
  logs?: string;
  screenshot?: string;
  screenshotByteSize?: number;
  screenshotContentHash?: string;
  screenshotUri?: string;
  status?: "failed" | "passed";
}

export interface BuildModeTerminalExecutionResult {
  artifactUri?: string;
  background?: boolean;
  byteSize?: number;
  commandHash?: string;
  completed?: boolean;
  contentHash?: string;
  exitCode?: number;
  stderr?: string;
  stdout?: string;
  timedOut?: boolean;
}

export interface BuildModeDeployExecutionResult {
  artifactUri?: string;
  byteSize?: number;
  commandHash?: string;
  contentHash?: string;
  deployId?: string;
  draft: boolean;
  environment?: string;
  exitCode?: number;
  isError?: boolean;
  previewUrl?: string;
  stderr?: string;
  stdout?: string;
  target?: string;
  traceId?: string;
}

export interface BuildModeFileReadExecutionResult {
  artifactUri?: string;
  byteSize: number;
  contentHash: string;
  filePath: string;
  lineCount?: number;
  sourceContentHash?: string;
  truncated?: boolean;
}

export interface BuildModeAppBundleDiffResult {
  artifactUri?: string;
  byteSize?: number;
  contentHash?: string;
  diff: AppBundleDiff;
  isError?: boolean;
  summary?: string;
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
  contentHash?: string;
  memoryError?: string;
  memoryId?: string;
  memoryStatus?: "failed" | "queued" | "written";
  reportTitle?: string;
  summary?: string;
}

export interface BuildModeGrayMatterContextCompileResult {
  answerPolicy?: string;
  artifactUri?: string;
  byteSize?: number;
  contentHash?: string;
  contextPackId: string;
  invariantPreflightStatus?: string;
  isError?: boolean;
  memoryEntryCount?: number;
  preflightReceiptId?: string;
  retrievalReceiptCount?: number;
  retrievalStatus?: string;
  retrievalTraceId?: string;
  source?: string;
  summary?: string;
}

export interface BuildModeMcpExecutionResult {
  contentText?: string;
  execModuleId?: string;
  executionId?: string;
  executionState?: string;
  isError?: boolean;
  resourceUris?: string[];
  receiptRef?: string;
  sensitiveActionClasses?: string[];
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
  scheduler?: "valkyrai-cron";
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
  inspect: "filesystem.read",
  mcp: "mcp.tool",
  report: "graymatter.memory",
  swarm: "swarm.command",
  test: "terminal.execute",
  verify: "browser.automation",
  workflow: "workflow.execute",
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
    ...(request.providerRoute ? { providerRoute: request.providerRoute } : {}),
    ...(request.finalReportMarkdown
      ? createFinalReportCommandPayload(request)
      : {}),
    taskId: request.taskId,
  },
  requiresApproval: request.command.requiresApproval,
  source: "local",
});

const createFinalReportCommandPayload = (
  request: BuildModeCommandRequest,
): {
  finalReportByteSize: number;
  finalReportContentHash: string;
  finalReportMarkdown: string;
  finalReportTitle: string;
} => {
  const publication =
    request.finalReportPublication ??
    prepareBuildModeFinalReportPublication(
      request.finalReportMarkdown ?? "",
      request.command.label,
    );
  return {
    finalReportByteSize: publication.byteSize,
    finalReportContentHash: publication.contentHash,
    finalReportMarkdown: publication.markdown,
    finalReportTitle: publication.title,
  };
};

const prepareFinalReportInRequest = (
  request: BuildModeCommandRequest,
): BuildModeCommandRequest => {
  if (!request.finalReportMarkdown) {
    return request;
  }
  const finalReportPublication =
    request.finalReportPublication ??
    prepareBuildModeFinalReportPublication(
      request.finalReportMarkdown,
      request.command.label,
    );
  return {
    ...request,
    finalReportMarkdown: finalReportPublication.markdown,
    finalReportPublication,
  };
};

export const queueBuildModeCommand = async (
  request: BuildModeCommandRequest,
  now: () => Date = () => new Date(),
): Promise<BuildModeCommandQueueResult> => {
  const requestWithPreparedFinalReport = prepareFinalReportInRequest(request);
  const requestWithRedactedApproval = redactApprovalInRequest(
    requestWithPreparedFinalReport,
  );
  const policy = evaluateBuildModeCommandPolicy(request.command, {
    approval: requestWithRedactedApproval.approval,
    approvalEvaluatedAt: requestWithRedactedApproval.approval
      ? now()
      : undefined,
    agentRuntimes: request.agentRuntimes,
    autonomyPolicy: request.autonomyPolicy,
    browserPreviewUrl: request.browserPreviewUrl,
    checkpoints: request.checkpoints,
    commandPolicyRules: request.commandPolicyRules,
    commandReceipts: request.commandReceipts,
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
    swarmRoles: request.swarmRoles,
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
    if (
      request.command.kind === "deploy" &&
      request.executionHooks?.executeDeploy
    ) {
      const deploy = await request.executionHooks.executeDeploy(guardedRequest);
      return toDeployExecutionOutput(
        command.id,
        command.correlationId,
        request.command.label,
        request.command.command,
        deploy,
      );
    }
    if (request.executionHooks?.executeTerminalCommand) {
      const execution =
        await request.executionHooks.executeTerminalCommand(guardedRequest);
      return toTerminalExecutionOutput(
        command.id,
        command.correlationId,
        request.command.label,
        request.command.command,
        execution,
      );
    }
    const nativeExecution =
      await tryExecuteNativeTerminalCommand(guardedRequest);
    if (nativeExecution) {
      return toTerminalExecutionOutput(
        command.id,
        command.correlationId,
        request.command.label,
        request.command.command,
        nativeExecution,
      );
    }
    return toQueuedTerminalOutput(
      command.id,
      command.correlationId,
      request.command.label,
    );
  });
  bus.registerHandler("browser.automation", async (command) => {
    const browserMode = isBuildModePreviewOpenCommand(request.command.command)
      ? "preview"
      : "verification";
    if (request.executionHooks?.executeBrowserVerification) {
      const verification =
        await request.executionHooks.executeBrowserVerification(guardedRequest);
      return toBrowserVerificationOutput(
        command.id,
        command.correlationId,
        request.command.label,
        verification,
        browserMode,
      );
    }
    return toQueuedBrowserVerificationOutput(
      command.id,
      command.correlationId,
      request.command.label,
      browserMode,
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
        guardedRequest,
      );
    }
    return toQueuedMcpOutput(
      command.id,
      command.correlationId,
      request.command.label,
    );
  });
  bus.registerHandler("workflow.execute", async (command) => {
    if (request.executionHooks?.executeMcpTool) {
      const workflowResult =
        await request.executionHooks.executeMcpTool(guardedRequest);
      return toMcpExecutionOutput(
        command.id,
        command.correlationId,
        request.command.label,
        request.command.kind,
        workflowResult,
        guardedRequest,
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
    const connectorIntent = parseBuildModeConnectorIntent(
      request.command.command,
      request.scope,
    );
    if (connectorIntent?.intent === "mutation") {
      return toBlockedConnectorMutationOutput(
        command.id,
        command.correlationId,
        request.command.label,
        connectorIntent,
      );
    }
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
  bus.registerHandler("filesystem.read", async (command) => {
    if (isBuildModeAppBundleDiffCommand(request)) {
      if (request.executionHooks?.generateAppBundleDiff) {
        const diffResult =
          await request.executionHooks.generateAppBundleDiff(guardedRequest);
        return toAppBundleDiffOutput(
          command.id,
          command.correlationId,
          request.command.label,
          diffResult,
        );
      }
      const diffResult = createAppBundleDiffResult(request.appBundle);
      if (diffResult) {
        return toAppBundleDiffOutput(
          command.id,
          command.correlationId,
          request.command.label,
          diffResult,
        );
      }
      return toQueuedAppBundleDiffOutput(
        command.id,
        command.correlationId,
        request.command.label,
      );
    }
    if (request.executionHooks?.executeFileRead) {
      const readResult =
        await request.executionHooks.executeFileRead(guardedRequest);
      return toFileReadOutput(
        command.id,
        command.correlationId,
        request.command.label,
        readResult,
      );
    }
    const nativeReadResult = await tryExecuteNativeFileRead(guardedRequest);
    if (nativeReadResult) {
      return toFileReadOutput(
        command.id,
        command.correlationId,
        request.command.label,
        nativeReadResult,
      );
    }
    return toQueuedFileReadOutput(
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
        "psr",
        "Build Mode precision edit runner",
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
        "filesystem",
        "Build Mode file writer",
      );
    }
    const nativeWriteResult = await tryExecuteNativeFileWrite(guardedRequest);
    if (nativeWriteResult) {
      return toSafeEditOutput(
        command.id,
        command.correlationId,
        request.command.label,
        nativeWriteResult,
        "filesystem",
        "Build Mode file writer",
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
    if (isBuildModeFinalReportCommand(request)) {
      if (!request.executionHooks?.publishFinalReport) {
        return toQueuedFinalReportOutput(
          command.id,
          command.correlationId,
          request.command.label,
        );
      }
      const reportResult =
        await request.executionHooks.publishFinalReport(guardedRequest);
      return toFinalReportPublishOutput(
        command.id,
        command.correlationId,
        request.command.label,
        reportResult,
        guardedRequest.finalReportPublication,
      );
    }
    if (request.executionHooks?.compileGrayMatterContext) {
      const contextResult =
        await request.executionHooks.compileGrayMatterContext(guardedRequest);
      return toGrayMatterContextCompileOutput(
        command.id,
        command.correlationId,
        request.command.label,
        contextResult,
      );
    }
    const contextResult = createGrayMatterContextCompileResult(
      request.grayMatterContextPack,
    );
    if (contextResult) {
      return toGrayMatterContextCompileOutput(
        command.id,
        command.correlationId,
        request.command.label,
        contextResult,
      );
    }
    return toQueuedGrayMatterContextCompileOutput(
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

const isBuildModeFinalReportCommand = (
  request: BuildModeCommandRequest,
): boolean =>
  request.command.kind === "report" ||
  /\breport:publish\b/i.test(request.command.command) ||
  Boolean(request.finalReportMarkdown);

const isBuildModeAppBundleDiffCommand = (
  request: BuildModeCommandRequest,
): boolean => /^app-bundle-diff:/i.test(request.command.command);

const createGrayMatterContextCompileResult = (
  contextPack: GrayMatterContextPack | undefined,
): BuildModeGrayMatterContextCompileResult | undefined => {
  if (!contextPack) {
    return undefined;
  }
  const payload = JSON.stringify({
    answerPolicy: contextPack.answerPolicy,
    contextPackId: contextPack.id,
    invariantPreflightStatus: contextPack.invariantPreflightStatus,
    memoryEntryIds: contextPack.memoryEntryIds,
    preflightReceiptId: contextPack.preflightReceiptId,
    retrievalReceiptIds: contextPack.retrievalReceiptIds,
    retrievalStatus: contextPack.retrievalStatus,
    retrievalTraceId: contextPack.retrievalTraceId,
    source: contextPack.source,
  });
  return {
    answerPolicy: contextPack.answerPolicy,
    byteSize: Buffer.byteLength(payload, "utf8"),
    contentHash: createBuildModeArtifactContentHash(payload),
    contextPackId: contextPack.id,
    invariantPreflightStatus: contextPack.invariantPreflightStatus,
    memoryEntryCount: contextPack.memoryEntryIds.length,
    preflightReceiptId: contextPack.preflightReceiptId,
    retrievalReceiptCount: contextPack.retrievalReceiptIds.length,
    retrievalStatus: contextPack.retrievalStatus,
    retrievalTraceId: contextPack.retrievalTraceId,
    source: contextPack.source,
    summary: `Context pack ${contextPack.id} compiled from ${contextPack.retrievalReceiptIds.length} retrieval receipt${contextPack.retrievalReceiptIds.length === 1 ? "" : "s"}.`,
  };
};

const createAppBundleDiffResult = (
  appBundle: AppBundle | undefined,
): BuildModeAppBundleDiffResult | undefined => {
  if (!appBundle?.artifacts?.length) {
    return undefined;
  }
  const addedArtifacts = appBundle.artifacts
    .filter((artifact) => artifact.kind !== "editable")
    .map((artifact) => redactCommandSecrets(artifact.path));
  const changedArtifacts = appBundle.artifacts
    .filter((artifact) => artifact.kind === "editable")
    .map((artifact) => redactCommandSecrets(artifact.path));
  const diff: AppBundleDiff = {
    id: `app-bundle-diff-${redactCommandSecrets(appBundle.id)}`,
    title: `${redactCommandSecrets(appBundle.name)} generated artifact diff`,
    appBundleId: redactCommandSecrets(appBundle.id),
    generatedAt: appBundle.createdAt,
    addedArtifacts,
    changedArtifacts,
    removedArtifacts: [],
    receiptIds: (appBundle.receiptIds ?? []).map(redactCommandSecrets),
    evidenceArtifactIds: [],
  };
  const payload = JSON.stringify(diff);
  return {
    byteSize: Buffer.byteLength(payload, "utf8"),
    contentHash: createBuildModeArtifactContentHash(payload),
    diff,
    summary: `Generated app bundle diff ${diff.id} for ${diff.appBundleId}.`,
  };
};

const tryExecuteNativeFileRead = async (
  request: BuildModeCommandRequest,
): Promise<BuildModeFileReadExecutionResult | undefined> => {
  const workspaceRoot = getBuildModeWorkspaceRoot(request);
  const parsed = parseBuildModeFileReadCommand(request.command.command);
  if (!workspaceRoot || !parsed) {
    return undefined;
  }
  const result = await executeBuildModeFileReadCommand({
    command: parsed,
    pathAccess: new PathAccess({ workspaceRoot }),
    workspaceRoot,
  });
  return {
    byteSize: result.byteSize,
    contentHash: result.contentHash,
    filePath: result.filePath,
    lineCount: result.lineCount,
    truncated: result.truncated,
  };
};

const tryExecuteNativeFileWrite = async (
  request: BuildModeCommandRequest,
): Promise<BuildModeSafeEditExecutionResult | undefined> => {
  const workspaceRoot = getBuildModeWorkspaceRoot(request);
  const parsed = parseBuildModeFileWriteCommand(request.command.command);
  if (!workspaceRoot || !parsed) {
    return undefined;
  }
  const result = await executeBuildModeFileWriteCommand({
    command: parsed,
    pathAccess: new PathAccess({
      additionalDenyPaths: [
        ...(request.protectedPaths ?? []),
        ...(request.command.protectedPaths ?? []),
      ],
      workspaceRoot,
    }),
    workspaceRoot,
  });
  return {
    bytesDelta: result.bytesDelta,
    editsApplied: 1,
    editsRequested: 1,
    filePath: result.filePath,
    postHash: result.postHash,
  };
};

const getBuildModeWorkspaceRoot = (
  request: BuildModeCommandRequest,
): string | undefined =>
  request.workspaceRoot ?? request.scope?.workspaceRoot;

const tryExecuteNativeTerminalCommand = async (
  request: BuildModeCommandRequest,
): Promise<BuildModeTerminalExecutionResult | undefined> => {
  if (request.command.kind !== "test" && request.command.kind !== "build") {
    return undefined;
  }
  const workspaceRoot = getBuildModeWorkspaceRoot(request);
  if (!workspaceRoot || !fs.existsSync(workspaceRoot)) {
    return undefined;
  }
  return executeBuildModeTerminalCommand({
    command: request.command.command,
    workspaceRoot,
  });
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
    result.error?.message ??
    result.stdout ??
    result.stderr ??
    `${result.tool.label} ${status}.`;
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
    requiredApprovalThreshold:
      policy?.requiredApprovalThreshold &&
      policy.requiredApprovalThreshold !== "none"
        ? policy.requiredApprovalThreshold
        : undefined,
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
    case "mcp":
    case "verify":
    case "workflow":
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

const toQueuedFileReadOutput = (
  commandId: string,
  taskId: string | undefined,
  label: string,
) => ({
  artifacts: [
    createCommandArtifact(commandId, "command_stdout", "File read receipt"),
  ],
  output: {
    buildModeStatus: "queued",
    queued: true,
    taskId,
  },
  stdout: `${label} queued for scoped workspace file inspection.`,
  tool: {
    capabilityId: "filesystem.read",
    kind: "filesystem",
    label: "Build Mode file reader",
  },
});

const toQueuedAppBundleDiffOutput = (
  commandId: string,
  taskId: string | undefined,
  label: string,
) => ({
  artifacts: [
    createCommandArtifact(
      commandId,
      "app_bundle_diff",
      "App bundle diff receipt",
    ),
  ],
  output: {
    buildModeStatus: "queued",
    queued: true,
    taskId,
  },
  stdout: `${label} queued for app bundle diff generation.`,
  tool: {
    capabilityId: "filesystem.read",
    kind: "filesystem",
    label: "Build Mode app bundle diff generator",
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

const toQueuedGrayMatterContextCompileOutput = (
  commandId: string,
  taskId: string | undefined,
  label: string,
) => ({
  artifacts: [
    createCommandArtifact(
      commandId,
      "graymatter_context",
      "GrayMatter context compile receipt",
    ),
  ],
  output: {
    buildModeStatus: "queued",
    queued: true,
    taskId,
  },
  stdout: `${label} queued for GrayMatter context compilation.`,
  tool: {
    capabilityId: "graymatter.memory",
    kind: "graymatter",
    label: "Build Mode GrayMatter context compiler",
  },
});

const toGrayMatterContextCompileOutput = (
  commandId: string,
  taskId: string | undefined,
  label: string,
  result: BuildModeGrayMatterContextCompileResult,
) => {
  const contextPackId = redactCommandSecrets(result.contextPackId);
  const summary =
    (result.summary ? redactCommandSecrets(result.summary) : undefined) ??
    `Context pack ${contextPackId} compiled.`;
  const buildModeStatus: BuildModeCommandStatus = result.isError
    ? "failed"
    : "succeeded";
  const contentPayload = JSON.stringify({
    answerPolicy: result.answerPolicy,
    contextPackId,
    invariantPreflightStatus: result.invariantPreflightStatus,
    memoryEntryCount: result.memoryEntryCount,
    preflightReceiptId: result.preflightReceiptId,
    retrievalReceiptCount: result.retrievalReceiptCount,
    retrievalStatus: result.retrievalStatus,
    retrievalTraceId: result.retrievalTraceId,
    source: result.source,
  });
  const byteSize =
    result.byteSize ?? Buffer.byteLength(contentPayload, "utf8");
  const contentHash =
    result.contentHash ?? createBuildModeArtifactContentHash(contentPayload);
  return {
    artifacts: [
      {
        ...createCommandArtifact(
          commandId,
          "graymatter_context",
          "GrayMatter context compile receipt",
        ),
        metadata: {
          answerPolicy: result.answerPolicy,
          byteSize,
          contentHash,
          contextPackId,
          invariantPreflightStatus: result.invariantPreflightStatus,
          memoryEntryCount: result.memoryEntryCount,
          preflightReceiptId: result.preflightReceiptId,
          retrievalReceiptCount: result.retrievalReceiptCount,
          retrievalStatus: result.retrievalStatus,
          retrievalTraceId: result.retrievalTraceId,
          source: result.source,
          summary,
        },
        uri:
          result.artifactUri ??
          `valoride://build-mode/commands/${encodeURIComponent(commandId)}/graymatter_context`,
      },
    ],
    output: {
      buildModeStatus,
      byteSize,
      contentHash,
      contextPackId,
      queued: false,
      retrievalStatus: result.retrievalStatus,
      taskId,
    },
    stdout: `${label} ${buildModeStatus === "failed" ? "failed" : "compiled"} ${contextPackId}. ${summary}`,
    tool: {
      capabilityId: "graymatter.memory",
      kind: "graymatter",
      label: "Build Mode GrayMatter context compiler",
    },
  };
};

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
  const connectorId = redactCommandSecrets(result.connectorId);
  const connectorName = result.connectorName
    ? redactCommandSecrets(result.connectorName)
    : undefined;
  const dataClass = redactCommandSecrets(result.dataClass);
  const queryRef = redactCommandSecrets(result.queryRef);
  const receiptRef = result.receiptRef
    ? redactCommandSecrets(result.receiptRef)
    : undefined;
  const resourceUri = result.resourceUri
    ? redactCommandSecrets(result.resourceUri)
    : undefined;
  const scopeRef = result.scopeRef
    ? redactCommandSecrets(result.scopeRef)
    : undefined;
  const traceId = result.traceId
    ? redactCommandSecrets(result.traceId)
    : undefined;
  const artifactUri = result.artifactUri
    ? redactCommandSecrets(result.artifactUri)
    : undefined;
  const connectorStatus =
    result.status ?? (result.isError ? "failed" : "authorized");
  const hasReceiptProof = Boolean(receiptRef);
  const evidenceStatus =
    connectorStatus === "authorized" && !hasReceiptProof
      ? "partial"
      : connectorStatus;
  const buildModeStatus: BuildModeCommandStatus =
    result.isError || evidenceStatus !== "authorized" ? "failed" : "succeeded";
  const recordSummary =
    result.recordCount === undefined
      ? "authorized connector records"
      : `${result.recordCount} authorized connector record${
          result.recordCount === 1 ? "" : "s"
        }`;
  const baseSummary =
    redactConnectorSummary(result.summary) ??
    `${label} read ${recordSummary} from ${connectorName ?? connectorId}.`;
  const summary = hasReceiptProof
    ? baseSummary
    : `${baseSummary} Missing connector receipt proof; attach the external connector receipt to prove record access.`;
  return {
    artifacts: [
      {
        ...createCommandArtifact(commandId, "connector_data", label),
        metadata: {
          connectorId,
          connectorName,
          dataClass,
          queryRef,
          receiptRef,
          recordCount: result.recordCount,
          resourceUri,
          scopeRef,
          status: evidenceStatus,
          summary,
          taskId,
          traceId,
        },
        uri:
          artifactUri ??
          `valoride://build-mode/commands/${encodeURIComponent(commandId)}/connector_data/${encodeURIComponent(
            connectorId,
          )}`,
      },
    ],
    output: {
      buildModeStatus,
      connectorId,
      dataClass,
      queued: false,
      queryRef,
      recordCount: result.recordCount,
      taskId,
    },
    stdout: `${label} ${
      buildModeStatus === "failed" ? "failed" : "completed"
    }. ${summary}`,
    tool: {
      capabilityId: "connector.read",
      kind: "connector",
      label: "Build Mode connector reader",
    },
  };
};

const toBlockedConnectorMutationOutput = (
  commandId: string,
  taskId: string | undefined,
  label: string,
  descriptor: BuildModeConnectorIntentDescriptor,
) => {
  const connectorId = redactCommandSecrets(descriptor.connectorId);
  const connectorName = redactCommandSecrets(descriptor.connectorName);
  const dataClass = redactCommandSecrets(descriptor.dataClass);
  const queryRef = redactCommandSecrets(descriptor.queryRef);
  const receiptRef = descriptor.receiptRef
    ? redactCommandSecrets(descriptor.receiptRef)
    : undefined;
  const resourceUri = descriptor.resourceUri
    ? redactCommandSecrets(descriptor.resourceUri)
    : undefined;
  const scopeRef = descriptor.scopeRef
    ? redactCommandSecrets(descriptor.scopeRef)
    : undefined;
  const traceId = descriptor.traceId
    ? redactCommandSecrets(descriptor.traceId)
    : undefined;
  const summary = summarizeBlockedConnectorMutation(descriptor);
  return {
    artifacts: [
      {
        ...createCommandArtifact(commandId, "connector_data", label),
        metadata: {
          action: descriptor.action,
          connectorId,
          connectorName,
          dataClass,
          queryRef,
          receiptRef,
          resourceUri,
          scopeRef,
          status: "blocked",
          summary,
          taskId,
          traceId,
        },
        summary,
        uri: `valoride://build-mode/commands/${encodeURIComponent(commandId)}/connector_data/${encodeURIComponent(
          connectorId,
        )}/blocked-mutation`,
      },
    ],
    output: {
      buildModeStatus: "rejected",
      connectorId,
      dataClass,
      mutationAction: descriptor.action,
      queued: false,
      queryRef,
      taskId,
    },
    stderr: summary,
    stdout: `${label} blocked. ${summary}`,
    tool: {
      capabilityId: "connector.read",
      kind: "connector",
      label: "Build Mode connector mutation guard",
    },
  };
};

const redactConnectorSummary = (
  summary: string | undefined,
): string | undefined => {
  if (!summary) {
    return undefined;
  }
  return redactCommandSecrets(summary).replace(
    /\b(body|content|messageBody|raw|snippet)\s*[:=]\s*("[^"]*"|'[^']*'|[^.;\n]+)/gi,
    "$1:<redacted-connector-body>",
  );
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
  publication?: BuildModeFinalReportPublication,
) => {
  const reportTitle = result.reportTitle
    ? redactCommandSecrets(result.reportTitle)
    : label;
  const memoryError = result.memoryError
    ? redactCommandSecrets(result.memoryError)
    : undefined;
  const memoryId = result.memoryId
    ? redactCommandSecrets(result.memoryId)
    : undefined;
  const memoryStatus = result.memoryStatus;
  const artifactUri = result.artifactUri
    ? redactCommandSecrets(result.artifactUri)
    : undefined;
  const buildModeStatus: BuildModeCommandStatus =
    memoryStatus === "failed" ? "failed" : "succeeded";
  const summary =
    (result.summary ? redactCommandSecrets(result.summary) : undefined) ??
    `${reportTitle} captured with Build Mode evidence receipts.`;
  const stdoutSuffix =
    buildModeStatus === "failed" && memoryError ? ` ${memoryError}` : "";
  return {
    artifacts: [
      {
        ...createCommandArtifact(commandId, "final_report", "Final report"),
        metadata: {
          byteSize: result.byteSize ?? publication?.byteSize ?? 0,
          contentHash: result.contentHash ?? publication?.contentHash,
          memoryError,
          memoryId,
          memoryStatus,
          reportTitle,
          summary,
          taskId,
        },
        uri:
          artifactUri ??
          `valoride://build-mode/commands/${encodeURIComponent(commandId)}/final_report`,
      },
    ],
    output: {
      buildModeStatus,
      byteSize: result.byteSize ?? publication?.byteSize ?? 0,
      contentHash: result.contentHash ?? publication?.contentHash,
      memoryStatus,
      queued: false,
      taskId,
    },
    stdout: `${label} ${
      buildModeStatus === "failed" ? "failed" : "published"
    }. ${summary}${stdoutSuffix}`,
    tool: {
      capabilityId: "graymatter.memory",
      kind: "graymatter",
      label: "Build Mode final report publisher",
    },
  };
};

const toFileReadOutput = (
  commandId: string,
  taskId: string | undefined,
  label: string,
  result: BuildModeFileReadExecutionResult,
) => {
  const truncatedSummary = result.truncated ? " truncated" : "";
  return {
    artifacts: [
      {
        ...createCommandArtifact(commandId, "command_stdout", "File read receipt"),
        metadata: {
          byteSize: result.byteSize,
          contentHash: result.contentHash,
          filePath: result.filePath,
          lineCount: result.lineCount,
          sourceContentHash: result.sourceContentHash ?? result.contentHash,
          summary: `${label} read ${result.filePath} (${result.byteSize} bytes${truncatedSummary}).`,
          truncated: result.truncated,
        },
        uri:
          result.artifactUri ??
          `valoride://build-mode/commands/${encodeURIComponent(commandId)}/file-read`,
      },
    ],
    output: {
      buildModeStatus: "succeeded",
      byteSize: result.byteSize,
      contentHash: result.contentHash,
      filePath: result.filePath,
      lineCount: result.lineCount,
      sourceContentHash: result.sourceContentHash ?? result.contentHash,
      taskId,
      truncated: result.truncated,
    },
    stdout: `${label} read ${result.filePath} (${result.byteSize} bytes${truncatedSummary}).`,
    tool: {
      capabilityId: "filesystem.read",
      kind: "filesystem",
      label: "Build Mode file reader",
    },
  };
};

const toAppBundleDiffOutput = (
  commandId: string,
  taskId: string | undefined,
  label: string,
  result: BuildModeAppBundleDiffResult,
) => {
  const diff = {
    ...result.diff,
    addedArtifacts: result.diff.addedArtifacts.map(redactCommandSecrets),
    appBundleId: redactCommandSecrets(result.diff.appBundleId),
    changedArtifacts: result.diff.changedArtifacts.map(redactCommandSecrets),
    evidenceArtifactIds: result.diff.evidenceArtifactIds.map(
      redactCommandSecrets,
    ),
    id: redactCommandSecrets(result.diff.id),
    receiptIds: result.diff.receiptIds.map(redactCommandSecrets),
    removedArtifacts: result.diff.removedArtifacts.map(redactCommandSecrets),
    title: redactCommandSecrets(result.diff.title),
  };
  const contentPayload = JSON.stringify(diff);
  const byteSize =
    result.byteSize ?? Buffer.byteLength(contentPayload, "utf8");
  const contentHash =
    result.contentHash ?? createBuildModeArtifactContentHash(contentPayload);
  const buildModeStatus: BuildModeCommandStatus = result.isError
    ? "failed"
    : "succeeded";
  const summary =
    (result.summary ? redactCommandSecrets(result.summary) : undefined) ??
    `Generated app bundle diff ${diff.id}.`;
  const manifestPath = diff.addedArtifacts.find((artifact) =>
    /app-bundle\.json$/i.test(artifact),
  );
  const filePath = manifestPath ?? `${diff.appBundleId}/app-bundle-diff.json`;
  return {
    artifacts: [
      {
        ...createCommandArtifact(commandId, "command_stdout", "App bundle diff receipt"),
        metadata: {
          byteSize,
          contentHash,
          filePath,
          summary,
          truncated: false,
        },
        uri: `valoride://build-mode/commands/${encodeURIComponent(commandId)}/app-bundle-diff-read`,
      },
      {
        ...createCommandArtifact(
          commandId,
          "app_bundle_diff",
          "App bundle diff receipt",
        ),
        metadata: {
          addedArtifactCount: diff.addedArtifacts.length,
          appBundleId: diff.appBundleId,
          byteSize,
          changedArtifactCount: diff.changedArtifacts.length,
          contentHash,
          diffId: diff.id,
          generatedAt: diff.generatedAt,
          removedArtifactCount: diff.removedArtifacts.length,
        },
        summary,
        uri:
          result.artifactUri ??
          `valoride://build-mode/commands/${encodeURIComponent(commandId)}/app_bundle_diff`,
      },
    ],
    output: {
      appBundleId: diff.appBundleId,
      buildModeStatus,
      byteSize,
      contentHash,
      diffId: diff.id,
      queued: false,
      taskId,
    },
    stdout: `${label} ${buildModeStatus === "failed" ? "failed" : "generated"} ${diff.id}. ${summary}`,
    tool: {
      capabilityId: "filesystem.read",
      kind: "filesystem",
      label: "Build Mode app bundle diff generator",
    },
  };
};

const hasBuildModeArtifactIntegrityProof = (
  contentHash: string | undefined,
  byteSize: number | undefined,
): boolean =>
  typeof contentHash === "string" &&
  /^sha256:[a-f0-9]{64}$/.test(contentHash) &&
  typeof byteSize === "number" &&
  byteSize > 0;

const toTerminalExecutionOutput = (
  commandId: string,
  taskId: string | undefined,
  label: string,
  commandText: string,
  execution: BuildModeTerminalExecutionResult,
) => {
  const completed = execution.completed ?? execution.exitCode !== undefined;
  const background = execution.background ?? (!completed && !execution.stderr);
  const stderr = execution.stderr
    ? redactCommandSecrets(execution.stderr)
    : undefined;
  const fallbackStdout = `${label} dispatched through the ValorIDE terminal manager.`;
  const redactedStdout = execution.stdout
    ? redactCommandSecrets(execution.stdout)
    : undefined;
  const stdout = redactedStdout
    ? redactedStdout
    : stderr
      ? undefined
      : fallbackStdout;
  const commandHash =
    execution.commandHash ??
    createBuildModeArtifactContentHash(redactCommandSecrets(commandText));
  const artifactContent = redactedStdout ?? stderr;
  const byteSize =
    execution.byteSize ??
    (artifactContent ? Buffer.byteLength(artifactContent, "utf8") : undefined);
  const contentHash =
    execution.contentHash ??
    (artifactContent
      ? createBuildModeArtifactContentHash(artifactContent)
      : undefined);
  const hasIntegrityProof = hasBuildModeArtifactIntegrityProof(
    contentHash,
    byteSize,
  );
  const terminalClaimedSuccess = completed && execution.exitCode === 0;
  const missingProofFailure = terminalClaimedSuccess && !hasIntegrityProof;
  const buildModeStatus: BuildModeCommandStatus =
    !completed && background
      ? "queued"
      : terminalClaimedSuccess && !missingProofFailure
        ? "succeeded"
        : "failed";
  const resultStdout = missingProofFailure
    ? `${label} failed: terminal stdout integrity proof missing.`
    : stdout;

  return {
    artifacts: [
      {
        ...createCommandArtifact(commandId, "command_stdout", "Command stdout"),
        metadata: {
          background,
          byteSize,
          commandHash,
          completed,
          contentHash,
          exitCode: execution.exitCode,
          stderr,
          timedOut: execution.timedOut,
        },
        uri:
          execution.artifactUri ??
          `valoride://build-mode/commands/${encodeURIComponent(commandId)}/terminal-execution`,
      },
    ],
    output: {
      background,
      buildModeStatus,
      byteSize,
      commandHash,
      completed,
      contentHash,
      exitCode: execution.exitCode,
      queued: buildModeStatus === "queued",
      taskId,
      timedOut: execution.timedOut,
    },
    stderr,
    stdout: resultStdout,
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
  mode: "preview" | "verification" = "verification",
) => ({
  artifacts: [
    createCommandArtifact(
      commandId,
      "browser_screenshot",
      mode === "preview"
        ? "Generated preview screenshot"
        : "Browser verification screenshot",
    ),
    createCommandArtifact(commandId, "browser_console", "Browser console log"),
  ],
  output: {
    buildModeStatus: "queued",
    browserMode: mode,
    queued: true,
    taskId,
  },
  stdout:
    mode === "preview"
      ? `${label} queued to open generated preview.`
      : `${label} queued for browser verification.`,
  tool: {
    capabilityId: "browser.automation",
    kind: "browser",
    label:
      mode === "preview"
        ? "Build Mode generated preview opener"
        : "Build Mode browser verifier",
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

const toDeployExecutionOutput = (
  commandId: string,
  taskId: string | undefined,
  label: string,
  commandText: string,
  result: BuildModeDeployExecutionResult,
) => {
  const stdout = result.stdout ? redactCommandSecrets(result.stdout) : undefined;
  const stderr = result.stderr ? redactCommandSecrets(result.stderr) : undefined;
  const target = result.target ? redactCommandSecrets(result.target) : undefined;
  const environment = result.environment
    ? redactCommandSecrets(result.environment)
    : undefined;
  const deployId = result.deployId
    ? redactCommandSecrets(result.deployId)
    : undefined;
  const previewUrl = result.previewUrl
    ? redactCommandSecrets(result.previewUrl)
    : undefined;
  const traceId = result.traceId ? redactCommandSecrets(result.traceId) : undefined;
  const summary = `${label} ${result.isError ? "failed" : "completed"}${result.draft ? " as draft" : ""}${target ? ` for ${target}` : ""}${environment ? ` in ${environment}` : ""}${previewUrl ? `; preview ${previewUrl}` : ""}.`;
  const artifactContent = stdout ?? stderr;
  const byteSize =
    result.byteSize ??
    (artifactContent ? Buffer.byteLength(artifactContent, "utf8") : undefined);
  const contentHash =
    result.contentHash ??
    (artifactContent
      ? createBuildModeArtifactContentHash(artifactContent)
      : undefined);
  const commandHash =
    result.commandHash ??
    createBuildModeArtifactContentHash(redactCommandSecrets(commandText));
  const hasIntegrityProof = hasBuildModeArtifactIntegrityProof(
    contentHash,
    byteSize,
  );
  const missingProofFailure = !result.isError && !hasIntegrityProof;
  const buildModeStatus: BuildModeCommandStatus =
    result.isError || missingProofFailure ? "failed" : "succeeded";
  const resultStdout = missingProofFailure
    ? `${label} failed: deploy receipt integrity proof missing.`
    : (stdout ?? summary);

  return {
    artifacts: [
      {
        ...createCommandArtifact(
          commandId,
          "command_stdout",
          "Draft deploy receipt",
        ),
        metadata: {
          byteSize,
          commandHash,
          completed: true,
          contentHash,
          deployDraft: result.draft,
          deployEnvironment: environment,
          deployId,
          deployPreviewUrl: previewUrl,
          deployTarget: target,
          exitCode: result.exitCode ?? (result.isError ? 1 : 0),
          stderr,
          summary,
          traceId,
        },
        uri:
          result.artifactUri ??
          `valoride://build-mode/commands/${encodeURIComponent(commandId)}/deploy_receipt`,
      },
    ],
    output: {
      buildModeStatus,
      deployDraft: result.draft,
      deployEnvironment: environment,
      deployId,
      deployPreviewUrl: previewUrl,
      deployTarget: target,
      exitCode: result.exitCode ?? (result.isError ? 1 : 0),
      queued: false,
      taskId,
      traceId,
    },
    stderr,
    stdout: resultStdout,
    tool: {
      capabilityId: "terminal.execute",
      kind: "deploy",
      label: "Build Mode deploy runner",
    },
  };
};

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
    label: "ValkyrAI cron workflow launcher",
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
        scheduler: result.scheduler,
        schedulerSource: "valkyrai-cron-workflow-launcher",
        storageUri: result.storageUri,
        summary: `${result.scheduleId} registered ${result.workflowRef} with the ValkyrAI cron workflow launcher on ${result.schedule}${result.nextRunAt ? `; next run ${result.nextRunAt}` : ""}.`,
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
    scheduler: result.scheduler,
    schedulerSource: "valkyrai-cron-workflow-launcher",
    taskId,
    workflowCommandId: result.workflowCommandId,
    workflowRef: result.workflowRef,
  },
  stdout: `${label} registered ${result.workflowRef} with the ValkyrAI cron workflow launcher on ${result.schedule}${result.nextRunAt ? `; next run ${result.nextRunAt}` : ""}.`,
  tool: {
    capabilityId: "automation.schedule",
    kind: "automation",
    label: "ValkyrAI cron workflow launcher",
  },
});

const toMcpExecutionOutput = (
  commandId: string,
  taskId: string | undefined,
  label: string,
  commandKind: BuildModeCommand["kind"],
  result: BuildModeMcpExecutionResult,
  request?: BuildModeCommandRequest,
) => {
  const serverName = redactCommandSecrets(result.serverName);
  const toolName = redactCommandSecrets(result.toolName);
  const workflowRef = result.workflowRef
    ? redactCommandSecrets(result.workflowRef)
    : undefined;
  const resourceUris = result.resourceUris?.map(redactCommandSecrets);
  const sensitiveActionClassList = result.sensitiveActionClasses
    ?.map(redactCommandSecrets)
    .map((item) => item.trim())
    .filter(Boolean);
  const sensitiveActionClasses = sensitiveActionClassList?.join(",");
  const missingSensitiveWorkflowApproval =
    commandKind === "workflow" &&
    Boolean(sensitiveActionClassList?.length) &&
    !hasOwnerApproval(request?.approval);
  const requiresReceipt = commandKind === "workflow";
  const missingWorkflowReceipt =
    requiresReceipt && !result.isError && !result.receiptRef;
  const missingWorkflowIdentity =
    requiresReceipt &&
    !result.isError &&
    !missingWorkflowReceipt &&
    (!result.workflowRef || (!result.executionId && !result.traceId));
  const buildModeStatus: BuildModeCommandStatus = result.isError
    ? "failed"
    : missingWorkflowReceipt
      ? "failed"
      : missingWorkflowIdentity
        ? "failed"
        : missingSensitiveWorkflowApproval
          ? "failed"
          : "succeeded";
  const artifactKind: BuildModeEvidenceArtifactKind =
    commandKind === "workflow" ? "workflow_receipt" : "mcp_result";
  const workflowSummary = workflowRef ? ` workflow ${workflowRef}` : "";
  const contentSummary = summarizeMcpContent(
    result.contentText ? redactCommandSecrets(result.contentText) : undefined,
  );
  const failed = buildModeStatus === "failed";
  const proofSummary = missingWorkflowReceipt
    ? "Missing workflow execution receipt."
    : missingWorkflowIdentity
      ? "Missing workflow execution identity."
      : missingSensitiveWorkflowApproval
        ? `Sensitive workflow ${sensitiveActionClasses} requires owner approval proof.`
        : contentSummary;
  const metadataSummary = `${serverName}.${toolName}${workflowSummary} ${
    failed ? "failed" : "completed"
  }.${proofSummary ? ` ${proofSummary}` : ""}`;

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
          execModuleId: result.execModuleId
            ? redactCommandSecrets(result.execModuleId)
            : undefined,
          executionId: result.executionId
            ? redactCommandSecrets(result.executionId)
            : undefined,
          executionState: result.executionState
            ? redactCommandSecrets(result.executionState)
            : undefined,
          receiptRef: result.receiptRef
            ? redactCommandSecrets(result.receiptRef)
            : undefined,
          resourceCount: resourceUris?.length ?? 0,
          sensitiveActionClasses,
          serverName,
          status: result.status
            ? redactCommandSecrets(result.status)
            : undefined,
          summary: metadataSummary,
          toolName,
          traceId: result.traceId
            ? redactCommandSecrets(result.traceId)
            : undefined,
          workflowRef,
        },
        uri: `valoride://build-mode/commands/${encodeURIComponent(commandId)}/${artifactKind}/${encodeURIComponent(
          `${serverName}.${toolName}`,
        )}`,
      },
    ],
    output: {
      buildModeStatus,
      queued: false,
      resourceUris,
      serverName,
      taskId,
      toolName,
      workflowRef,
    },
    stdout: `${label} ${failed ? "failed" : "completed"} via ${serverName}.${toolName}.${proofSummary ? ` ${proofSummary}` : ""}`,
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

const hasOwnerApproval = (
  approval: BuildModeCommandApproval | undefined,
): boolean =>
  approval?.approved === true &&
  approvalThresholdRank[approval.threshold] >= approvalThresholdRank.owner &&
  approvalRolesCoverOwner(approval.approverRoles);

const approvalThresholdRank: Record<BuildModeApprovalThreshold, number> = {
  none: 0,
  operator: 1,
  owner: 2,
  admin: 3,
};

const approvalRolesCoverOwner = (roles: string[]): boolean => {
  const normalized = new Set(roles.map((role) => role.toLowerCase()));
  return (
    normalized.has("owner") ||
    normalized.has("admin") ||
    normalized.has("administrator")
  );
};

const hasBrowserArtifactIntegrityProof = (
  contentHash: string | undefined,
  byteSize: number | undefined,
): boolean =>
  typeof contentHash === "string" &&
  /^sha256:[a-f0-9]{64}$/.test(contentHash) &&
  typeof byteSize === "number" &&
  byteSize > 0;

const toBrowserVerificationOutput = (
  commandId: string,
  taskId: string | undefined,
  label: string,
  verification: BuildModeBrowserVerificationResult,
  mode: "preview" | "verification" = "verification",
) => {
  const consoleErrorCount = verification.consoleErrorCount ?? 0;
  const screenshotCaptured = Boolean(
    verification.screenshot || verification.screenshotUri,
  );
  const currentUrl = verification.currentUrl
    ? redactCommandSecrets(verification.currentUrl)
    : "unknown";
  const screenshotUri =
    (verification.screenshotUri
      ? redactCommandSecrets(verification.screenshotUri)
      : undefined) ??
    `valoride://build-mode/commands/${encodeURIComponent(commandId)}/browser_screenshot`;
  const consoleLogUri =
    (verification.consoleLogUri
      ? redactCommandSecrets(verification.consoleLogUri)
      : undefined) ??
    `valoride://build-mode/commands/${encodeURIComponent(commandId)}/browser_console`;
  const redactedScreenshot = verification.screenshot
    ? redactCommandSecrets(verification.screenshot)
    : undefined;
  const redactedLogs = verification.logs
    ? redactCommandSecrets(verification.logs)
    : undefined;
  const screenshotContentHash =
    verification.screenshotContentHash ??
    (redactedScreenshot
      ? createBuildModeArtifactContentHash(redactedScreenshot)
      : undefined);
  const screenshotByteSize =
    verification.screenshotByteSize ??
    (redactedScreenshot ? Buffer.byteLength(redactedScreenshot, "utf8") : undefined);
  const consoleLogContentHash =
    verification.consoleLogContentHash ??
    (redactedLogs ? createBuildModeArtifactContentHash(redactedLogs) : undefined);
  const consoleLogByteSize =
    verification.consoleLogByteSize ??
    (redactedLogs ? Buffer.byteLength(redactedLogs, "utf8") : undefined);
  const screenshotHasIntegrityProof = hasBrowserArtifactIntegrityProof(
    screenshotContentHash,
    screenshotByteSize,
  );
  const consoleLogHasIntegrityProof = hasBrowserArtifactIntegrityProof(
    consoleLogContentHash,
    consoleLogByteSize,
  );
  const buildModeStatus: BuildModeCommandStatus =
    verification.status === "failed" ||
    consoleErrorCount > 0 ||
    !screenshotCaptured ||
    !screenshotHasIntegrityProof ||
    !consoleLogHasIntegrityProof
      ? "failed"
      : "succeeded";
  const failureDetails = [
    screenshotCaptured ? undefined : "screenshot missing",
    screenshotCaptured && !screenshotHasIntegrityProof
      ? "screenshot integrity proof missing"
      : undefined,
    !consoleLogHasIntegrityProof ? "console integrity proof missing" : undefined,
  ].filter(Boolean);

  return {
    artifacts: [
      {
        ...createCommandArtifact(
          commandId,
          "browser_screenshot",
          mode === "preview"
            ? "Generated preview screenshot"
            : "Browser verification screenshot",
        ),
        metadata: {
          browserMode: mode,
          byteSize: screenshotByteSize,
          contentHash: screenshotContentHash,
          currentUrl,
          previewOpened: buildModeStatus === "succeeded",
          screenshotCaptured,
          summary: screenshotCaptured
            ? `Captured ${currentUrl}.`
            : `No screenshot captured for ${currentUrl}.`,
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
          browserMode: mode,
          byteSize: consoleLogByteSize,
          consoleErrorCount,
          contentHash: consoleLogContentHash,
          currentUrl,
          summary: `${consoleErrorCount} console errors captured at ${currentUrl}.`,
        },
        uri: consoleLogUri,
      },
    ],
    output: {
      buildModeStatus,
      browserMode: mode,
      consoleErrorCount,
      consoleLogByteSize,
      consoleLogContentHash,
      consoleLogHasIntegrityProof,
      currentUrl,
      previewOpened: mode === "preview" && buildModeStatus === "succeeded",
      queued: false,
      screenshotCaptured,
      screenshotByteSize,
      screenshotContentHash,
      screenshotHasIntegrityProof,
      taskId,
    },
    stdout:
      mode === "preview"
        ? `${label} ${
            buildModeStatus === "failed" ? "failed" : "opened"
          } at ${currentUrl} with ${consoleErrorCount} console errors${
            failureDetails.length ? `; ${failureDetails.join("; ")}` : ""
          }.`
        : `${label} ${
            buildModeStatus === "failed" ? "failed" : "completed"
          } for ${currentUrl} with ${consoleErrorCount} console errors${
            failureDetails.length ? `; ${failureDetails.join("; ")}` : ""
          }.`,
    tool: {
      capabilityId: "browser.automation",
      kind: "browser",
      label:
        mode === "preview"
          ? "Build Mode generated preview opener"
          : "Build Mode browser verifier",
    },
  };
};

const isBuildModePreviewOpenCommand = (command: string): boolean => {
  const normalized = command.toLowerCase();
  return (
    /\bopen\s+(generated\s+)?preview\b/.test(normalized) &&
    !/\bverify\b/.test(normalized)
  );
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
  const hasCheckpointHash = Boolean(result.checkpointHash);
  const succeeded =
    result.action === "create"
      ? hasCheckpointHash
      : result.restored === true && hasCheckpointHash;
  const buildModeStatus: BuildModeCommandStatus = succeeded
    ? "succeeded"
    : "failed";
  const actionLabel =
    result.action === "create"
      ? succeeded
        ? "created"
        : "could not create"
      : succeeded
        ? "restored workspace to"
        : "could not restore workspace to";
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
  kind: "filesystem" | "psr",
  toolLabel: string,
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
      capabilityId: kind === "psr" ? "psr.edit" : "filesystem.write",
      kind,
      label: toolLabel,
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
    title: redactBuildModeEvidenceText(
      artifact.title ?? `${result.tool.label} artifact ${index + 1}`,
    ),
    uri: redactBuildModeEvidenceText(artifact.uri),
    commandId: result.commandId,
    receiptId,
    summary:
      typeof artifact.metadata?.summary === "string"
        ? redactBuildModeEvidenceText(artifact.metadata.summary)
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
      execModuleId: toMetadataPrimitive(metadata.execModuleId),
      executionId: toMetadataPrimitive(metadata.executionId),
      executionState: toMetadataPrimitive(metadata.executionState),
      nextRunAt: toMetadataPrimitive(metadata.nextRunAt),
      receiptRef: toMetadataPrimitive(metadata.receiptRef),
      schedule: toMetadataPrimitive(metadata.schedule),
      scheduleId: toMetadataPrimitive(metadata.scheduleId),
      scheduler: toMetadataPrimitive(metadata.scheduler),
      schedulerSource: toMetadataPrimitive(metadata.schedulerSource),
      sensitiveActionClasses: toMetadataPrimitive(
        metadata.sensitiveActionClasses,
      ),
      status: toMetadataPrimitive(metadata.status),
      storageUri: toMetadataPrimitive(metadata.storageUri),
      traceId: toMetadataPrimitive(metadata.traceId),
      workflowCommandId: toMetadataPrimitive(metadata.workflowCommandId),
      workflowRef: toMetadataPrimitive(metadata.workflowRef),
    };
  }
  if (kind === "connector_data") {
    return {
      action: toMetadataPrimitive(metadata.action),
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
  if (kind === "app_bundle_diff") {
    return {
      addedArtifactCount: toMetadataPrimitive(metadata.addedArtifactCount),
      appBundleId: toMetadataPrimitive(metadata.appBundleId),
      byteSize: toMetadataPrimitive(metadata.byteSize),
      changedArtifactCount: toMetadataPrimitive(metadata.changedArtifactCount),
      contentHash: toMetadataPrimitive(metadata.contentHash),
      diffId: toMetadataPrimitive(metadata.diffId),
      generatedAt: toMetadataPrimitive(metadata.generatedAt),
      removedArtifactCount: toMetadataPrimitive(metadata.removedArtifactCount),
    };
  }
  if (kind === "final_report") {
    return {
      byteSize: toMetadataPrimitive(metadata.byteSize),
      contentHash: toMetadataPrimitive(metadata.contentHash),
      memoryError: toMetadataPrimitive(metadata.memoryError),
      memoryId: toMetadataPrimitive(metadata.memoryId),
      memoryStatus: toMetadataPrimitive(metadata.memoryStatus),
      reportTitle: toMetadataPrimitive(metadata.reportTitle),
      taskId: toMetadataPrimitive(metadata.taskId),
    };
  }
  if (kind === "graymatter_context") {
    return {
      answerPolicy: toMetadataPrimitive(metadata.answerPolicy),
      byteSize: toMetadataPrimitive(metadata.byteSize),
      contentHash: toMetadataPrimitive(metadata.contentHash),
      contextPackId: toMetadataPrimitive(metadata.contextPackId),
      invariantPreflightStatus: toMetadataPrimitive(
        metadata.invariantPreflightStatus,
      ),
      memoryEntryCount: toMetadataPrimitive(metadata.memoryEntryCount),
      preflightReceiptId: toMetadataPrimitive(metadata.preflightReceiptId),
      retrievalReceiptCount: toMetadataPrimitive(
        metadata.retrievalReceiptCount,
      ),
      retrievalStatus: toMetadataPrimitive(metadata.retrievalStatus),
      retrievalTraceId: toMetadataPrimitive(metadata.retrievalTraceId),
      source: toMetadataPrimitive(metadata.source),
    };
  }
  if (kind === "command_stdout") {
    return {
      background: toMetadataPrimitive(metadata.background),
      byteSize: toMetadataPrimitive(metadata.byteSize),
      commandHash: toMetadataPrimitive(metadata.commandHash),
      completed: toMetadataPrimitive(metadata.completed),
      contentHash: toMetadataPrimitive(metadata.contentHash),
      deployDraft: toMetadataPrimitive(metadata.deployDraft),
      deployEnvironment: toMetadataPrimitive(metadata.deployEnvironment),
      deployId: toMetadataPrimitive(metadata.deployId),
      deployPreviewUrl: toMetadataPrimitive(metadata.deployPreviewUrl),
      deployTarget: toMetadataPrimitive(metadata.deployTarget),
      exitCode: toMetadataPrimitive(metadata.exitCode),
      filePath: toMetadataPrimitive(metadata.filePath),
      lineCount: toMetadataPrimitive(metadata.lineCount),
      sourceContentHash: toMetadataPrimitive(metadata.sourceContentHash),
      stderr: toMetadataPrimitive(metadata.stderr),
      traceId: toMetadataPrimitive(metadata.traceId),
      truncated: toMetadataPrimitive(metadata.truncated),
      timedOut: toMetadataPrimitive(metadata.timedOut),
    };
  }
  if (kind === "file_write") {
    return {
      bytesDelta: toMetadataPrimitive(metadata.bytesDelta),
      editsApplied: toMetadataPrimitive(metadata.editsApplied),
      editsRequested: toMetadataPrimitive(metadata.editsRequested),
      filePath: toMetadataPrimitive(metadata.filePath),
      postHash: toMetadataPrimitive(metadata.postHash),
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
  if (kind === "browser_screenshot") {
    return {
      browserMode: toMetadataPrimitive(metadata.browserMode),
      byteSize: toMetadataPrimitive(metadata.byteSize),
      contentHash: toMetadataPrimitive(metadata.contentHash),
      currentUrl: toMetadataPrimitive(metadata.currentUrl),
      previewOpened: toMetadataPrimitive(metadata.previewOpened),
      screenshotCaptured: toMetadataPrimitive(metadata.screenshotCaptured),
    };
  }
  if (kind === "browser_console") {
    return {
      browserMode: toMetadataPrimitive(metadata.browserMode),
      byteSize: toMetadataPrimitive(metadata.byteSize),
      consoleErrorCount: toMetadataPrimitive(metadata.consoleErrorCount),
      contentHash: toMetadataPrimitive(metadata.contentHash),
      currentUrl: toMetadataPrimitive(metadata.currentUrl),
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
  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    return redactBuildModeEvidenceText(value);
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
    case "app_bundle_diff":
    case "browser_console":
    case "browser_screenshot":
    case "checkpoint":
    case "command_stdout":
    case "connector_data":
    case "final_report":
    case "file_write":
    case "graymatter_context":
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
    uri: redactBuildModeEvidenceText(artifact.uri),
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
          redactUnknown(value, key),
        ]),
      )
    : undefined;

const EVIDENCE_SECRET_KEY_PATTERN =
  /(?:api[_-]?key|token|secret|password|private[_-]?key|access[_-]?key|access[_-]?token)/i;

const redactUnknown = (value: unknown, key?: string): unknown => {
  if (typeof value === "string") {
    if (
      key &&
      EVIDENCE_SECRET_KEY_PATTERN.test(key) &&
      !isEvidenceSecretReference(value)
    ) {
      return "<redacted-secret>";
    }
    return redactBuildModeEvidenceText(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactUnknown(item, key));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        redactUnknown(item, key),
      ]),
    );
  }
  return value;
};

const isEvidenceSecretReference = (value: string): boolean => {
  const normalized = value.trim().toLowerCase();
  return (
    normalized.startsWith("credential-ref") ||
    normalized.startsWith("provider-credential") ||
    normalized.startsWith("secret-ref:") ||
    normalized.startsWith("vault://") ||
    normalized.startsWith("keychain://") ||
    normalized.startsWith("valkyrai://credentials/")
  );
};

const redactBuildModeEvidenceText = (value: string): string =>
  redactCommandSecrets(value);
