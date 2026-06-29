import { Anthropic } from "@anthropic-ai/sdk";
import axios from "axios";
import type { AxiosRequestConfig } from "axios";
import crypto from "crypto";
import fs from "fs/promises";
import { setTimeout as setTimeoutPromise } from "node:timers/promises";
import pWaitFor from "p-wait-for";
import { originalPositionFor, TraceMap } from "@jridgewell/trace-mapping";
import * as path from "path";
import * as vscode from "vscode";
import { handleGrpcRequest } from "./grpc-handler";
import { buildApiHandler } from "@api/index";
import { cleanupLegacyCheckpoints } from "@integrations/checkpoints/CheckpointMigration";
import CheckpointTracker from "@integrations/checkpoints/CheckpointTracker";
import { downloadTask } from "@integrations/misc/export-markdown";
import { extractLocalZip, isZipBuffer } from "@utils/zipExtractor";
import {
  fetchOpenGraphData,
  isImageUrl,
} from "@integrations/misc/link-preview";
import { openImage } from "@integrations/misc/open-file";
import { handleFileServiceRequest } from "./file";
import { buildOpenApiImportConfig } from "./openApiImport";
import { selectImages } from "@integrations/misc/process-images";
import { getTheme } from "@integrations/theme/getTheme";
import WorkspaceTracker from "@integrations/workspace/WorkspaceTracker";
import { Logger } from "@services/logging/Logger";
import { ValorIDEAccountService } from "@services/account/ValorIDEAccountService";
import { BrowserSession } from "@services/browser/BrowserSession";
import { McpHub } from "@services/mcp/McpHub";
import { searchWorkspaceFiles } from "@services/search/file-search";
import { OpenAPIEditorPanel } from "../../views/openapi/OpenAPIEditorPanel";
import { TerminalManager } from "@integrations/terminal/TerminalManager";
import { PathAccess } from "@services/access/PathAccess";

import { getLLMPromptService } from "@services/llmPromptService";
import { getSwarmPromptBroadcaster } from "@services/swarmPromptBroadcaster";
import { StartupAuthService } from "@services/auth/StartupAuthService";
import { initializeAgentRuntimeCoordinator } from "@services/communication/AgentRuntimeCoordinator";
import {
  buildTenantHeaders,
  extractTenantContext,
  mergeTenantContext,
} from "@services/auth/tenantContext";
import { ValoridePasswordLoginService } from "@services/auth/ValoridePasswordLoginService";
import { createGrayMatterSessionState } from "@services/graymatter/GrayMatterSessionService";
import { GrayMatterMcpBridge } from "@services/graymatter/GrayMatterMcpBridge";
import { GrayMatterClient } from "@services/graymatter/GrayMatterClient";
import { createGrayMatterMemoryService } from "@services/graymatter/GrayMatterMemoryQueueStorage";
import { getStatusBarService } from "@services/StatusBarService";
import { ApiConfiguration, ApiProvider, ModelInfo } from "@shared/api";
import { LlmDetailsSummary, SelectedLlmDetails } from "@shared/llm";
import {
  SwarmMessageType,
  SwarmEntityType,
  buildSwarmMessage,
} from "@shared/swarm-protocol";
import { ChatContent } from "@shared/ChatContent";
import { ChatSettings } from "@shared/ChatSettings";
import {
  ExtensionMessage,
  ExtensionState,
  Invoke,
  Platform,
} from "@shared/ExtensionMessage";
import { HistoryItem } from "@shared/HistoryItem";
import {
  McpDownloadResponse,
  McpMarketplaceCatalog,
  McpMarketplaceItem,
  McpServer,
} from "@shared/mcp";
import type { McpToolCallResponse } from "@shared/mcp";
import { TelemetrySetting } from "@shared/TelemetrySetting";
import {
  validateAdvancedSettings,
  DEFAULT_ADVANCED_SETTINGS,
} from "@shared/AdvancedSettings";
import {
  ValorIDECheckpointRestore,
  WebviewMessage,
} from "@shared/WebviewMessage";
import { fileExistsAtPath } from "@utils/fs";
import { searchCommits } from "@utils/git";
import { getReadablePath, getWorkspacePath } from "@utils/path";
import { openUrlWithSimpleBrowser } from "@utils/openUrl";
import { resolveThorapiFolderPath } from "@utils/thorapi";
import {
  getValkyraiBasePath,
  normalizeValkyraiHost,
} from "@utils/serverValkyraiHost";
import { getTotalTasksSize } from "@utils/storage";
import { openMention } from "../mentions";
import {
  ensureMcpServersDirectoryExists,
  ensureSettingsDirectoryExists,
  GlobalFileNames,
} from "../storage/disk";
import {
  getAllExtensionState,
  getGlobalState,
  getSecret,
  getWorkspaceState,
  resetExtensionState,
  storeSecret,
  updateApiConfiguration,
  updateGlobalState,
  updateWorkspaceState,
} from "../storage/state";
import { Task, cwd } from "../task";
import { ValorIDERulesToggles } from "@shared/valoride-rules";
import {
  createRuleFile,
  deleteRuleFile,
  refreshValorIDERulesToggles,
} from "../context/instructions/user-instructions/valoride-rules";
import { RemoteCodingSessionOrchestrator } from "@services/communication/RemoteCodingSessionOrchestrator";
import { RemoteCodingSessionRegistry } from "@services/communication/RemoteCodingSessionRegistry";
import {
  BuildModeBrowserVerificationResult,
  BuildModeAutomationScheduleExecutionResult,
  BuildModeCheckpointExecutionResult,
  BuildModeCommandRequest,
  BuildModeConnectorReadResult,
  BuildModeDeployExecutionResult,
  BuildModeFileReadExecutionResult,
  BuildModeFinalReportPublishResult,
  BuildModeMcpExecutionResult,
  BuildModeSafeEditExecutionResult,
  BuildModeSwarmHandoffResult,
  BuildModeTerminalExecutionResult,
  queueBuildModeCommand,
} from "@services/agentic/BuildModeCommandAdapter";
import {
  parseBuildModeConnectorReadCommand,
  serializeBuildModeConnectorReadArtifact,
  summarizeBuildModeConnectorRead,
} from "@services/agentic/BuildModeConnectorCommand";
import {
  createBuildModeAutonomousQueueBlockedReceipt,
  validateBuildModeAutonomousQueueDispatch,
} from "@services/agentic/BuildModeAutonomousQueue";
import {
  findSecretMaterialPaths,
  redactCommandSecrets,
} from "@services/agentic/BuildModeCommandPolicy";
import {
  BuildModeAutomationScheduler,
  BuildModeValkyraiCronScheduleRequest,
  BuildModeValkyraiCronScheduleStatus,
} from "@services/agentic/BuildModeAutomationScheduler";
import { launchValkyraiCronWorkflowSchedule } from "@services/agentic/ValkyraiCronWorkflowLauncher";
import {
  decodeBuildModeDataUrl,
  persistBuildModeArtifact,
  resolveBuildModeArtifactUri,
} from "@services/agentic/BuildModeArtifactStore";
import { prepareBuildModeFinalReportPublication } from "@services/agentic/BuildModeFinalReportPublisher";
import {
  executeBuildModeFileWriteCommand,
  parseBuildModeFileWriteCommand,
} from "@services/agentic/BuildModeFileWriteCommand";
import {
  executeBuildModeFileReadCommand,
  parseBuildModeFileReadCommand,
} from "@services/agentic/BuildModeFileReadCommand";
import { coerceBuildModeTaskLaunchPayload } from "@services/agentic/BuildModeTaskBridge";
import { precisionSearchAndReplace } from "@services/psr";
import { authFetch } from "@utils/authFetch";
import {
  appendCommandAudit,
  createAgenticCommandCenterState,
  updateSwarmState,
} from "@services/agentic/AgenticStateModel";
import { resolveBuildModeExecutionWorkspaceRoot } from "@services/agentic/BuildModeWorkspaceRoot";
import type {
  AppBundle,
  BuildModeAutomationSnapshot,
  BuildModeAgentRuntimeBinding,
  BuildModeAutonomyPolicy,
  BuildModeCheckpoint,
  BuildModeCommand,
  BuildModeCommandApproval,
  BuildModeCommandPolicyRule,
  BuildModeCommandReceipt,
  BuildModeExecutionPlanStep,
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

/*
https://github.com/microsoft/vscode-webview-ui-toolkit-samples/blob/main/default/weather-webview/src/providers/WeatherViewProvider.ts

https://github.com/KumarVariable/vscode-extension-sidebar-html/blob/master/src/customSidebarViewProvider.ts
*/

const isBuildModeCommandLike = (
  value: BuildModeCommand | undefined,
): value is BuildModeCommand =>
  Boolean(value) &&
  typeof value?.id === "string" &&
  typeof value?.label === "string" &&
  typeof value?.command === "string" &&
  typeof value?.kind === "string";

const isBuildModePromptContextLike = (
  value: unknown,
): value is BuildModePromptExecutionContext => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<BuildModePromptExecutionContext>;
  return (
    typeof candidate.promptProfileId === "string" &&
    typeof candidate.promptProfileName === "string" &&
    typeof candidate.promptBundleId === "string" &&
    typeof candidate.promptBundleVersion === "string" &&
    typeof candidate.promptBundlePolicy === "string" &&
    Array.isArray(candidate.promptBundleReceiptIds)
  );
};

const isGrayMatterContextPackLike = (
  value: unknown,
): value is GrayMatterContextPack => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<GrayMatterContextPack>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.answerPolicy === "string" &&
    typeof candidate.invariantPreflightStatus === "string" &&
    Array.isArray(candidate.retrievalReceiptIds) &&
    typeof candidate.retrievalStatus === "string"
  );
};

const isAppBundleLike = (value: unknown): value is AppBundle => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<AppBundle>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.createdAt === "string" &&
    Array.isArray(candidate.artifacts)
  );
};

const extractBuildModeVerificationUrl = (command: string): string | undefined =>
  command.match(/https?:\/\/[^\s'")]+/i)?.[0];

const extractBuildModeCommandOption = (
  command: string,
  optionNames: string[],
): string | undefined => {
  for (const optionName of optionNames) {
    const pattern = new RegExp(
      `--${optionName}(?:=|\\s+)(?:"([^"]+)"|'([^']+)'|([^\\s]+))`,
      "i",
    );
    const match = command.match(pattern);
    const value = match?.[1] ?? match?.[2] ?? match?.[3];
    if (value) {
      return redactCommandSecrets(value);
    }
  }
  return undefined;
};

const countBrowserConsoleErrors = (logs: string): number =>
  logs
    .split(/\r?\n/)
    .filter((line) => /^\[(?:error|page error)\]/i.test(line.trim())).length;

const parseBuildModePsrCommand = (
  command: string,
):
  | {
      find: string;
      replace: string;
      targetPath: string;
    }
  | undefined => {
  const match = command.match(
    /^psr:(?<targetPath>\S+)\s+replace:(?<find>"[^"]*"|'[^']*')\s+with:(?<replace>"[^"]*"|'[^']*')$/s,
  );
  if (!match?.groups) {
    return undefined;
  }
  return {
    find: unquoteBuildModeValue(match.groups.find),
    replace: unquoteBuildModeValue(match.groups.replace),
    targetPath: match.groups.targetPath,
  };
};

const unquoteBuildModeValue = (value: string): string =>
  value.replace(/^['"]|['"]$/g, "");

const parseBuildModeCheckpointCommand = (
  command: string,
): { action: "create" | "rollback"; checkpointRef?: string } | undefined => {
  const match = command.match(
    /^checkpoint:(?<action>create|rollback|restore)\b\s*(?<ref>.*)$/i,
  );
  if (!match?.groups) {
    return undefined;
  }
  const action =
    match.groups.action.toLowerCase() === "create" ? "create" : "rollback";
  const checkpointRef = match.groups.ref.trim() || undefined;
  return {
    action,
    checkpointRef,
  };
};

const looksLikeCheckpointHash = (value: string | undefined): boolean =>
  Boolean(value && /^[a-f0-9]{7,40}$/i.test(value));

const findBuildModeCheckpointForCommand = (
  checkpoints: BuildModeCheckpoint[] | undefined,
  command: BuildModeCommand,
): BuildModeCheckpoint | undefined => {
  if (!checkpoints?.length) {
    return undefined;
  }
  const checkpointRef = parseBuildModeCheckpointCommand(
    command.command,
  )?.checkpointRef;
  return checkpoints.find(
    (checkpoint) =>
      checkpoint.commandId === command.id ||
      checkpoint.rollbackCommandId === command.id ||
      checkpoint.id === checkpointRef ||
      checkpoint.hash === checkpointRef,
  );
};

const parseBuildModeMcpCommand = (
  command: string,
):
  | {
      argsJson?: string;
      execModuleId?: string;
      inputRef?: string;
      serverName: string;
      toolName: string;
      workflowRef?: string;
    }
  | undefined => {
  const mcpMatch = command.match(/^mcp:(?<target>\S+)/i);
  const target = mcpMatch?.groups?.target;
  if (!target) {
    return undefined;
  }
  const separatorIndex = target.indexOf(".");
  if (separatorIndex <= 0 || separatorIndex === target.length - 1) {
    return undefined;
  }
  const argsMatch = command.match(/\bargs:(?<args>\{.*\})\s*$/s);
  return {
    argsJson: argsMatch?.groups?.args,
    execModuleId: command.match(/\bexecmodule:(?<execModuleId>\S+)/i)?.groups
      ?.execModuleId,
    inputRef: command.match(/\binput:(?<inputRef>\S+)/i)?.groups?.inputRef,
    serverName: target.slice(0, separatorIndex),
    toolName: target.slice(separatorIndex + 1),
    workflowRef: command.match(/\bworkflow:(?<workflowRef>\S+)/i)?.groups
      ?.workflowRef,
  };
};

const extractBuildModeWorkflowId = (workflowRef: string): string =>
  workflowRef.replace(/^workflow:/i, "");

const isBuildModeWorkflowUuid = (workflowId: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    workflowId,
  );

const summarizeMcpToolResponse = (
  response: McpToolCallResponse,
): string | undefined => {
  const parts = response.content
    .map((item) => {
      if (item.type === "text") {
        return item.text;
      }
      if (item.type === "resource") {
        const { blob: _blob, ...resource } = item.resource;
        return JSON.stringify(resource);
      }
      if (item.type === "image") {
        return `[image:${item.mimeType}]`;
      }
      return "";
    })
    .filter(Boolean);
  return parts.join("\n").trim() || undefined;
};

const summarizeBuildModeWorkflowOutput = (
  output: Record<string, unknown> | undefined,
): string | undefined => {
  const keys = Object.keys(output ?? {})
    .filter(Boolean)
    .slice(0, 8);
  if (!keys.length) {
    return undefined;
  }
  return `Output keys: ${keys.join(", ")}.`;
};

export class Controller {
  private postMessage: (
    message: ExtensionMessage,
  ) => Thenable<boolean> | undefined;
  private disposables: vscode.Disposable[] = [];
  task?: Task;
  workspaceTracker: WorkspaceTracker;
  mcpHub: McpHub;
  accountService: ValorIDEAccountService;
  private remoteCodingSessionOrchestrator = new RemoteCodingSessionOrchestrator(
    new RemoteCodingSessionRegistry(),
  );
  private latestAnnouncementId = "april-18-2025_21:15::00"; // update to some unique identifier when we add a new announcement
  private webviewIndexSourceMapPromise: Promise<any | null> | null = null;
  private readonly buildModeTerminalManager = new TerminalManager();

  constructor(
    readonly context: vscode.ExtensionContext,
    private readonly outputChannel: vscode.OutputChannel,
    postMessage: (message: ExtensionMessage) => Thenable<boolean> | undefined,
  ) {
    this.outputChannel.appendLine("ValorIDEProvider instantiated");
    this.postMessage = postMessage;

    this.workspaceTracker = new WorkspaceTracker((msg) =>
      this.postMessageToWebview(msg),
    );
    this.mcpHub = new McpHub(
      () => ensureMcpServersDirectoryExists(),
      () => ensureSettingsDirectoryExists(this.context),
      (msg) => this.postMessageToWebview(msg),
      this.context.extension?.packageJSON?.version ?? "1.0.0",
    );
    void new GrayMatterMcpBridge({ logger: this.outputChannel })
      .register(this.mcpHub)
      .catch((error) => {
        this.outputChannel.appendLine(
          `GrayMatter MCP registration failed: ${String(error)}`,
        );
      });
    this.accountService = new ValorIDEAccountService((msg) =>
      this.postMessageToWebview(msg),
    );

    this.disposables.push(
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration("valoride.valkyrai.host")) {
          void this.handleValkyraiHostConfigChange();
        }
      }),
    );

    // Clean up legacy checkpoints
    cleanupLegacyCheckpoints(
      this.context.globalStorageUri.fsPath,
      this.outputChannel,
    ).catch((error) => {
      console.error("Failed to cleanup legacy checkpoints:", error);
    });
  }

  /*
  VSCode extensions use the disposable pattern to clean up resources when the sidebar/editor tab is closed by the user or system. This applies to event listening, commands, interacting with the UI, etc.
  - https://vscode-docs.readthedocs.io/en/stable/extensions/patterns-and-principles/
  - https://github.com/microsoft/vscode-extension-samples/blob/main/webview-sample/src/extension.ts
  */
  async dispose() {
    this.outputChannel.appendLine("Starting ValorIDEProvider disposal...");

    try {
      await this.clearTask();
      this.outputChannel.appendLine("Task cleared successfully");
    } catch (error) {
      this.outputChannel.appendLine(`Error clearing task: ${error}`);
      console.error("Error clearing task:", error);
    }

    // Dispose all disposables with individual error handling
    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        try {
          disposable.dispose();
        } catch (error) {
          this.outputChannel.appendLine(`Error disposing resource: ${error}`);
          console.error("Error disposing resource:", error);
        }
      }
    }

    try {
      this.workspaceTracker.dispose();
      this.outputChannel.appendLine("Workspace tracker disposed successfully");
    } catch (error) {
      this.outputChannel.appendLine(
        `Error disposing workspace tracker: ${error}`,
      );
      console.error("Error disposing workspace tracker:", error);
    }

    try {
      await this.mcpHub.dispose();
      this.outputChannel.appendLine("MCP hub disposed successfully");
    } catch (error) {
      this.outputChannel.appendLine(`Error disposing MCP hub: ${error}`);
      console.error("Error disposing MCP hub:", error);
    }

    try {
      this.buildModeTerminalManager.disposeAll();
      this.outputChannel.appendLine(
        "Build Mode terminal manager disposed successfully",
      );
    } catch (error) {
      this.outputChannel.appendLine(
        `Error disposing Build Mode terminal manager: ${error}`,
      );
      console.error("Error disposing Build Mode terminal manager:", error);
    }

    this.outputChannel.appendLine("ValorIDEProvider disposal completed");
    console.log("Controller disposed successfully");
  }

  private async queueAndPostBuildModeCommand({
    approval,
    agentRuntimes,
    autonomyPolicy,
    browserPreviewUrl,
    command,
    appBundle,
    commandCatalog,
    commandPolicyRules,
    commandReceipts,
    checkpoints,
    currentConsecutiveCommands,
    creditEstimateId,
    dispatchSource,
    estimatedCredits,
    executionPlan,
    finalReportMarkdown,
    grayMatterContextPack,
    promptContext,
    providerCredentials,
    providerRoute,
    readinessGates,
    receipts,
    requireGrayMatterContext,
    scope,
    swarmRoles,
    taskId,
    toolPermissions,
  }: {
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
    dispatchSource: "command" | "autonomous-queue";
    estimatedCredits?: number;
    executionPlan?: BuildModeExecutionPlanStep[];
    finalReportMarkdown?: string;
    grayMatterContextPack?: GrayMatterContextPack;
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
  }): Promise<BuildModeCommandReceipt> {
    const workspaceRoot = resolveBuildModeExecutionWorkspaceRoot({
      activeWorkspaceRoot: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
      scopeWorkspaceRoot: scope?.workspaceRoot,
    });
    const queued = await queueBuildModeCommand({
      approval,
      agentRuntimes,
      appBundle,
      autonomyPolicy,
      browserPreviewUrl,
      command,
      commandCatalog,
      commandPolicyRules,
      commandReceipts,
      checkpoints,
      currentConsecutiveCommands,
      creditEstimateId,
      estimatedCredits,
      finalReportMarkdown,
      grayMatterContextPack,
      executionHooks: {
        executeAutomationSchedule:
          command.capabilityId === "automation.schedule"
            ? (request) => this.executeBuildModeAutomationSchedule(request)
            : undefined,
        executeBrowserVerification:
          command.capabilityId === "browser.automation"
            ? (request) => this.executeBuildModeBrowserVerification(request)
            : undefined,
        executeCheckpoint:
          command.capabilityId === "checkpoint.manage"
            ? (request) => this.executeBuildModeCheckpoint(request)
            : undefined,
        executeConnectorRead:
          command.capabilityId === "connector.read"
            ? (request) => this.executeBuildModeConnectorRead(request)
            : undefined,
        executeDeploy:
          command.kind === "deploy"
            ? (request) => this.executeBuildModeDeploy(request)
            : undefined,
        executeFileRead:
          command.capabilityId === "filesystem.read"
            ? (request) => this.executeBuildModeFileRead(request)
            : undefined,
        executeMcpTool:
          command.capabilityId === "mcp.tool" ||
          command.capabilityId === "workflow.execute"
            ? (request) => this.executeBuildModeMcpTool(request)
            : undefined,
        executeSwarmHandoff:
          command.capabilityId === "swarm.command"
            ? (request) => this.executeBuildModeSwarmHandoff(request)
            : undefined,
        publishFinalReport:
          command.capabilityId === "graymatter.memory"
            ? (request) => this.publishBuildModeFinalReport(request)
            : undefined,
        executeSafeEdit:
          command.capabilityId === "psr.edit" ||
          command.capabilityId === "filesystem.write"
            ? (request) => this.executeBuildModeSafeEdit(request)
            : undefined,
        executeTerminalCommand:
          command.capabilityId === "terminal.execute"
            ? (request) => this.executeBuildModeTerminalCommand(request)
            : undefined,
      },
      executionPlan,
      providerCredentials,
      providerRoute,
      promptContext,
      readinessGates,
      receipts,
      requireGrayMatterContext,
      scope,
      swarmRoles,
      taskId,
      toolPermissions,
      workspaceRoot,
    });
    const { agenticState } = await getAllExtensionState(this.context);
    const nextAgenticState = appendCommandAudit(
      createAgenticCommandCenterState(agenticState),
      queued.agenticResult,
    );
    await updateGlobalState(this.context, "agenticState", nextAgenticState);
    await this.postMessageToWebview({
      type: "agenticState",
      agenticState: nextAgenticState,
    });
    await this.postMessageToWebview({
      type: "valorBuildModeCommandResult",
      buildModeCommandReceipt: queued.receipt,
      payload: {
        agenticStatus: queued.agenticResult.status,
        commandId: command.id,
        taskId,
      },
    });

    const autonomousQueue = dispatchSource === "autonomous-queue";
    if (queued.receipt.status === "approval-required") {
      vscode.window.showWarningMessage(
        autonomousQueue
          ? `${command.label} requires approval before autonomous queue execution.`
          : `${command.label} requires approval before execution.`,
      );
    } else if (queued.receipt.status === "rejected") {
      vscode.window.showWarningMessage(
        autonomousQueue
          ? `${command.label} was blocked by Build Mode autonomous queue policy.`
          : `${command.label} was blocked by Build Mode policy.`,
      );
    } else if (queued.receipt.status === "failed") {
      vscode.window.showWarningMessage(
        autonomousQueue
          ? `${command.label} did not complete successfully from the autonomous queue.`
          : `${command.label} did not complete successfully.`,
      );
    } else if (queued.receipt.status === "succeeded") {
      vscode.window.showInformationMessage(
        autonomousQueue
          ? `${command.label} completed from the Build Mode autonomous queue.`
          : `${command.label} completed from Build Mode.`,
      );
    } else {
      vscode.window.showInformationMessage(
        autonomousQueue
          ? `${command.label} dispatched from the Build Mode autonomous queue.`
          : `${command.label} dispatched from Build Mode.`,
      );
    }

    return queued.receipt;
  }

  private async executeBuildModeTerminalCommand(
    request: BuildModeCommandRequest,
  ): Promise<BuildModeTerminalExecutionResult> {
    const workspaceRoot = resolveBuildModeExecutionWorkspaceRoot({
      activeWorkspaceRoot: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
      requestWorkspaceRoot: request.workspaceRoot,
      scopeWorkspaceRoot: request.scope?.workspaceRoot,
    });
    if (!workspaceRoot) {
      return {
        background: false,
        completed: false,
        exitCode: undefined,
        stderr:
          "No workspace root is available for Build Mode terminal execution.",
      };
    }

    const terminalInfo =
      await this.buildModeTerminalManager.getOrCreateTerminal(workspaceRoot);
    terminalInfo.terminal.show();
    const process = this.buildModeTerminalManager.runCommand(
      terminalInfo,
      request.command.command,
    );
    const outputLines: string[] = [];
    process.on("line", (line) => {
      outputLines.push(line);
      if (outputLines.length > 200) {
        outputLines.splice(0, outputLines.length - 200);
      }
    });

    const timeoutMs = 30_000;
    let timedOut = false;
    let timeoutId: NodeJS.Timeout | undefined;
    await Promise.race([
      process,
      new Promise<void>((resolve) => {
        timeoutId = setTimeout(() => {
          timedOut = true;
          process.continue();
          resolve();
        }, timeoutMs);
      }),
    ]);
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    const exitCode = process.getExitCode();
    const completed = !timedOut && exitCode !== undefined;
    const unretrievedOutput = process.getUnretrievedOutput();
    const stdout = [...outputLines, unretrievedOutput]
      .filter(Boolean)
      .join("\n")
      .trim();
    const stdoutText =
      stdout ||
      `${request.command.label} dispatched through the ValorIDE terminal manager.`;
    const redactedStdoutText = redactCommandSecrets(stdoutText);
    const artifact = await persistBuildModeArtifact({
      commandId: request.command.id,
      content: redactedStdoutText,
      extension: "txt",
      globalStoragePath: this.context.globalStorageUri.fsPath,
      kind: "command_stdout",
      taskId: request.taskId,
    });

    return {
      artifactUri: artifact.uri,
      background: timedOut || !completed,
      byteSize: artifact.byteSize,
      completed,
      contentHash: artifact.contentHash,
      exitCode: timedOut ? undefined : exitCode,
      stdout: redactedStdoutText,
      timedOut,
    };
  }

  private async executeBuildModeDeploy(
    request: BuildModeCommandRequest,
  ): Promise<BuildModeDeployExecutionResult> {
    const commandText = request.command.command;
    const isDraftDeploy = /\s--draft(?:\s|$)/i.test(commandText);
    const looksProduction =
      /\b(?:prod|production)\b/i.test(commandText) ||
      /\s--prod(?:\s|$)/i.test(commandText);
    if (!isDraftDeploy || looksProduction) {
      return {
        draft: isDraftDeploy,
        environment: extractBuildModeCommandOption(commandText, [
          "environment",
          "env",
        ]),
        exitCode: 1,
        isError: true,
        stderr:
          "Build Mode deploy runner only executes draft deploy commands; production deploys remain approval-gated operator handoffs.",
        target: extractBuildModeCommandOption(commandText, ["app", "target"]),
      };
    }

    const terminalResult = await this.executeBuildModeTerminalCommand(request);
    const stdout = terminalResult.stdout ?? "";
    const stderr = terminalResult.stderr;
    const completed = terminalResult.completed === true;
    return {
      artifactUri: terminalResult.artifactUri,
      byteSize: terminalResult.byteSize,
      commandHash: terminalResult.commandHash,
      contentHash: terminalResult.contentHash,
      deployId:
        stdout.match(/\bdeploy(?:ment)?[-_:]([A-Za-z0-9_.-]+)/i)?.[0] ??
        undefined,
      draft: true,
      environment:
        extractBuildModeCommandOption(commandText, ["environment", "env"]) ??
        "draft",
      exitCode: terminalResult.exitCode,
      isError: !completed || terminalResult.exitCode !== 0,
      previewUrl: stdout.match(/https?:\/\/[^\s'")]+/i)?.[0],
      stderr,
      stdout:
        stdout ||
        "Draft deploy command dispatched through the ValorIDE terminal manager.",
      target: extractBuildModeCommandOption(commandText, ["app", "target"]),
    };
  }

  private async executeBuildModeBrowserVerification(
    request: BuildModeCommandRequest,
  ): Promise<BuildModeBrowserVerificationResult> {
    const url =
      extractBuildModeVerificationUrl(request.command.command) ??
      request.browserPreviewUrl;
    if (!url) {
      return {
        consoleErrorCount: 1,
        logs: "Build Mode browser verification command did not include a URL.",
        status: "failed",
      };
    }

    const { browserSettings } = await getAllExtensionState(this.context);
    const browserSession = new BrowserSession(this.context, browserSettings);
    browserSession.setTaskId(request.taskId);
    try {
      await browserSession.launchBrowser();
      const result = await browserSession.navigateToUrl(url);
      const rawLogs = result.logs ?? "";
      const logs = redactCommandSecrets(rawLogs);
      const consoleErrorCount = countBrowserConsoleErrors(rawLogs);
      const consoleArtifact = await persistBuildModeArtifact({
        commandId: request.command.id,
        content: logs || "(No browser console logs captured.)",
        extension: "log",
        globalStoragePath: this.context.globalStorageUri.fsPath,
        kind: "browser_console",
        taskId: request.taskId,
      });
      const screenshotPayload = result.screenshot
        ? decodeBuildModeDataUrl(result.screenshot)
        : undefined;
      const screenshotArtifact = screenshotPayload
        ? await persistBuildModeArtifact({
            commandId: request.command.id,
            content: screenshotPayload.buffer,
            extension: screenshotPayload.extension,
            globalStoragePath: this.context.globalStorageUri.fsPath,
            kind: "browser_screenshot",
            taskId: request.taskId,
          })
        : undefined;
      return {
        consoleLogByteSize: consoleArtifact.byteSize,
        consoleLogContentHash: consoleArtifact.contentHash,
        consoleLogUri: consoleArtifact.uri,
        consoleErrorCount,
        currentUrl: result.currentUrl ?? url,
        logs,
        screenshotByteSize: screenshotArtifact?.byteSize,
        screenshotContentHash: screenshotArtifact?.contentHash,
        screenshotUri: screenshotArtifact?.uri,
        status: consoleErrorCount > 0 ? "failed" : "passed",
      };
    } finally {
      await browserSession.dispose();
    }
  }

  private async getBuildModeAutomationSnapshot(
    now: Date = new Date(),
  ): Promise<BuildModeAutomationSnapshot> {
    const scheduler = new BuildModeAutomationScheduler(
      this.context.globalStorageUri.fsPath,
    );
    return scheduler.getSnapshot(now);
  }

  private async postBuildModeAutomationSnapshot(
    now: Date = new Date(),
  ): Promise<void> {
    await this.postMessageToWebview({
      type: "valorBuildModeAutomationSnapshot",
      buildModeAutomationSnapshot:
        await this.getBuildModeAutomationSnapshot(now),
    });
  }

  private async setBuildModeAutomationStatus(
    id: string,
    status: "paused" | "scheduled",
    now: Date = new Date(),
  ): Promise<BuildModeCommandReceipt | undefined> {
    const scheduler = new BuildModeAutomationScheduler(
      this.context.globalStorageUri.fsPath,
      (cronRequest) => this.launchBuildModeValkyraiCronSchedule(cronRequest),
    );
    const result = await scheduler.updateStatus({
      id,
      status,
      updatedAt: now,
    });
    if (result.lifecycleReceipt) {
      await this.postMessageToWebview({
        type: "valorBuildModeCommandResult",
        buildModeCommandReceipt: result.lifecycleReceipt,
        payload: {
          agenticStatus: "success",
          commandId: result.lifecycleReceipt.commandId,
          taskId: result.record.taskId,
        },
      });
    }
    await this.postBuildModeAutomationSnapshot(now);
    return result.lifecycleReceipt;
  }

  private async executeBuildModeAutomationSchedule(
    request: BuildModeCommandRequest,
  ): Promise<BuildModeAutomationScheduleExecutionResult> {
    const scheduler = new BuildModeAutomationScheduler(
      this.context.globalStorageUri.fsPath,
      (cronRequest) => this.launchBuildModeValkyraiCronSchedule(cronRequest),
    );
    const result = await scheduler.schedule({
      command: request.command,
      commandCatalog: request.commandCatalog,
      createdAt: new Date(),
      promptContext: request.promptContext,
      providerRoute: request.providerRoute,
      scope: request.scope,
      taskId: request.taskId,
    });
    await this.postBuildModeAutomationSnapshot();
    return {
      nextRunAt: result.record.nextRunAt,
      schedule: result.record.schedule,
      scheduleId: result.record.id,
      scheduler:
        result.record.scheduler === "valkyrai-cron"
          ? "valkyrai-cron"
          : undefined,
      storageUri:
        result.record.valkyraiScheduleUri ??
        `valoride://build-mode/automations/${encodeURIComponent(
          result.record.id,
        )}`,
      workflowCommandId: result.record.workflowCommandId,
      workflowRef: result.record.workflowRef,
    };
  }

  private async launchBuildModeValkyraiCronSchedule(
    request: BuildModeValkyraiCronScheduleRequest,
  ): Promise<BuildModeValkyraiCronScheduleStatus> {
    return launchValkyraiCronWorkflowSchedule(request);
  }

  async runDueBuildModeAutomations(
    commands: BuildModeCommand[],
    taskId: string = "build-mode-task",
    scope?: BuildModeScopeContext,
    now: Date = new Date(),
    providerRoute?: ProviderRoute,
    promptContext?: BuildModePromptExecutionContext,
  ) {
    void commands;
    void taskId;
    void scope;
    void providerRoute;
    void promptContext;
    const scheduler = new BuildModeAutomationScheduler(
      this.context.globalStorageUri.fsPath,
    );
    const results = await scheduler.runDue(now);
    return { receipts: [], results };
  }

  private async publishBuildModeFinalReport(
    request: BuildModeCommandRequest,
  ): Promise<BuildModeFinalReportPublishResult> {
    const rawMarkdown = request.finalReportMarkdown?.trim();
    if (!rawMarkdown) {
      throw new Error(
        "No final report markdown was provided for Build Mode publication.",
      );
    }
    const publication = prepareBuildModeFinalReportPublication(
      rawMarkdown,
      request.command.label,
    );
    const artifact = await persistBuildModeArtifact({
      artifactId: "final-report",
      commandId: request.command.id,
      content: publication.markdown,
      extension: "md",
      globalStoragePath: this.context.globalStorageUri.fsPath,
      kind: "final_report",
      taskId: request.taskId,
    });
    const memoryWrite = await this.writeBuildModeFinalReportMemory({
      artifactUri: artifact.uri,
      byteSize: publication.byteSize,
      markdown: publication.markdown,
      request,
      title: publication.title,
    });
    return {
      artifactUri: artifact.uri,
      byteSize: publication.byteSize,
      memoryError: memoryWrite.error
        ? redactCommandSecrets(memoryWrite.error)
        : undefined,
      memoryId: memoryWrite.memoryId,
      memoryStatus: memoryWrite.status,
      reportTitle: publication.title,
      summary:
        memoryWrite.status === "written"
          ? "Final report captured with all available Build Mode evidence and written to GrayMatter memory."
          : memoryWrite.status === "queued"
            ? "Final report captured with all available Build Mode evidence and queued for GrayMatter memory."
            : "Final report captured with all available Build Mode evidence; GrayMatter memory write needs operator review.",
    };
  }

  private async writeBuildModeFinalReportMemory({
    artifactUri,
    byteSize,
    markdown,
    request,
    title,
  }: {
    artifactUri: string;
    byteSize: number;
    markdown: string;
    request: BuildModeCommandRequest;
    title: string;
  }) {
    const client = new GrayMatterClient({
      baseUrl: getValkyraiBasePath(),
      getAuthToken: () => getSecret(this.context, "jwtToken"),
      getTenantContext: () => this.readStoredTenantContext(),
    });
    const memory = createGrayMatterMemoryService(this.context, client);
    return memory.writeMemory({
      content: markdown,
      metadata: {
        appBundleTaskId: request.taskId,
        artifactUri,
        byteSize,
        commandId: request.command.id,
        principalId: request.scope?.principalId,
        projectId: request.scope?.projectId,
        reportTitle: title,
        source: "valoride-build-mode-final-report",
        tenantId: request.scope?.tenantId,
        workspaceRoot: request.scope?.workspaceRoot,
      },
      tags: [
        "valoride",
        "build-mode",
        "final-report",
        request.taskId,
        request.command.id,
      ],
      type: "artifact",
    });
  }

  private async executeBuildModeConnectorRead(
    request: BuildModeCommandRequest,
  ): Promise<BuildModeConnectorReadResult> {
    const descriptor = parseBuildModeConnectorReadCommand(
      request.command.command,
      request.scope,
    );
    if (!descriptor) {
      throw new Error(
        "Build Mode connector command must use connector:<connector>.(read|get|list|search) with data: and query: metadata.",
      );
    }
    const content = serializeBuildModeConnectorReadArtifact(
      descriptor,
      request.taskId,
      request.command.id,
    );
    const artifact = await persistBuildModeArtifact({
      artifactId: "connector-read",
      commandId: request.command.id,
      content,
      extension: "json",
      globalStoragePath: this.context.globalStorageUri.fsPath,
      kind: "connector_data",
      taskId: request.taskId,
    });
    return {
      artifactUri: artifact.uri,
      connectorId: descriptor.connectorId,
      connectorName: descriptor.connectorName,
      dataClass: descriptor.dataClass,
      isError: descriptor.status !== "authorized",
      queryRef: descriptor.queryRef,
      receiptRef: descriptor.receiptRef,
      recordCount: descriptor.recordCount,
      resourceUri: descriptor.resourceUri,
      scopeRef: descriptor.scopeRef,
      status: descriptor.status,
      summary: summarizeBuildModeConnectorRead(descriptor),
      traceId: descriptor.traceId,
    };
  }

  private async executeBuildModeSwarmHandoff(
    request: BuildModeCommandRequest,
  ): Promise<BuildModeSwarmHandoffResult> {
    const swarmRole =
      request.command.assignedSwarmRole ??
      request.command.command
        .match(/\brole:(?<role>[^\s]+)/i)
        ?.groups?.role.replace(/_/g, " ") ??
      "Unassigned";
    const runtimeId =
      request.command.assignedRuntimeId ??
      request.command.command.match(/\bruntime:(?<runtime>[^\s]+)/i)?.groups
        ?.runtime;
    const handoffId = `swarm-handoff-${request.command.id}`;
    const traceId = `swarm-trace-${request.taskId}-${request.command.id}`;
    const status: BuildModeSwarmHandoffResult["status"] = "queued";
    const summary = `${swarmRole} queued Build Mode handoff for ${request.command.label}.`;
    const artifact = await persistBuildModeArtifact({
      artifactId: handoffId,
      commandId: request.command.id,
      content: JSON.stringify(
        {
          commandId: request.command.id,
          handoffId,
          principalId: request.scope?.principalId,
          projectId: request.scope?.projectId,
          runtimeId,
          summary,
          status,
          swarmRole,
          taskId: request.taskId,
          tenantId: request.scope?.tenantId,
          traceId,
        },
        null,
        2,
      ),
      extension: "json",
      globalStoragePath: this.context.globalStorageUri.fsPath,
      kind: "swarm_handoff",
      taskId: request.taskId,
    });
    return {
      artifactUri: artifact.uri,
      handoffId,
      runtimeId,
      status,
      summary,
      swarmRole,
      taskId: request.taskId,
      traceId,
    };
  }

  private async executeBuildModeCheckpoint(
    request: BuildModeCommandRequest,
  ): Promise<BuildModeCheckpointExecutionResult> {
    const parsed = parseBuildModeCheckpointCommand(request.command.command);
    if (!parsed) {
      throw new Error(
        "Build Mode checkpoint command must use checkpoint:create, checkpoint:rollback, or checkpoint:restore.",
      );
    }

    const workspaceRoot = resolveBuildModeExecutionWorkspaceRoot({
      activeWorkspaceRoot: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
      requestWorkspaceRoot: request.workspaceRoot,
      scopeWorkspaceRoot: request.scope?.workspaceRoot,
    });
    if (!workspaceRoot) {
      throw new Error(
        "No workspace root is available for Build Mode checkpoint execution.",
      );
    }

    const tracker = await CheckpointTracker.create(
      request.taskId,
      this.context.globalStorageUri.fsPath,
    );
    if (!tracker) {
      throw new Error("Build Mode checkpoints are disabled.");
    }

    if (parsed.action === "create") {
      const checkpointHash = await tracker.commit();
      if (!checkpointHash) {
        throw new Error("Checkpoint creation did not return a commit hash.");
      }
      const checkpointRef =
        findBuildModeCheckpointForCommand(request.checkpoints, request.command)
          ?.id ?? parsed.checkpointRef;
      return {
        action: "create",
        checkpointHash,
        checkpointRef,
        workspaceRoot,
      };
    }

    const checkpoint = findBuildModeCheckpointForCommand(
      request.checkpoints,
      request.command,
    );
    const checkpointHash =
      checkpoint?.hash ??
      (looksLikeCheckpointHash(parsed.checkpointRef)
        ? parsed.checkpointRef
        : undefined);
    if (!checkpointHash) {
      throw new Error(
        `No checkpoint hash is available for ${parsed.checkpointRef ?? request.command.id}.`,
      );
    }

    await tracker.resetHead(checkpointHash);
    return {
      action: "rollback",
      checkpointHash,
      checkpointRef: checkpoint?.id ?? parsed.checkpointRef,
      restored: true,
      workspaceRoot,
    };
  }

  private async executeBuildModeMcpTool(
    request: BuildModeCommandRequest,
  ): Promise<BuildModeMcpExecutionResult> {
    const parsed = parseBuildModeMcpCommand(request.command.command);
    if (!parsed) {
      throw new Error(
        "Build Mode MCP command must use mcp:<server>.<tool> with optional workflow:, input:, or args: metadata.",
      );
    }

    const toolArguments = await this.resolveBuildModeMcpArguments(
      request,
      parsed,
    );
    const secretArgumentPaths = findSecretMaterialPaths(
      toolArguments,
      "mcpArgs",
    );
    if (secretArgumentPaths.length) {
      throw new Error(
        `Build Mode MCP arguments contain inline secret material at ${secretArgumentPaths.join(
          ", ",
        )}. Use provider credential refs or secret refs instead.`,
      );
    }
    const workflowId = parsed.workflowRef
      ? extractBuildModeWorkflowId(parsed.workflowRef)
      : undefined;
    if (
      request.command.kind === "workflow" &&
      workflowId &&
      isBuildModeWorkflowUuid(workflowId)
    ) {
      return this.executeBuildModeValkyraiWorkflow(
        request,
        parsed,
        workflowId,
        toolArguments,
      );
    }

    const response = await this.mcpHub.callTool(
      parsed.serverName,
      parsed.toolName,
      toolArguments,
    );

    return {
      contentText: summarizeMcpToolResponse(response),
      execModuleId: parsed.execModuleId,
      isError: response.isError,
      resourceUris: response.content
        .filter((item) => item.type === "resource")
        .map((item) => item.resource.uri),
      serverName: parsed.serverName,
      toolName: parsed.toolName,
      workflowRef: parsed.workflowRef,
    };
  }

  private async executeBuildModeValkyraiWorkflow(
    request: BuildModeCommandRequest,
    parsed: NonNullable<ReturnType<typeof parseBuildModeMcpCommand>>,
    workflowId: string,
    toolArguments: Record<string, unknown> | undefined,
  ): Promise<BuildModeMcpExecutionResult> {
    const endpoint = `${normalizeValkyraiHost(getValkyraiBasePath())}/mcp/workflows/${encodeURIComponent(
      workflowId,
    )}/execute`;
    const inputs: Record<string, unknown> = {
      ...(toolArguments ?? {}),
      principalId: request.scope?.principalId,
      taskId: request.taskId,
      tenantId: request.scope?.tenantId,
      traceId: `valoride-build-mode-${request.taskId}-${request.command.id}`,
      workspaceRoot: resolveBuildModeExecutionWorkspaceRoot({
        activeWorkspaceRoot: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
        requestWorkspaceRoot: request.workspaceRoot,
        scopeWorkspaceRoot: request.scope?.workspaceRoot,
      }),
    };
    const response = await authFetch(endpoint, {
      body: JSON.stringify({ inputs }),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `ValkyrAI workflow execution failed for ${parsed.workflowRef}: ${response.status}${body ? ` ${redactCommandSecrets(body)}` : ""}`,
      );
    }
    const body = (await response.json()) as {
      executionId?: string;
      executionState?: string;
      output?: Record<string, unknown>;
      receiptRef?: string;
      status?: string;
      traceId?: string;
      workflowId?: string;
    };
    const executionRef = body.executionId
      ? `valkyrai://mcp/workflows/${encodeURIComponent(
          workflowId,
        )}/executions/${encodeURIComponent(body.executionId)}`
      : `valkyrai://mcp/workflows/${encodeURIComponent(workflowId)}/execute`;
    const executionState = body.executionState ?? body.status;
    const outputSummary = summarizeBuildModeWorkflowOutput(body.output);

    return {
      contentText: [
        `ValkyrAI workflow ${parsed.workflowRef} accepted execution${body.executionId ? ` ${body.executionId}` : ""}.`,
        body.receiptRef ? `Receipt ${body.receiptRef}.` : undefined,
        outputSummary,
      ]
        .filter(Boolean)
        .join(" "),
      execModuleId: parsed.execModuleId,
      executionId: body.executionId,
      executionState,
      isError: ["FAILED", "ERROR", "CANCELLED"].includes(
        String(executionState ?? "").toUpperCase(),
      ),
      receiptRef: body.receiptRef,
      resourceUris: [executionRef],
      serverName: "valkyrai-mcp-workflows",
      status: body.status,
      toolName: parsed.toolName,
      traceId: body.traceId,
      workflowRef: parsed.workflowRef,
    };
  }

  private async resolveBuildModeMcpArguments(
    request: BuildModeCommandRequest,
    parsed: NonNullable<ReturnType<typeof parseBuildModeMcpCommand>>,
  ): Promise<Record<string, unknown> | undefined> {
    if (parsed.argsJson) {
      return JSON.parse(parsed.argsJson) as Record<string, unknown>;
    }

    if (parsed.inputRef) {
      const workspaceRoot = resolveBuildModeExecutionWorkspaceRoot({
        activeWorkspaceRoot: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
        requestWorkspaceRoot: request.workspaceRoot,
        scopeWorkspaceRoot: request.scope?.workspaceRoot,
      });
      if (!workspaceRoot) {
        throw new Error(
          "No workspace root is available for Build Mode MCP input loading.",
        );
      }
      const pathAccess = new PathAccess({ workspaceRoot });
      if (pathAccess.validateAccess(parsed.inputRef)) {
        const inputPath = pathAccess.resolve(parsed.inputRef);
        try {
          const inputContent = await fs.readFile(inputPath, "utf8");
          const input = JSON.parse(inputContent) as Record<string, unknown>;
          return parsed.execModuleId
            ? { execModuleId: parsed.execModuleId, ...input }
            : input;
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
            throw error;
          }
        }
      } else {
        const rejection = pathAccess.getLastRejection();
        throw new Error(
          `Build Mode MCP input is outside the allowed workspace scope: ${rejection?.reason ?? parsed.inputRef}.`,
        );
      }
    }

    if (parsed.workflowRef || parsed.inputRef || parsed.execModuleId) {
      return {
        execModuleId: parsed.execModuleId,
        inputContractRef: parsed.inputRef,
        workflowRef: parsed.workflowRef,
      };
    }
    return undefined;
  }

  private async executeBuildModeSafeEdit(
    request: BuildModeCommandRequest,
  ): Promise<BuildModeSafeEditExecutionResult> {
    const workspaceRoot = resolveBuildModeExecutionWorkspaceRoot({
      activeWorkspaceRoot: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
      requestWorkspaceRoot: request.workspaceRoot,
      scopeWorkspaceRoot: request.scope?.workspaceRoot,
    });
    if (!workspaceRoot) {
      throw new Error(
        "No workspace root is available for Build Mode safe edit.",
      );
    }

    const parsedPsr = parseBuildModePsrCommand(request.command.command);
    const parsedFileWrite = parseBuildModeFileWriteCommand(
      request.command.command,
    );
    if (!parsedPsr && !parsedFileWrite) {
      throw new Error(
        'Build Mode safe edit command must use psr:<path> replace:"..." with:"..." or file-write:<path> content:"...".',
      );
    }

    if (parsedFileWrite) {
      const targetPath =
        request.command.targetPaths?.[0] ?? parsedFileWrite.targetPath;
      const result = await executeBuildModeFileWriteCommand({
        command: {
          ...parsedFileWrite,
          targetPath,
        },
        pathAccess: new PathAccess({ workspaceRoot }),
        workspaceRoot,
      });
      return {
        artifactUri: `valoride://build-mode/commands/${encodeURIComponent(
          request.command.id,
        )}/file_write`,
        bytesDelta: result.bytesDelta,
        editsApplied: 1,
        editsRequested: 1,
        filePath: result.filePath,
        postHash: result.postHash,
      };
    }

    const targetPath = request.command.targetPaths?.[0] ?? parsedPsr.targetPath;
    const result = await precisionSearchAndReplace(
      workspaceRoot,
      targetPath,
      [
        {
          kind: "contextual",
          find: parsedPsr.find,
          replace: parsedPsr.replace,
          occurrence: "first",
        },
      ],
      new PathAccess({ workspaceRoot }),
      {
        makeBackup: true,
      },
    );

    return {
      artifactUri: `valoride://build-mode/commands/${encodeURIComponent(
        request.command.id,
      )}/file_write`,
      bytesDelta: result.bytesDelta,
      editsApplied: result.editsApplied,
      editsRequested: result.editsRequested,
      filePath: targetPath,
      postHash: result.postHash,
      skipped: result.skipped,
      warnings: result.warnings,
    };
  }

  private async executeBuildModeFileRead(
    request: BuildModeCommandRequest,
  ): Promise<BuildModeFileReadExecutionResult> {
    const workspaceRoot = resolveBuildModeExecutionWorkspaceRoot({
      activeWorkspaceRoot: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
      requestWorkspaceRoot: request.workspaceRoot,
      scopeWorkspaceRoot: request.scope?.workspaceRoot,
    });
    if (!workspaceRoot) {
      throw new Error(
        "No workspace root is available for Build Mode file inspection.",
      );
    }

    const parsed = parseBuildModeFileReadCommand(request.command.command);
    if (!parsed) {
      throw new Error(
        "Build Mode file inspection command must use file-read:<path>.",
      );
    }
    const targetPath = request.command.targetPaths?.[0] ?? parsed.targetPath;
    const result = await executeBuildModeFileReadCommand({
      command: {
        ...parsed,
        targetPath,
      },
      pathAccess: new PathAccess({ workspaceRoot }),
      workspaceRoot,
    });
    const extension = path.extname(result.filePath).replace(/^\./, "") || "txt";
    const artifact = await persistBuildModeArtifact({
      artifactId: "file-read",
      commandId: request.command.id,
      content: result.content,
      extension,
      globalStoragePath: this.context.globalStorageUri.fsPath,
      kind: "command_stdout",
      taskId: request.taskId,
    });
    return {
      artifactUri: artifact.uri,
      byteSize: artifact.byteSize,
      contentHash: artifact.contentHash,
      filePath: result.filePath,
      lineCount: result.lineCount,
      sourceContentHash: result.contentHash,
      truncated: result.truncated,
    };
  }

  // Auth methods
  async handleSignOut() {
    try {
      // Clear all authentication-related secrets
      await storeSecret(this.context, "valorideApiKey", undefined);
      await storeSecret(this.context, "jwtToken", undefined);

      // Clear all authentication-related global state
      await updateGlobalState(this.context, "userInfo", undefined);
      await updateGlobalState(
        this.context,
        "authenticatedPrincipal",
        undefined,
      );
      await updateGlobalState(this.context, "isLoggedIn", false);
      await this.context.secrets.delete("tenantContext");
      await updateGlobalState(this.context, "agenticState", undefined);
      await this.refreshGrayMatterSessionState(undefined);

      // Reset API provider to default
      await updateGlobalState(this.context, "apiProvider", "openrouter");

      // Clear webview client-side state (sessionStorage, localStorage, cookies)
      await this.postMessageToWebview({
        type: "clearClientAuthState",
      });

      await this.postStateToWebview();
      vscode.window.showInformationMessage(
        "Successfully logged out of ValorIDE",
      );
    } catch (error) {
      vscode.window.showErrorMessage("Logout failed");
    }
  }

  async setUserInfo(info?: {
    username: string | null;
    email: string | null;
    avatarUrl: string | null;
  }) {
    await updateGlobalState(this.context, "userInfo", info);
  }

  async initTask(task?: string, images?: string[], historyItem?: HistoryItem) {
    await this.clearTask(); // ensures that an existing task doesn't exist before starting a new one, although this shouldn't be possible since user must clear task before starting a new one
    const {
      apiConfiguration,
      customInstructions,
      autoApprovalSettings,
      browserSettings,
      chatSettings,
      selectedLlmDetails,
    } = await getAllExtensionState(this.context);
    const taskApiConfiguration = await this.resolveTaskApiConfiguration(
      apiConfiguration,
      selectedLlmDetails,
    );

    if (autoApprovalSettings) {
      const updatedAutoApprovalSettings = {
        ...autoApprovalSettings,
        version: (autoApprovalSettings.version ?? 1) + 1,
      };
      await updateGlobalState(
        this.context,
        "autoApprovalSettings",
        updatedAutoApprovalSettings,
      );
    }
    this.task = new Task(
      this.context,
      this.mcpHub,
      this.workspaceTracker,
      (historyItem) => this.updateTaskHistory(historyItem),
      () => this.postStateToWebview(),
      (message) => this.postMessageToWebview(message),
      (taskId) => this.reinitExistingTaskFromId(taskId),
      () => this.cancelTask(),
      taskApiConfiguration,
      autoApprovalSettings,
      browserSettings,
      chatSettings,
      customInstructions,
      task,
      images,
      historyItem,
    );
  }

  async reinitExistingTaskFromId(taskId: string) {
    const history = await this.getTaskWithId(taskId);
    if (history) {
      await this.initTask(undefined, undefined, history.historyItem);
    }
  }

  private resolveLlmDetailsApiConfiguration(
    apiConfiguration: ApiConfiguration,
    selectedLlmDetails?: SelectedLlmDetails,
  ): ApiConfiguration {
    const selectedServiceId =
      apiConfiguration.valkyraiServiceId || selectedLlmDetails?.id;
    if (!selectedServiceId) {
      return apiConfiguration;
    }

    if (
      apiConfiguration.apiProvider === "valkyrai" ||
      this.isMissingLocalApiCredential(apiConfiguration)
    ) {
      return {
        ...apiConfiguration,
        apiProvider: "valkyrai",
        apiModelId: selectedServiceId,
        valkyraiServiceId: selectedServiceId,
      };
    }

    return apiConfiguration;
  }

  private async resolveTaskApiConfiguration(
    apiConfiguration: ApiConfiguration,
    selectedLlmDetails?: SelectedLlmDetails,
  ): Promise<ApiConfiguration> {
    const resolvedConfiguration = this.resolveLlmDetailsApiConfiguration(
      apiConfiguration,
      selectedLlmDetails,
    );

    if (
      resolvedConfiguration.apiProvider !== "valkyrai" ||
      resolvedConfiguration.valkyraiJwt ||
      resolvedConfiguration.valkyraiSessionJwt
    ) {
      return resolvedConfiguration;
    }

    const sessionJwt = await this.readStoredJwtToken();
    if (!sessionJwt) {
      return resolvedConfiguration;
    }

    return {
      ...resolvedConfiguration,
      valkyraiSessionJwt: sessionJwt,
    };
  }

  private isMissingLocalApiCredential(
    apiConfiguration: ApiConfiguration,
  ): boolean {
    switch (apiConfiguration.apiProvider) {
      case "valkyrai":
        return !apiConfiguration.valkyraiServiceId?.trim();
      case "valoride":
        return !apiConfiguration.valorideApiKey?.trim();
      case "openrouter":
        return !apiConfiguration.openRouterApiKey?.trim();
      case "deepseek":
        return !apiConfiguration.deepSeekApiKey?.trim();
      case "requesty":
        return !apiConfiguration.requestyApiKey?.trim();
      case "together":
        return !apiConfiguration.togetherApiKey?.trim();
      case "qwen":
        return !apiConfiguration.qwenApiKey?.trim();
      case "doubao":
        return !apiConfiguration.doubaoApiKey?.trim();
      case "moonshot":
        return !apiConfiguration.moonshotApiKey?.trim();
      case "minimax":
        return !apiConfiguration.minimaxApiKey?.trim();
      case "mistral":
        return !apiConfiguration.mistralApiKey?.trim();
      case "xai":
        return !apiConfiguration.xaiApiKey?.trim();
      case "sambanova":
        return !apiConfiguration.sambanovaApiKey?.trim();
      default:
        return false;
    }
  }

  // Send any JSON serializable data to the react app
  async postMessageToWebview(message: ExtensionMessage) {
    await this.postMessage(message);
  }

  private normalizeWebviewSourcePath(source: string): string {
    if (source.startsWith("../../src/")) {
      return `webview-ui/src/${source.slice("../../src/".length)}`;
    }
    if (source.startsWith("../../node_modules/")) {
      return source.slice("../../".length);
    }
    return source;
  }

  private async getWebviewIndexSourceMap(): Promise<any | null> {
    if (this.webviewIndexSourceMapPromise) {
      return this.webviewIndexSourceMapPromise;
    }

    const mapPath = path.join(
      this.context.extensionUri.fsPath,
      "dist",
      "webview",
      "assets",
      "index.js.map",
    );

    this.webviewIndexSourceMapPromise = fs
      .readFile(mapPath, "utf8")
      .then((raw) => {
        // Use the statically imported TraceMap instead of require()
        return new TraceMap(JSON.parse(raw));
      })
      .catch((err) => {
        this.outputChannel.appendLine(
          `Webview source map not available: ${mapPath} (${String(err)})`,
        );
        return null;
      });

    return this.webviewIndexSourceMapPromise;
  }

  private async symbolicateWebviewPosition(
    generatedLine: number,
    generatedColumn: number,
  ): Promise<string | null> {
    const traceMap = await this.getWebviewIndexSourceMap();
    if (!traceMap) return null;

    for (const column of [generatedColumn, Math.max(0, generatedColumn - 1)]) {
      const original = originalPositionFor(traceMap, {
        line: generatedLine,
        column,
      });
      if (!original?.source || !original?.line) continue;

      const source = this.normalizeWebviewSourcePath(String(original.source));
      const line = Number(original.line);
      const col =
        typeof original.column === "number" ? Number(original.column) : 0;
      return `${source}:${line}:${col}`;
    }

    return null;
  }

  private async symbolicateWebviewStack(stack: string): Promise<string | null> {
    if (!stack) return null;

    const traceMap = await this.getWebviewIndexSourceMap();
    if (!traceMap) return null;

    const mappedLines = stack.split("\n").map((rawLine) => {
      const line = rawLine ?? "";
      const trimmed = line.trim();
      if (!trimmed) return line;

      const inParensMatch = trimmed.match(/\(([^)]+)\)$/);
      const token = inParensMatch
        ? inParensMatch[1]
        : trimmed.split(/\s+/).pop();
      if (!token) return line;

      const locMatch = token.match(/:(\d+):(\d+)$/);
      if (!locMatch) return line;

      const generatedLine = Number(locMatch[1]);
      const generatedColumn = Number(locMatch[2]);

      // Heuristic: only rewrite frames from our webview bundle.
      const filePart = token.slice(0, token.length - locMatch[0].length);
      if (
        !filePart.endsWith("/dist/webview/assets/index.js") &&
        !filePart.endsWith("dist/webview/assets/index.js") &&
        !filePart.endsWith("/assets/index.js") &&
        !filePart.endsWith("assets/index.js") &&
        !filePart.endsWith("/index.js") &&
        !filePart.endsWith("index.js")
      ) {
        return line;
      }

      for (const column of [
        generatedColumn,
        Math.max(0, generatedColumn - 1),
      ]) {
        const original = originalPositionFor(traceMap, {
          line: generatedLine,
          column,
        });
        if (!original?.source || !original?.line) continue;

        const source = this.normalizeWebviewSourcePath(String(original.source));
        const origLine = Number(original.line);
        const origCol =
          typeof original.column === "number" ? Number(original.column) : 0;
        return `${line} -> ${source}:${origLine}:${origCol}`;
      }

      return line;
    });

    return mappedLines.join("\n");
  }

  /**
   * Sets up an event listener to listen for messages passed from the webview context and
   * executes code based on the message that is received.
   *
   * @param webview A reference to the extension webview
   */
  async handleWebviewMessage(message: WebviewMessage) {
    switch (message.type) {
      case "requestTheme": {
        // Send current theme to webview
        const theme = await getTheme();
        await this.postMessageToWebview({
          type: "theme",
          text: JSON.stringify(theme),
        });
        break;
      }
      case "openFile": {
        const relPath = (message as any).text;
        if (relPath) {
          const absPath = path.join(cwd, relPath);
          await handleFileServiceRequest(this, "openFile", { value: absPath });
        }
        break;
      }
      case "webviewError": {
        const textRaw = (message as any).text;
        const text =
          typeof textRaw === "string" ? textRaw : String(textRaw ?? "");

        const info = (message as any).info ?? (message as any).payload ?? null;
        const stack =
          typeof (message as any).stack === "string"
            ? (message as any).stack
            : null;
        const filename = (message as any).filename ?? null;
        const lineno =
          typeof (message as any).lineno === "number"
            ? (message as any).lineno
            : null;
        const colno =
          typeof (message as any).colno === "number"
            ? (message as any).colno
            : null;

        this.outputChannel.appendLine(`Webview encountered an error: ${text}`);
        if (filename || lineno != null || colno != null) {
          this.outputChannel.appendLine(
            `Location: ${String(filename ?? "unknown")}:${String(lineno ?? "?")}:${String(colno ?? "?")}`,
          );
        }

        if (lineno != null && colno != null) {
          const mapped = await this.symbolicateWebviewPosition(lineno, colno);
          if (mapped) {
            this.outputChannel.appendLine(`Mapped location: ${mapped}`);
          }
        }

        if (info) {
          const infoText =
            typeof info === "string" ? info : JSON.stringify(info, null, 2);
          this.outputChannel.appendLine(`Info: ${infoText}`);
        }

        if (stack) {
          this.outputChannel.appendLine(`Stack:\n${stack}`);

          const mappedStack = await this.symbolicateWebviewStack(stack);
          if (mappedStack && mappedStack !== stack) {
            this.outputChannel.appendLine(`Mapped stack:\n${mappedStack}`);
          }
        }

        console.error("Webview error:", {
          text,
          filename,
          lineno,
          colno,
          info,
          stack,
        });

        try {
          vscode.window.showErrorMessage(`Webview error: ${text}`);
        } catch {
          // ignore
        }
        break;
      }
      case "addRemoteServer": {
        try {
          await this.mcpHub?.addRemoteServer(
            message.serverName!,
            message.serverUrl!,
          );
          await this.postMessageToWebview({
            type: "addRemoteServerResult",
            addRemoteServerResult: {
              success: true,
              serverName: message.serverName!,
            },
          });
        } catch (error) {
          await this.postMessageToWebview({
            type: "addRemoteServerResult",
            addRemoteServerResult: {
              success: false,
              serverName: message.serverName!,
              error: error.message,
            },
          });
        }
        break;
      }
      case "authStateChanged":
        await this.setUserInfo(
          message.user
            ? {
                username: message.user.name || null,
                email: null, // Replace with actual email if available
                avatarUrl: null, // Replace with actual avatar URL if available
              }
            : undefined,
        );
        await this.postStateToWebview();
        break;
      case "accountLoginRequest": {
        const requestId = message.requestId;
        const username = message.username?.trim();
        const password = message.password;

        if (!requestId || !username || !password) {
          await this.postMessageToWebview({
            type: "accountLoginResult",
            requestId,
            success: false,
            error: "Username and password are required.",
          });
          break;
        }

        try {
          const loginResult = await new ValoridePasswordLoginService().login({
            username,
            password,
          });
          const startupAuthService = StartupAuthService.getInstance(
            this.context,
          );
          await startupAuthService.handleSuccessfulLogin(
            loginResult.tokens,
            loginResult.user,
          );
          await this.refreshGrayMatterSessionState(loginResult.tokens.jwtToken);
          await this.postMessageToWebview({
            type: "accountLoginResult",
            requestId,
            success: true,
            token: loginResult.tokens.jwtToken,
            authenticatedPrincipal: loginResult.user
              ? JSON.stringify(loginResult.user)
              : undefined,
          });
          await this.postMessageToWebview({
            type: "loginSuccess",
            token: loginResult.tokens.jwtToken,
            authenticatedPrincipal: loginResult.user
              ? JSON.stringify(loginResult.user)
              : undefined,
          });
          await this.postStateToWebview();
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          await this.postMessageToWebview({
            type: "accountLoginResult",
            requestId,
            success: false,
            error: errorMessage,
          });
        }
        break;
      }
      case "accountLoginSuccess": {
        const customToken = message.customToken?.trim();
        const authenticatedPrincipal = this.normalizePrincipalPayload(
          message.authenticatedPrincipal,
        );
        if (customToken) {
          await storeSecret(this.context, "jwtToken", customToken);
        }
        if (message.authenticatedPrincipal) {
          await updateGlobalState(
            this.context,
            "authenticatedPrincipal",
            message.authenticatedPrincipal,
          );
          await updateGlobalState(
            this.context,
            "userInfo",
            message.authenticatedPrincipal,
          );
          await this.storeTenantContextFromPayloads(
            message.authenticatedPrincipal,
          );
        }
        await updateGlobalState(
          this.context,
          "isLoggedIn",
          Boolean(customToken),
        );
        await this.refreshGrayMatterSessionState(customToken);
        await this.postStateToWebview();
        break;
      }
      case "webviewDidLaunch":
        try {
          await this.postStateToWebview();
          this.workspaceTracker?.populateFilePaths(); // don't await
          void this.retrySwarmRegistration("webview launch");
        } catch (err) {
          console.error("Error during webviewDidLaunch initialization:", err);
        }
        getTheme().then((theme) =>
          this.postMessageToWebview({
            type: "theme",
            text: JSON.stringify(theme),
          }),
        );
        // post last cached models in case the call to endpoint fails
        this.readOpenRouterModels().then((openRouterModels) => {
          if (openRouterModels) {
            this.postMessageToWebview({
              type: "openRouterModels",
              openRouterModels,
            });
          }
        });
        // gui relies on model info to be up-to-date to provide the most accurate pricing, so we need to fetch the latest details on launch.
        // we do this for all users since many users switch between api providers and if they were to switch back to openrouter it would be showing outdated model info if we hadn't retrieved the latest at this point
        // (see normalizeApiConfiguration > openrouter)
        // Prefetch marketplace and OpenRouter models

        getGlobalState(this.context, "mcpMarketplaceCatalog").then(
          (mcpMarketplaceCatalog) => {
            if (mcpMarketplaceCatalog) {
              this.postMessageToWebview({
                type: "mcpMarketplaceCatalog",
                mcpMarketplaceCatalog:
                  mcpMarketplaceCatalog as McpMarketplaceCatalog,
              });
            }
          },
        );
        this.silentlyRefreshMcpMarketplace();
        this.refreshOpenRouterModels().then(async (openRouterModels) => {
          if (openRouterModels) {
            // update model info in state (this needs to be done here since we don't want to update state while settings is open, and we may refresh models there)
            const { apiConfiguration } = await getAllExtensionState(
              this.context,
            );
            if (apiConfiguration.openRouterModelId) {
              await updateGlobalState(
                this.context,
                "openRouterModelInfo",
                openRouterModels[apiConfiguration.openRouterModelId],
              );
              await this.postStateToWebview();
            }
          }
        });

        break;
      case "retrySwarmRegistration":
        await this.retrySwarmRegistration("manual retry");
        break;
      case "showChatView": {
        this.postMessageToWebview({
          type: "action",
          action: "chatButtonClicked",
        });
        break;
      }
      case "displayVSCodeInfo": {
        if (message.text) {
          vscode.window.showInformationMessage(message.text);
        }
        break;
      }
      case "displayVSCodeWarning": {
        if (message.text) {
          vscode.window.showWarningMessage(message.text);
        }
        break;
      }
      case "displayVSCodeError": {
        if (message.text) {
          vscode.window.showErrorMessage(message.text);
        }
        break;
      }
      case "newTask":
        // Code that should run in response to the hello message command
        //vscode.window.showInformationMessage(message.text!)

        // Send a message to our webview.
        // You can send any JSON serializable data.
        // Could also do this in extension .ts
        //this.postMessageToWebview({ type: "text", text: `Extension: ${Date.now()}` })
        // initializing new instance of ValorIDE will make sure that any agentically running promises in old instance don't affect our new task. this essentially creates a fresh slate for the new task
        await this.initTask(message.text, message.images);
        break;
      case "condense":
        this.task?.handleWebviewAskResponse("yesButtonClicked");
        break;
      case "apiConfiguration":
        if (message.apiConfiguration) {
          await updateApiConfiguration(this.context, message.apiConfiguration);
          if (this.task) {
            this.task.api = buildApiHandler(
              await this.resolveTaskApiConfiguration(message.apiConfiguration),
            );
          }
        }
        await this.postStateToWebview();
        break;
      case "autoApprovalSettings":
        if (message.autoApprovalSettings) {
          const currentSettings = (await getAllExtensionState(this.context))
            .autoApprovalSettings;
          const incomingVersion = message.autoApprovalSettings.version ?? 1;
          const currentVersion = currentSettings?.version ?? 1;
          if (incomingVersion > currentVersion) {
            await updateGlobalState(
              this.context,
              "autoApprovalSettings",
              message.autoApprovalSettings,
            );
            if (this.task) {
              this.task.autoApprovalSettings = message.autoApprovalSettings;
            }
            await this.postStateToWebview();
          }
        }
        break;
      case "browserSettings":
        if (message.browserSettings) {
          // remoteBrowserEnabled now means "enable remote browser connection"
          // commenting out since this is being done in BrowserSettingsSection updateRemoteBrowserEnabled
          // if (!message.browserSettings.remoteBrowserEnabled) {
          // 	// If disabling remote browser connection, clear the remoteBrowserHost
          // 	message.browserSettings.remoteBrowserHost = undefined
          // }
          await updateGlobalState(
            this.context,
            "browserSettings",
            message.browserSettings,
          );
          if (this.task) {
            this.task.browserSettings = message.browserSettings;
            this.task.browserSession.browserSettings = message.browserSettings;
          }
          await this.postStateToWebview();
        }
        break;
      case "togglePlanActMode":
        if (message.chatSettings) {
          await this.togglePlanActModeWithChatSettings(
            message.chatSettings,
            message.chatContent,
          );
        }
        break;
      case "optionsResponse":
        await this.postMessageToWebview({
          type: "invoke",
          invoke: "sendMessage",
          text: message.text,
        });
        break;
      case "relaunchChromeDebugMode":
        const { browserSettings } = await getAllExtensionState(this.context);
        const browserSession = new BrowserSession(
          this.context,
          browserSettings,
        );
        await browserSession.relaunchChromeDebugMode(this);
        break;
      case "askResponse":
        this.task?.handleWebviewAskResponse(
          message.askResponse!,
          message.text,
          message.images,
        );
        break;
      case "userMessage":
        this.task?.handleWebviewAskResponse(
          "messageResponse",
          message.text,
          message.images,
        );
        break;
      case "didShowAnnouncement":
        await updateGlobalState(
          this.context,
          "lastShownAnnouncementId",
          this.latestAnnouncementId,
        );
        await this.postStateToWebview();
        break;
      case "selectImages":
        const images = await selectImages();
        await this.postMessageToWebview({
          type: "selectedImages",
          images,
        });
        break;
      case "exportCurrentTask":
        const currentTaskId = this.task?.taskId;
        if (currentTaskId) {
          this.exportTaskWithId(currentTaskId);
        }
        break;
      case "showTaskWithId":
        await this.showTaskWithId(message.text || "");
        break;
      case "deleteTaskWithId":
        this.deleteTaskWithId(message.text!);
        break;
      case "exportTaskWithId":
        this.exportTaskWithId(message.text!);
        break;
      case "resetState":
        await this.resetState();
        break;
      case "requestOllamaModels":
        const ollamaModels = await this.getOllamaModels(message.text);
        this.postMessageToWebview({
          type: "ollamaModels",
          ollamaModels,
        });
        break;
      case "requestLmStudioModels":
        const lmStudioModels = await this.getLmStudioModels(message.text);
        this.postMessageToWebview({
          type: "lmStudioModels",
          lmStudioModels,
        });
        break;
      case "requestVsCodeLmModels":
        const vsCodeLmModels = await this.getVsCodeLmModels();
        this.postMessageToWebview({ type: "vsCodeLmModels", vsCodeLmModels });
        break;
      case "refreshOpenRouterModels":
        await this.refreshOpenRouterModels();
        break;
      case "refreshRequestyModels":
        await this.refreshRequestyModels();
        break;
      case "refreshLLMDetails":
        await this.refreshLLMDetails();
        break;
      case "testValkyraiHost": {
        const targetHost = message.valkyraiHost?.trim();
        if (!targetHost) {
          await this.postMessageToWebview({
            type: "valkyraiHostTestResult",
            host: "",
            success: false,
            error: "Host URL is required.",
          });
          break;
        }
        await this.testValkyraiHostConnection(targetHost);
        break;
      }
      case "updateValkyraiHost": {
        const requestedHost = message.valkyraiHost?.trim();
        if (!requestedHost) {
          break;
        }
        const nextHost = normalizeValkyraiHost(requestedHost);
        await vscode.workspace
          .getConfiguration("valoride.valkyrai")
          .update("host", nextHost, vscode.ConfigurationTarget.Global);
        await updateGlobalState(this.context, "valkyraiHost", nextHost);
        await this.postStateToWebview();
        await this.refreshLLMDetails();
        try {
          const startupAuthService = StartupAuthService.getInstance(
            this.context,
          );
          await startupAuthService.restoreAuthentication();
        } catch (error) {
          console.warn(
            "Failed to restore authentication after host change:",
            error,
          );
        }
        await this.retrySwarmRegistration("ValkyrAI host change");
        break;
      }
      case "refreshOpenAiModels":
        const { apiConfiguration } = await getAllExtensionState(this.context);
        const openAiModels = await this.getOpenAiModels(
          apiConfiguration.openAiBaseUrl,
          apiConfiguration.openAiApiKey,
        );
        this.postMessageToWebview({ type: "openAiModels", openAiModels });
        break;
      case "refreshValorIDERules":
        await refreshValorIDERulesToggles(this.context, cwd);
        await this.postStateToWebview();
        break;
      case "openImage":
        openImage(message.text!);
        break;
      case "openInBrowser":
        if (message.url) {
          await openUrlWithSimpleBrowser(message.url);
        }
        break;
      case "openOpenAPIEditor":
        OpenAPIEditorPanel.open(this.context);
        break;
      case "fetchOpenGraphData":
        this.fetchOpenGraphData(message.text!);
        break;
      case "checkIsImageUrl":
        this.checkIsImageUrl(message.text!);
        break;
      case "createRuleFile":
        if (
          typeof message.isGlobal !== "boolean" ||
          typeof message.filename !== "string" ||
          !message.filename
        ) {
          console.error("createRuleFile: Missing or invalid parameters", {
            isGlobal:
              typeof message.isGlobal === "boolean"
                ? message.isGlobal
                : `Invalid: ${typeof message.isGlobal}`,
            filename:
              typeof message.filename === "string"
                ? message.filename
                : `Invalid: ${typeof message.filename}`,
          });
          return;
        }
        const { filePath, fileExists } = await createRuleFile(
          message.isGlobal,
          message.filename,
          cwd,
        );
        if (fileExists && filePath) {
          vscode.window.showWarningMessage(
            `Rule file "${message.filename}" already exists.`,
          );
          // Still open it for editing
          await handleFileServiceRequest(this, "openFile", { value: filePath });
          return;
        } else if (filePath && !fileExists) {
          await refreshValorIDERulesToggles(this.context, cwd);
          await this.postStateToWebview();

          await handleFileServiceRequest(this, "openFile", { value: filePath });

          vscode.window.showInformationMessage(
            `Created new ${message.isGlobal ? "global" : "workspace"} rule file: ${message.filename}`,
          );
        } else {
          // null filePath
          vscode.window.showErrorMessage(`Failed to create rule file.`);
        }

        break;
      case "openMention":
        openMention(message.text);
        break;
      case "taskCompletionViewChanges": {
        if (message.number) {
          await this.task?.presentMultifileDiff(message.number, true);
        }
        break;
      }
      case "taskCompletionOpenFileDiff": {
        if (message.number && message.relativePath) {
          await this.task?.presentFileDiff(
            message.number,
            message.relativePath,
            message.seeNewChangesSinceLastTaskCompletion ?? true,
          );
        }
        break;
      }
      case "taskCompletionPreviewFile": {
        if (message.number && message.relativePath) {
          try {
            const preview = await this.task?.getFilePreview(
              message.number,
              message.relativePath,
              message.seeNewChangesSinceLastTaskCompletion ?? true,
            );
            await this.postMessageToWebview({
              type: "taskCompletionFilePreview",
              number: message.number,
              relativePath: message.relativePath,
              before: preview?.before,
              after: preview?.after,
              isBinary: preview?.isBinary,
            });
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            await this.postMessageToWebview({
              type: "taskCompletionFilePreview",
              number: message.number,
              relativePath: message.relativePath,
              before: undefined,
              after: undefined,
              isBinary: false,
            });
            console.error("Failed to get file preview:", errorMessage);
          }
        }
        break;
      }
      case "getLatestState":
        await this.postStateToWebview();
        break;
      case "accountLoginClicked": {
        // Open the Account view which has the in-extension login form
        await this.postMessageToWebview({
          type: "action",
          action: "accountButtonClicked",
        });
        break;
      }
      case "accountLogoutClicked": {
        await this.handleSignOut();
        break;
      }
      case "showAccountViewClicked": {
        await this.postMessageToWebview({
          type: "action",
          action: "accountButtonClicked",
          accountTab: message.accountTab,
        });
        break;
      }
      case "retryGrayMatterBlockedAction": {
        const session = await this.refreshGrayMatterSessionState();
        await this.postStateToWebview();
        if (session.status === "ready") {
          void vscode.window.showInformationMessage(
            `GrayMatter credits are ready. Retry ${message.resumeActionLabel ?? message.resumeCapabilityId ?? "the blocked action"}.`,
          );
        } else {
          void vscode.window.showWarningMessage(
            `GrayMatter is still ${session.status}. Recharge or sign in before retrying the blocked action.`,
          );
        }
        break;
      }
      case "showMcpView": {
        await this.postMessageToWebview({
          type: "action",
          action: "mcpButtonClicked",
          tab: message.tab || undefined,
        });
        break;
      }
      case "openMcpSettings": {
        const mcpSettingsFilePath = await this.mcpHub?.getMcpSettingsFilePath();
        if (mcpSettingsFilePath) {
          await handleFileServiceRequest(this, "openFile", {
            value: mcpSettingsFilePath,
          });
        }
        break;
      }
      case "fetchMcpMarketplace": {
        await this.fetchMcpMarketplace(message.bool);
        break;
      }
      case "downloadMcp": {
        if (message.mcpId) {
          // 1. Toggle to act mode if we are in plan mode
          const { chatSettings } = await this.getStateToPostToWebview();
          if (chatSettings.mode === "plan") {
            await this.togglePlanActModeWithChatSettings({ mode: "act" });
          }

          // 2. download MCP
          await this.downloadMcp(message.mcpId, message.mcpMarketplaceItem);
        }
        break;
      }
      case "silentlyRefreshMcpMarketplace": {
        await this.silentlyRefreshMcpMarketplace();
        break;
      }
      case "taskFeedback":
        break;
      // case "openMcpMarketplaceServerDetails": {
      // 	if (message.text) {
      // 		const response = await fetch(`https://api-0.valkyrlabs.com/v1/McpMarketplace/${message.mcpId}`)
      // 		const details: McpDownloadResponse = await response.json()

      // 		if (details.readmeContent) {
      // 			// Disable markdown preview markers
      // 			const config = vscode.workspace.getConfiguration("markdown")
      // 			await config.update("preview.markEditorSelection", false, true)

      // 			// Create URI with base64 encoded markdown content
      // 			const uri = vscode.Uri.parse(
      // 				`${DIFF_VIEW_URI_SCHEME}:${details.name} README?${Buffer.from(details.readmeContent).toString("base64")}`,
      // 			)

      // 			// close existing
      // 			const tabs = vscode.window.tabGroups.all
      // 				.flatMap((tg) => tg.tabs)
      // 				.filter((tab) => tab.label && tab.label.includes("README") && tab.label.includes("Preview"))
      // 			for (const tab of tabs) {
      // 				await vscode.window.tabGroups.close(tab)
      // 			}

      // 			// Show only the preview
      // 			await vscode.commands.executeCommand("markdown.showPreview", uri, {
      // 				sideBySide: true,
      // 				preserveFocus: true,
      // 			})
      // 		}
      // 	}

      // 	this.postMessageToWebview({ type: "relinquishControl" })

      // 	break
      // }
      case "toggleToolAutoApprove": {
        try {
          await this.mcpHub?.toggleToolAutoApprove(
            message.serverName!,
            message.toolNames!,
            message.autoApprove!,
          );
        } catch (error) {
          if (message.toolNames?.length === 1) {
            console.error(
              `Failed to toggle auto-approve for server ${message.serverName} with tool ${message.toolNames[0]}:`,
              error,
            );
          } else {
            console.error(
              `Failed to toggle auto-approve tools for server ${message.serverName}:`,
              error,
            );
          }
        }
        break;
      }
      case "toggleValorIDERule": {
        const { isGlobal, rulePath, enabled } = message;
        if (
          rulePath &&
          typeof enabled === "boolean" &&
          typeof isGlobal === "boolean"
        ) {
          if (isGlobal) {
            const toggles =
              ((await getGlobalState(
                this.context,
                "globalValorIDERulesToggles",
              )) as ValorIDERulesToggles) || {};
            toggles[rulePath] = enabled;
            await updateGlobalState(
              this.context,
              "globalValorIDERulesToggles",
              toggles,
            );
          } else {
            const toggles =
              ((await getWorkspaceState(
                this.context,
                "localValorIDERulesToggles",
              )) as ValorIDERulesToggles) || {};
            toggles[rulePath] = enabled;
            await updateWorkspaceState(
              this.context,
              "localValorIDERulesToggles",
              toggles,
            );
          }
          await this.postStateToWebview();
        } else {
          console.error("toggleValorIDERule: Missing or invalid parameters", {
            rulePath,
            isGlobal:
              typeof isGlobal === "boolean"
                ? isGlobal
                : `Invalid: ${typeof isGlobal}`,
            enabled:
              typeof enabled === "boolean"
                ? enabled
                : `Invalid: ${typeof enabled}`,
          });
        }
        break;
      }
      case "deleteValorIDERule": {
        const { isGlobal, rulePath } = message;
        if (rulePath && typeof isGlobal === "boolean") {
          const result = await deleteRuleFile(this.context, rulePath, isGlobal);
          if (result.success) {
            await refreshValorIDERulesToggles(this.context, cwd);
            await this.postStateToWebview();
          } else {
            console.error("Failed to delete rule file:", result.message);
          }
        } else {
          console.error("deleteValorIDERule: Missing or invalid parameters", {
            rulePath,
            isGlobal:
              typeof isGlobal === "boolean"
                ? isGlobal
                : `Invalid: ${typeof isGlobal}`,
          });
        }
        break;
      }
      case "requestTotalTasksSize": {
        this.refreshTotalTasksSize();
        break;
      }
      case "restartMcpServer": {
        try {
          await this.mcpHub?.restartConnection(message.text!);
        } catch (error) {
          console.error(
            `Failed to retry connection for ${message.text}:`,
            error,
          );
        }
        break;
      }
      case "deleteMcpServer": {
        if (message.serverName) {
          this.mcpHub?.deleteServer(message.serverName);
        }
        break;
      }
      case "fetchLatestMcpServersFromHub": {
        this.mcpHub?.sendLatestMcpServers();
        break;
      }
      case "searchCommits": {
        const cwd = vscode.workspace.workspaceFolders
          ?.map((folder) => folder.uri.fsPath)
          .at(0);
        if (cwd) {
          try {
            const commits = await searchCommits(message.text || "", cwd);
            await this.postMessageToWebview({
              type: "commitSearchResults",
              commits,
            });
          } catch (error) {
            console.error(`Error searching commits: ${JSON.stringify(error)}`);
          }
        }
        break;
      }
      case "openExtensionSettings": {
        const settingsFilter = message.text || "";
        await vscode.commands.executeCommand(
          "workbench.action.openSettings",
          `@ext:valkyrlabsinc.valoride-dev ${settingsFilter}`.trim(), // trim whitespace if no settings filter
        );
        break;
      }
      case "fixLayout": {
        // Execute the extension command that has the user confirmation
        try {
          await vscode.commands.executeCommand("valoride.fixLayout");
        } catch (err) {
          Logger.log(`Error executing valoride.fixLayout from webview: ${err}`);
        }
        break;
      }
      case "invoke": {
        if (message.text) {
          await this.postMessageToWebview({
            type: "invoke",
            invoke: message.text as Invoke,
          });
        }
        break;
      }
      // telemetry
      case "openSettings": {
        await this.postMessageToWebview({
          type: "action",
          action: "settingsButtonClicked",
        });
        break;
      }
      case "scrollToSettings": {
        await this.postMessageToWebview({
          type: "scrollToSettings",
          text: message.text,
        });
        break;
      }
      case "telemetrySetting": {
        if (message.telemetrySetting) {
          await this.updateTelemetrySetting(message.telemetrySetting);
        }
        await this.postStateToWebview();
        break;
      }
      case "updateSettings": {
        // api config
        if (message.apiConfiguration) {
          await updateApiConfiguration(this.context, message.apiConfiguration);
          if (this.task) {
            this.task.api = buildApiHandler(
              await this.resolveTaskApiConfiguration(message.apiConfiguration),
            );
          }
        }

        // custom instructions
        await this.updateCustomInstructions(message.customInstructionsSetting);

        // telemetry setting
        if (message.telemetrySetting) {
          await this.updateTelemetrySetting(message.telemetrySetting);
        }

        // plan act setting
        await updateGlobalState(
          this.context,
          "planActSeparateModelsSetting",
          message.planActSeparateModelsSetting,
        );

        // after settings are updated, post state to webview
        await this.postStateToWebview();

        await this.postMessageToWebview({ type: "didUpdateSettings" });
        break;
      }
      case "updateLLMDetails": {
        try {
          const selected = message.llmDetails;
          if (!selected?.id) {
            void vscode.window.showErrorMessage(
              "Unable to load LLMDetails selection.",
            );
            break;
          }

          const { apiConfiguration } = await getAllExtensionState(this.context);
          const updatedApiConfiguration: ApiConfiguration = {
            ...apiConfiguration,
            apiProvider: "valkyrai",
            apiModelId: selected.id,
            valkyraiServiceId: selected.id,
          };
          await updateApiConfiguration(this.context, updatedApiConfiguration);
          if (this.task) {
            this.task.api = buildApiHandler(
              await this.resolveTaskApiConfiguration(updatedApiConfiguration),
            );
          }

          const promptText = selected.initialPrompt?.trim();
          let normalizedSelection: SelectedLlmDetails | undefined;
          if (promptText) {
            normalizedSelection = {
              id: selected.id,
              name: selected.name || selected.id,
              description: selected.description,
              tags: selected.tags || [],
              ratingScore: selected.ratingScore,
              promptType: selected.promptType ?? "SYSTEM",
              initialPrompt: promptText,
              prompt: promptText,
              mode: (selected.promptType ?? "SYSTEM") as "SYSTEM" | "APPEND",
              source: "thorapi",
              updatedAt: Date.now(),
            };

            await updateGlobalState(
              this.context,
              "selectedLlmDetails",
              normalizedSelection,
            );

            try {
              const promptService = getLLMPromptService();
              promptService.applyManualSelection({
                llmDetailsId: normalizedSelection.id,
                name: normalizedSelection.name,
                prompt: normalizedSelection.prompt,
                mode: normalizedSelection.mode,
                tags: normalizedSelection.tags,
                source: "thorapi",
              });
            } catch (error) {
              console.error("Failed to apply prompt override:", error);
            }
          }

          try {
            const broadcaster = getSwarmPromptBroadcaster();
            const supervisorId = vscode.env.machineId || "valoride-supervisor";
            const intent = message.taskIntent || "manual-selection";
            const broadcastMessage = broadcaster.selectPromptForTask(
              supervisorId,
              intent,
              selected.id,
              normalizedSelection?.tags || selected.tags || [],
            );
            const targets =
              broadcaster.broadcastPromptSelection(broadcastMessage);
            targets.forEach((workerId) =>
              broadcaster.acknowledgePromptReload(workerId, selected.id || ""),
            );
            await this.postMessageToWebview({
              type: "swarm:broadcast",
              payload: broadcastMessage,
            });
          } catch (error) {
            console.error("Swarm prompt broadcaster unavailable:", error);
          }

          await this.postStateToWebview();
          void vscode.window.showInformationMessage(
            promptText
              ? `LLM model switched to ${selected.name || selected.id}; prompt override applied.`
              : `LLM model switched to ${selected.name || selected.id}.`,
          );
        } catch (error) {
          console.error("Failed to update LLMDetails selection:", error);
          void vscode.window.showErrorMessage(
            "Failed to update LLM prompt selection.",
          );
        }
        break;
      }
      case "requestSetBudgetLimit": {
        // Prompt user for USD budget limit and persist without toggling mode
        const { chatSettings: currentChatSettings } =
          await getAllExtensionState(this.context);
        const valueStr = await vscode.window.showInputBox({
          title: "Set budget limit",
          prompt: "Set budget limit (USD) for this task",
          value:
            currentChatSettings?.budgetLimit != null
              ? String(currentChatSettings.budgetLimit)
              : "",
          validateInput: (v) => {
            if (v.trim() === "") return null;
            const n = Number(v);
            return isFinite(n) && n >= 0 ? null : "Enter a non-negative number";
          },
        });
        if (valueStr === undefined) break; // cancelled
        const nextBudget =
          valueStr.trim() === "" ? undefined : Number(valueStr);
        const nextSettings = {
          ...(currentChatSettings ?? { mode: "act" as const }),
          budgetLimit: nextBudget,
        };
        await updateGlobalState(this.context, "chatSettings", nextSettings);
        if (this.task) this.task.chatSettings = nextSettings;
        await this.postStateToWebview();
        if (nextBudget != null) {
          vscode.window.showInformationMessage(
            `Budget limit set to $${nextBudget.toFixed(2)}`,
          );
        } else {
          vscode.window.showInformationMessage("Budget limit cleared");
        }
        break;
      }
      case "requestSetApiThrottle": {
        // Prompt user for delay between API calls (ms) and persist
        const { chatSettings: currentChatSettings } =
          await getAllExtensionState(this.context);
        const valueStr = await vscode.window.showInputBox({
          title: "Set API throttle",
          prompt: "Set delay between API calls (ms)",
          value:
            currentChatSettings?.apiThrottleMs != null
              ? String(currentChatSettings.apiThrottleMs)
              : "",
          validateInput: (v) => {
            if (v.trim() === "") return null;
            const n = Number(v);
            return Number.isInteger(n) && n >= 0
              ? null
              : "Enter a non-negative integer";
          },
        });
        if (valueStr === undefined) break; // cancelled
        const nextDelay = valueStr.trim() === "" ? undefined : Number(valueStr);
        const nextSettings = {
          ...(currentChatSettings ?? { mode: "act" as const }),
          apiThrottleMs: nextDelay,
        };
        await updateGlobalState(this.context, "chatSettings", nextSettings);
        if (this.task) this.task.chatSettings = nextSettings;
        await this.postStateToWebview();
        if (nextDelay != null) {
          vscode.window.showInformationMessage(
            `API throttle set to ${nextDelay} ms`,
          );
        } else {
          vscode.window.showInformationMessage("API throttle cleared");
        }
        break;
      }
      case "remoteCodingSessionCommand": {
        if (!message.remoteCodingCommand) {
          break;
        }

        const result = this.remoteCodingSessionOrchestrator.handle(
          message.remoteCodingCommand,
        );
        await this.postMessageToWebview({
          type: "remoteCodingSessionEvent",
          remoteCodingSessionEvent: result,
        });
        break;
      }
      case "valorBuildModeLaunchTask": {
        const workspaceRoot =
          vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        const result = coerceBuildModeTaskLaunchPayload(
          message.valorTaskBridgePayload ?? message.payload,
          { workspaceRoot },
        );
        if (!result.payload) {
          const summary = result.issues.join(" ");
          this.outputChannel.appendLine(
            `Build Mode task launch rejected: ${summary}`,
          );
          await this.postMessageToWebview({
            type: "valorBuildModeLaunchRejected",
            payload: {
              issues: result.issues,
              summary,
            },
          });
          vscode.window.showWarningMessage(
            `Build Mode task launch was rejected: ${summary}`,
          );
          break;
        }
        await this.postMessageToWebview({
          type: "valorBuildModeTask",
          valorTaskBridgePayload: result.payload,
        });
        await this.postBuildModeAutomationSnapshot();
        vscode.window.showInformationMessage(
          `Build Mode launched for ${result.payload.appBundle.name}.`,
        );
        break;
      }
      case "valorBuildModeRunCommand": {
        const payload = message.payload ?? {};
        const command = payload.command as BuildModeCommand | undefined;
        const approval = payload.approval as
          | BuildModeCommandApproval
          | undefined;
        const taskId =
          typeof payload.taskId === "string"
            ? payload.taskId
            : "build-mode-task";
        const scope = payload.scope as BuildModeScopeContext | undefined;
        const autonomyPolicy = payload.autonomyPolicy as
          | BuildModeAutonomyPolicy
          | undefined;
        const commandPolicyRules = Array.isArray(payload.commandPolicyRules)
          ? payload.commandPolicyRules
          : undefined;
        const commandCatalog = Array.isArray(payload.commandCatalog)
          ? (payload.commandCatalog as BuildModeCommand[])
          : undefined;
        const commandReceipts = Array.isArray(payload.commandReceipts)
          ? (payload.commandReceipts as BuildModeCommandReceipt[])
          : undefined;
        const agentRuntimes = Array.isArray(payload.agentRuntimes)
          ? (payload.agentRuntimes as BuildModeAgentRuntimeBinding[])
          : undefined;
        const swarmRoles = Array.isArray(payload.swarmRoles)
          ? (payload.swarmRoles as BuildModeSwarmRoleAssignment[])
          : undefined;
        const checkpoints = Array.isArray(payload.checkpoints)
          ? (payload.checkpoints as BuildModeCheckpoint[])
          : undefined;
        const executionPlan = Array.isArray(payload.executionPlan)
          ? (payload.executionPlan as BuildModeExecutionPlanStep[])
          : undefined;
        const readinessGates = Array.isArray(payload.readinessGates)
          ? (payload.readinessGates as BuildModeReadinessGate[])
          : undefined;
        const toolPermissions = Array.isArray(payload.toolPermissions)
          ? payload.toolPermissions
          : undefined;
        const currentConsecutiveCommands =
          typeof payload.currentConsecutiveCommands === "number"
            ? payload.currentConsecutiveCommands
            : undefined;
        const browserPreviewUrl =
          typeof payload.browserPreviewUrl === "string"
            ? payload.browserPreviewUrl
            : undefined;
        const estimatedCredits =
          typeof payload.estimatedCredits === "number"
            ? payload.estimatedCredits
            : undefined;
        const creditEstimateId =
          typeof payload.creditEstimateId === "string"
            ? payload.creditEstimateId
            : undefined;
        const finalReportMarkdown =
          typeof payload.finalReportMarkdown === "string"
            ? payload.finalReportMarkdown
            : undefined;
        const providerRoute =
          typeof payload.providerRoute === "string"
            ? (payload.providerRoute as ProviderRoute)
            : undefined;
        const promptContext = isBuildModePromptContextLike(
          payload.promptContext,
        )
          ? payload.promptContext
          : undefined;
        const providerCredentials = Array.isArray(payload.providerCredentials)
          ? (payload.providerCredentials as ProviderCredentialRef[])
          : undefined;
        const receipts = Array.isArray(payload.receipts)
          ? (payload.receipts as Receipt[])
          : undefined;
        const grayMatterContextPack = isGrayMatterContextPackLike(
          payload.grayMatterContextPack,
        )
          ? payload.grayMatterContextPack
          : undefined;
        const appBundle = isAppBundleLike(payload.appBundle)
          ? payload.appBundle
          : undefined;
        const requireGrayMatterContext =
          payload.requireGrayMatterContext === true;
        if (!isBuildModeCommandLike(command)) {
          vscode.window.showWarningMessage(
            "Build Mode command request was invalid.",
          );
          break;
        }

        await this.queueAndPostBuildModeCommand({
          approval,
          agentRuntimes,
          appBundle,
          autonomyPolicy,
          browserPreviewUrl,
          checkpoints,
          command,
          commandCatalog,
          commandPolicyRules,
          commandReceipts,
          currentConsecutiveCommands,
          creditEstimateId,
          dispatchSource: "command",
          estimatedCredits,
          finalReportMarkdown,
          grayMatterContextPack,
          executionPlan,
          providerCredentials,
          providerRoute,
          promptContext,
          readinessGates,
          receipts,
          requireGrayMatterContext,
          scope,
          swarmRoles,
          taskId,
          toolPermissions,
        });
        break;
      }
      case "valorBuildModeRunAutonomousQueue": {
        const payload = message.payload ?? {};
        const commands = Array.isArray(payload.commands)
          ? (payload.commands as BuildModeCommand[]).filter(
              isBuildModeCommandLike,
            )
          : [];
        const command = commands[0];
        const taskId =
          typeof payload.taskId === "string"
            ? payload.taskId
            : "build-mode-task";
        const scope = payload.scope as BuildModeScopeContext | undefined;
        const autonomyPolicy = payload.autonomyPolicy as
          | BuildModeAutonomyPolicy
          | undefined;
        const commandPolicyRules = Array.isArray(payload.commandPolicyRules)
          ? payload.commandPolicyRules
          : undefined;
        const commandCatalog = Array.isArray(payload.commandCatalog)
          ? (payload.commandCatalog as BuildModeCommand[])
          : undefined;
        const commandReceipts = Array.isArray(payload.commandReceipts)
          ? (payload.commandReceipts as BuildModeCommandReceipt[])
          : undefined;
        const agentRuntimes = Array.isArray(payload.agentRuntimes)
          ? (payload.agentRuntimes as BuildModeAgentRuntimeBinding[])
          : undefined;
        const swarmRoles = Array.isArray(payload.swarmRoles)
          ? (payload.swarmRoles as BuildModeSwarmRoleAssignment[])
          : undefined;
        const checkpoints = Array.isArray(payload.checkpoints)
          ? (payload.checkpoints as BuildModeCheckpoint[])
          : undefined;
        const executionPlan = Array.isArray(payload.executionPlan)
          ? (payload.executionPlan as BuildModeExecutionPlanStep[])
          : undefined;
        const readinessGates = Array.isArray(payload.readinessGates)
          ? (payload.readinessGates as BuildModeReadinessGate[])
          : undefined;
        const toolPermissions = Array.isArray(payload.toolPermissions)
          ? payload.toolPermissions
          : undefined;
        const currentConsecutiveCommands =
          typeof payload.currentConsecutiveCommands === "number"
            ? payload.currentConsecutiveCommands
            : undefined;
        const browserPreviewUrl =
          typeof payload.browserPreviewUrl === "string"
            ? payload.browserPreviewUrl
            : undefined;
        const estimatedCredits =
          typeof payload.estimatedCredits === "number"
            ? payload.estimatedCredits
            : undefined;
        const creditEstimateId =
          typeof payload.creditEstimateId === "string"
            ? payload.creditEstimateId
            : undefined;
        const finalReportMarkdown =
          typeof payload.finalReportMarkdown === "string"
            ? payload.finalReportMarkdown
            : undefined;
        const providerRoute =
          typeof payload.providerRoute === "string"
            ? (payload.providerRoute as ProviderRoute)
            : undefined;
        const promptContext = isBuildModePromptContextLike(
          payload.promptContext,
        )
          ? payload.promptContext
          : undefined;
        const providerCredentials = Array.isArray(payload.providerCredentials)
          ? (payload.providerCredentials as ProviderCredentialRef[])
          : undefined;
        const receipts = Array.isArray(payload.receipts)
          ? (payload.receipts as Receipt[])
          : undefined;
        const grayMatterContextPack = isGrayMatterContextPackLike(
          payload.grayMatterContextPack,
        )
          ? payload.grayMatterContextPack
          : undefined;
        const appBundle = isAppBundleLike(payload.appBundle)
          ? payload.appBundle
          : undefined;
        const requireGrayMatterContext =
          payload.requireGrayMatterContext === true;
        if (!command) {
          vscode.window.showWarningMessage(
            "Build Mode autonomous queue has no dispatchable command.",
          );
          break;
        }
        const workspaceRoot = resolveBuildModeExecutionWorkspaceRoot({
          activeWorkspaceRoot:
            vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
          scopeWorkspaceRoot: scope?.workspaceRoot,
        });
        const validation = validateBuildModeAutonomousQueueDispatch({
          agentRuntimes,
          autonomyPolicy,
          browserPreviewUrl,
          checkpoints,
          command,
          commandCatalog,
          commandReceipts,
          commandPolicyRules,
          currentConsecutiveCommands,
          estimatedCredits,
          executionPlan,
          finalReportMarkdown,
          grayMatterContextPack,
          promptContext,
          providerCredentials,
          providerRoute,
          protectedPaths: command.protectedPaths,
          readinessGates,
          receipts,
          requireGrayMatterContext,
          scope,
          swarmRoles,
          toolPermissions,
          workspaceRoot,
        });
        if (!validation.dispatchable) {
          const receipt = createBuildModeAutonomousQueueBlockedReceipt({
            agentRuntimes,
            autonomyPolicy,
            browserPreviewUrl,
            checkpoints,
            command,
            commandCatalog,
            commandReceipts,
            commandPolicyRules,
            currentConsecutiveCommands,
            estimatedCredits,
            executionPlan,
            finalReportMarkdown,
            grayMatterContextPack,
            protectedPaths: command.protectedPaths,
            promptContext,
            providerCredentials,
            providerRoute,
            readinessGates,
            receipts,
            requireGrayMatterContext,
            scope,
            swarmRoles,
            taskId,
            toolPermissions,
            validation,
            workspaceRoot,
          });
          await this.postMessageToWebview({
            type: "valorBuildModeCommandResult",
            buildModeCommandReceipt: receipt,
            payload: {
              agenticStatus:
                receipt.status === "approval-required"
                  ? "approval-required"
                  : "rejected",
              commandId: command.id,
              taskId,
            },
          });
          vscode.window.showWarningMessage(
            `Build Mode autonomous queue blocked ${command.label}: ${validation.reasons.join(" ")}`,
          );
          break;
        }

        await this.queueAndPostBuildModeCommand({
          agentRuntimes,
          appBundle,
          autonomyPolicy,
          browserPreviewUrl,
          command,
          commandCatalog,
          commandPolicyRules,
          checkpoints,
          currentConsecutiveCommands,
          creditEstimateId,
          dispatchSource: "autonomous-queue",
          estimatedCredits,
          finalReportMarkdown,
          grayMatterContextPack,
          executionPlan,
          providerCredentials,
          providerRoute,
          promptContext,
          readinessGates,
          receipts,
          requireGrayMatterContext,
          scope,
          swarmRoles,
          taskId,
          toolPermissions,
        });
        break;
      }
      case "valorBuildModeRequestAutomationSnapshot": {
        await this.postBuildModeAutomationSnapshot();
        break;
      }
      case "valorBuildModeOpenArtifact": {
        const payload = message.payload ?? {};
        const uri = typeof payload.uri === "string" ? payload.uri : undefined;
        const filePath = uri
          ? resolveBuildModeArtifactUri(
              this.context.globalStorageUri.fsPath,
              uri,
            )
          : undefined;
        if (!filePath) {
          vscode.window.showWarningMessage(
            "Build Mode artifact request was invalid.",
          );
          break;
        }
        try {
          await fs.access(filePath);
          await handleFileServiceRequest(this, "openFile", { value: filePath });
        } catch (error) {
          vscode.window.showWarningMessage(
            `Build Mode artifact could not be opened: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
        break;
      }
      case "valorBuildModeSetAutomationStatus": {
        const payload = message.payload ?? {};
        const id = typeof payload.id === "string" ? payload.id : undefined;
        const status =
          payload.status === "paused" || payload.status === "scheduled"
            ? payload.status
            : undefined;
        if (!id || !status) {
          vscode.window.showWarningMessage(
            "Build Mode automation status request was invalid.",
          );
          break;
        }
        try {
          await this.setBuildModeAutomationStatus(id, status);
          vscode.window.showInformationMessage(
            `Build Mode automation ${id} ${status === "paused" ? "paused" : "resumed"}.`,
          );
        } catch (error) {
          vscode.window.showWarningMessage(
            `Build Mode automation ${id} could not be ${status === "paused" ? "paused" : "resumed"}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
        break;
      }
      case "valorBuildModeRunDueAutomations": {
        const payload = message.payload ?? {};
        const commands = Array.isArray(payload.commands)
          ? (payload.commands as BuildModeCommand[])
          : [];
        const taskId =
          typeof payload.taskId === "string"
            ? payload.taskId
            : "build-mode-task";
        const scope = payload.scope as BuildModeScopeContext | undefined;
        const providerRoute =
          typeof payload.providerRoute === "string"
            ? (payload.providerRoute as ProviderRoute)
            : undefined;
        const promptContext = isBuildModePromptContextLike(
          payload.promptContext,
        )
          ? payload.promptContext
          : undefined;

        const run = await this.runDueBuildModeAutomations(
          commands,
          taskId,
          scope,
          new Date(),
          providerRoute,
          promptContext,
        );
        for (const receipt of run.receipts) {
          await this.postMessageToWebview({
            type: "valorBuildModeCommandResult",
            buildModeCommandReceipt: receipt,
            payload: {
              agenticStatus:
                receipt.status === "succeeded" ? "success" : "failed",
              commandId: receipt.commandId,
              taskId,
            },
          });
        }
        const snapshot = await this.getBuildModeAutomationSnapshot(new Date());
        await this.postMessageToWebview({
          type: "valorBuildModeAutomationSnapshot",
          buildModeAutomationSnapshot: snapshot,
        });

        const executedCount = run.results.filter(
          (result) =>
            result.status === "succeeded" || result.status === "failed",
        ).length;
        const skippedCount = run.results.filter(
          (result) => result.status === "skipped",
        ).length;
        const valkyraiCronCount = snapshot.records.filter(
          (record) => (record.scheduler ?? "valkyrai-cron") === "valkyrai-cron",
        ).length;
        if (executedCount === 0 && skippedCount === 0) {
          vscode.window.showInformationMessage(
            valkyraiCronCount
              ? `ValkyrAI cron owns ${valkyraiCronCount} Build Mode scheduled automation${valkyraiCronCount === 1 ? "" : "s"}; refreshed the schedule snapshot.`
              : "No Build Mode scheduled automations are registered.",
          );
        } else {
          vscode.window.showInformationMessage(
            `Build Mode processed ${executedCount} due automation${executedCount === 1 ? "" : "s"}${skippedCount ? ` and skipped ${skippedCount}` : ""}.`,
          );
        }
        break;
      }
      case "clearAllTaskHistory": {
        await this.deleteAllTaskHistory();
        await this.postStateToWebview();
        this.refreshTotalTasksSize();
        this.postMessageToWebview({ type: "relinquishControl" });
        break;
      }
      case "getDetectedChromePath": {
        try {
          const { browserSettings } = await getAllExtensionState(this.context);
          const browserSession = new BrowserSession(
            this.context,
            browserSettings,
          );
          const { path, isBundled } =
            await browserSession.getDetectedChromePath();
          await this.postMessageToWebview({
            type: "detectedChromePath",
            text: path,
            isBundled,
          });
        } catch (error) {
          console.error("Error getting detected Chrome path:", error);
        }
        break;
      }
      case "getRelativePaths": {
        if (message.uris && message.uris.length > 0) {
          const resolvedPaths = await Promise.all(
            message.uris.map(async (uriString) => {
              try {
                const fileUri = vscode.Uri.parse(uriString, true);
                const relativePath = vscode.workspace.asRelativePath(
                  fileUri,
                  false,
                );

                if (path.isAbsolute(relativePath)) {
                  console.warn(
                    `Dropped file ${relativePath} is outside the workspace. Sending original path.`,
                  );
                  return fileUri.fsPath.replace(/\\/g, "/");
                } else {
                  let finalPath = "/" + relativePath.replace(/\\/g, "/");
                  try {
                    const stat = await vscode.workspace.fs.stat(fileUri);
                    if (stat.type === vscode.FileType.Directory) {
                      finalPath += "/";
                    }
                  } catch (statError) {
                    console.error(
                      `Error stating file ${fileUri.fsPath}:`,
                      statError,
                    );
                  }
                  return finalPath;
                }
              } catch (error) {
                console.error(
                  `Error calculating relative path for ${uriString}:`,
                  error,
                );
                return null;
              }
            }),
          );
          await this.postMessageToWebview({
            type: "relativePathsResponse",
            paths: resolvedPaths,
          });
        }
        break;
      }
      case "searchFiles": {
        const workspacePath = getWorkspacePath();

        if (!workspacePath) {
          // Handle case where workspace path is not available
          await this.postMessageToWebview({
            type: "fileSearchResults",
            results: [],
            mentionsRequestId: message.mentionsRequestId,
            error: "No workspace path available",
          });
          break;
        }
        try {
          // Call file search service with query from message
          const results = await searchWorkspaceFiles(
            message.query || "",
            workspacePath,
            20, // Use default limit, as filtering is now done in the backend
          );

          // debug logging to be removed
          //console.log(`controller/index.ts: Search results: ${results.length}`)

          // Send results back to webview
          await this.postMessageToWebview({
            type: "fileSearchResults",
            results,
            mentionsRequestId: message.mentionsRequestId,
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);

          // Send error response to webview
          await this.postMessageToWebview({
            type: "fileSearchResults",
            results: [],
            error: errorMessage,
            mentionsRequestId: message.mentionsRequestId,
          });
        }
        break;
      }
      case "toggleFavoriteModel": {
        if (message.modelId) {
          const { apiConfiguration } = await getAllExtensionState(this.context);
          const favoritedModelIds = apiConfiguration.favoritedModelIds || [];

          // Toggle favorite status
          const updatedFavorites = favoritedModelIds.includes(message.modelId)
            ? favoritedModelIds.filter((id) => id !== message.modelId)
            : [...favoritedModelIds, message.modelId];

          await updateGlobalState(
            this.context,
            "favoritedModelIds",
            updatedFavorites,
          );

          // Capture telemetry for model favorite toggle
          const isFavorited = !favoritedModelIds.includes(message.modelId);

          // Post state to webview without changing any other configuration
          await this.postStateToWebview();
        }
        break;
      }
      case "grpc_request": {
        if (message.grpc_request) {
          await handleGrpcRequest(this, message.grpc_request);
        }
        break;
      }
      case "thorapiRequest": {
        if (message.thorapiRequest) {
          await this.handleThorapiWebviewRequest(message.thorapiRequest);
        }
        break;
      }
      case "getThorapiFolderContents": {
        try {
          // Get thorapi folder contents
          const thorapiFolderPath = resolveThorapiFolderPath(cwd);
          const files = await this.getThorapiFolderStructure(thorapiFolderPath);

          await this.postMessageToWebview({
            type: "workspaceFiles",
            files: files,
            mentionsRequestId: message.mentionsRequestId,
          });
        } catch (error) {
          console.error("Error getting thorapi folder contents:", error);
          await this.postMessageToWebview({
            type: "workspaceFiles",
            files: [],
            error:
              error instanceof Error
                ? error.message
                : "Failed to load thorapi folder contents",
            mentionsRequestId: message.mentionsRequestId,
          });
        }
        break;
      }
      case "promptAddGeneratedToProject": {
        try {
          const rel = message.text || "";
          const cwd = vscode.workspace.workspaceFolders
            ?.map((folder) => folder.uri.fsPath)
            .at(0);
          if (!cwd || !rel) break;
          const abs = path.resolve(cwd, rel);

          const choice = await vscode.window.showInformationMessage(
            `Add generated code at "${rel}" to your project?`,
            { modal: false },
            "Add",
            "Skip",
          );
          if (choice !== "Add") break;

          // Reuse existing command to update tsconfig aliases and includes
          await vscode.commands.executeCommand(
            "valoride.addThorAliasesFromFolder",
            vscode.Uri.file(abs),
          );
        } catch (err) {
          console.error("promptAddGeneratedToProject error", err);
          vscode.window.showWarningMessage(
            `Failed to prepare alias update: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
        break;
      }
      case "addGeneratedToProject": {
        try {
          const rel = message.text || "";
          const folderName = message.folderName || "";
          const cwd = vscode.workspace.workspaceFolders
            ?.map((folder) => folder.uri.fsPath)
            .at(0);
          if (!cwd || !rel) break;
          const abs = path.resolve(cwd, rel);

          // Reuse existing command to update tsconfig aliases and includes
          await vscode.commands.executeCommand(
            "valoride.addThorAliasesFromFolder",
            vscode.Uri.file(abs),
          );

          // Show success message
          vscode.window.showInformationMessage(
            `Successfully added "${folderName}" to your project with TypeScript aliases.`,
          );
        } catch (err) {
          console.error("addGeneratedToProject error", err);
          vscode.window.showErrorMessage(
            `Failed to add generated code to project: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
        break;
      }
      case "startServer": {
        try {
          const rel = message.text || "";
          const folderName = message.folderName || "";
          const serverType = message.serverType || "spring-boot";
          const cwd = vscode.workspace.workspaceFolders
            ?.map((folder) => folder.uri.fsPath)
            .at(0);
          if (!cwd || !rel) break;
          const abs = path.resolve(cwd, rel);

          let command: string;
          let port: string;
          let serverDescription: string;

          switch (serverType) {
            case "spring-boot":
              command = "mvn spring-boot:run";
              port = "8080";
              serverDescription = "Spring Boot development server";
              break;
            case "nestjs":
              command = "npm run start:dev";
              port = "3000";
              serverDescription = "Nest.js development server";
              break;
            case "typescript":
              command = "npm run build";
              port = "";
              serverDescription = "TypeScript client build";
              break;
            default:
              command = "npm start";
              port = "3000";
              serverDescription = "development server";
          }

          // For TypeScript client builds, also ensure tsconfig alias mapping is applied
          if (serverType === "typescript") {
            try {
              await vscode.commands.executeCommand(
                "valoride.addThorAliasesFromFolder",
                vscode.Uri.file(abs),
              );
            } catch (e) {
              console.warn(
                `Failed to update tsconfig aliases for ${folderName}: ${e instanceof Error ? e.message : String(e)}`,
              );
            }
          }

          // Open a new terminal and run the command
          const terminal = vscode.window.createTerminal({
            name: `${folderName} Server`,
            cwd: abs,
          });

          terminal.show();
          terminal.sendText(command);

          // Show success message
          const portMessage = port ? ` (localhost:${port})` : "";
          vscode.window.showInformationMessage(
            `Starting ${serverDescription} for "${folderName}"${portMessage}. Check the terminal for output.`,
          );

          // If it's a web server, offer to open in browser after a delay
          if (port && serverType !== "typescript") {
            setTimeout(() => {
              vscode.window
                .showInformationMessage(
                  `Server should be running on localhost:${port}. Open in browser?`,
                  "Open Browser",
                  "Later",
                )
                .then((choice) => {
                  if (choice === "Open Browser") {
                    void openUrlWithSimpleBrowser(
                      `http://localhost:${port}`,
                      undefined,
                    );
                  }
                });
            }, 5000); // Wait 5 seconds for server to start
          }
        } catch (err) {
          console.error("startServer error", err);
          vscode.window.showErrorMessage(
            `Failed to start server: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
        break;
      }
      case "uploadOpenAPISpec": {
        try {
          const {
            filename,
            fileContent,
            fileSize,
            jwtToken: providedJwt,
          } = message;

          if (!filename || !fileContent) {
            throw new Error("Missing filename or file content");
          }

          // Validate file size on backend as well
          const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
          if (fileSize && fileSize > MAX_FILE_SIZE) {
            throw new Error(
              `File size exceeds maximum limit of 10MB. Current size: ${(fileSize / 1024 / 1024).toFixed(2)}MB`,
            );
          }

          // Validate content type and structure
          const isJson = filename.toLowerCase().endsWith(".json");
          const isYaml =
            filename.toLowerCase().endsWith(".yaml") ||
            filename.toLowerCase().endsWith(".yml");

          if (!isJson && !isYaml) {
            throw new Error(
              "Invalid file type. Only JSON and YAML OpenAPI spec files are supported.",
            );
          }

          // Parse and validate the OpenAPI spec
          let spec: any;
          try {
            if (isJson) {
              spec = JSON.parse(fileContent);
            } else {
              // For YAML, do basic validation
              if (!fileContent || fileContent.trim().length === 0) {
                throw new Error("File is empty.");
              }
              // Check for required OpenAPI fields
              if (
                !fileContent.includes("openapi:") &&
                !fileContent.includes("swagger:") &&
                !fileContent.includes('"openapi"') &&
                !fileContent.includes('"swagger"')
              ) {
                throw new Error(
                  "File does not contain OpenAPI specification (missing 'openapi' or 'swagger' key).",
                );
              }
              spec = fileContent;
            }
          } catch (parseError) {
            const errorMsg =
              parseError instanceof Error ? parseError.message : "Parse error";
            throw new Error(`Failed to parse OpenAPI spec: ${errorMsg}`);
          }

          // Validate required OpenAPI structure
          if (isJson) {
            if (!spec.openapi && !spec.swagger) {
              throw new Error(
                "Invalid OpenAPI spec: missing required 'openapi' or 'swagger' version field.",
              );
            }
            if (!spec.info || !spec.info.title) {
              throw new Error(
                "Invalid OpenAPI spec: missing required 'info.title' field.",
              );
            }
            if (!spec.paths && !spec.components?.schemas) {
              throw new Error(
                "Invalid OpenAPI spec: missing required 'paths' or 'components.schemas' definitions.",
              );
            }
          }

          // Store the spec in a temporary location for processing
          const specsDir = path.join(
            this.context.globalStorageUri.fsPath,
            "openapi-specs",
          );
          await fs.mkdir(specsDir, { recursive: true });

          const timestamp = Date.now();
          const sanitizedFilename = filename.replace(/[^\\w.-]/g, "_");
          const specPath = path.join(
            specsDir,
            `${timestamp}_${sanitizedFilename}`,
          );
          await fs.writeFile(specPath, fileContent);

          // Send success response back to webview
          await this.postMessageToWebview({
            type: "uploadOpenAPISpecResult",
            success: true,
            filename: filename,
            specPath: specPath,
            message: `Successfully processed ${filename}. OpenAPI spec is ready for import.`,
          });

          // Get JWT token for ThorAPI call
          const jwtToken =
            providedJwt || (await getSecret(this.context, "jwtToken"));
          const axiosConfig = buildOpenApiImportConfig(filename, jwtToken);

          // Call ThorAPI /v1/thorapi/specs/import endpoint
          const apiBaseUrl = getValkyraiBasePath();
          const importUrl = `${apiBaseUrl}/thorapi/specs/import`;

          try {
            const response = await axios.post(
              importUrl,
              {
                filename: filename,
                content: fileContent,
                fileType: isJson ? "json" : "yaml",
              },
              axiosConfig,
            );

            if (response.data?.success === true || response.status === 200) {
              await this.postMessageToWebview({
                type: "uploadOpenAPISpecResult",
                success: true,
                filename: filename,
                message: `Successfully imported ${filename}. Ready to generate code.`,
              });
              console.log(
                `[uploadOpenAPISpec] Imported to ThorAPI: ${filename}`,
              );
            } else {
              throw new Error(
                response.data?.error || "ThorAPI returned unexpected response",
              );
            }
          } catch (apiError) {
            let errorMsg = "Failed to import to ThorAPI";
            if (axios.isAxiosError(apiError)) {
              if (apiError.response?.status === 401) {
                errorMsg = "Authentication failed. Please log in.";
              } else if (apiError.response?.status === 400) {
                errorMsg = `Invalid OpenAPI: ${apiError.response.data?.error || "validation failed"}`;
              } else if (apiError.code === "ECONNREFUSED") {
                errorMsg = `Cannot reach ThorAPI at ${importUrl}`;
              } else if (apiError.message) {
                errorMsg = apiError.message;
              }
            } else if (apiError instanceof Error) {
              errorMsg = apiError.message;
            }

            await this.postMessageToWebview({
              type: "uploadOpenAPISpecResult",
              success: false,
              filename: filename,
              error: errorMsg,
            });
            console.error(`[uploadOpenAPISpec] ThorAPI error: ${errorMsg}`);
            throw new Error(errorMsg);
          }
          console.log(
            `[uploadOpenAPISpec] Successfully processed: ${filename} (${(fileSize / 1024).toFixed(2)}KB)`,
          );
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Failed to process OpenAPI spec";
          console.error(`[uploadOpenAPISpec] Error: ${errorMessage}`, error);

          await this.postMessageToWebview({
            type: "uploadOpenAPISpecResult",
            success: false,
            filename: message.filename,
            error: errorMessage,
          });
        }
        break;
      }
      case "streamToThorapi": {
        const { blobData, applicationId, applicationName, filename, mimeType } =
          message;

        const sendProgress = async (step: string, progressMessage: string) => {
          if (!applicationId) {
            return;
          }
          await this.postMessageToWebview({
            type: "streamToThorapiResult",
            streamToThorapiResult: {
              success: true,
              applicationId,
              step,
              message: progressMessage,
            },
          });
        };

        try {
          if (!blobData || !applicationId) {
            throw new Error("Missing required data for streamToThorapi");
          }

          await sendProgress("receiving", "Decoding generated archive...");

          const binaryData = Buffer.from(blobData, "base64");
          const thorapiFolderPath = resolveThorapiFolderPath(cwd);
          await fs.mkdir(thorapiFolderPath, { recursive: true });

          const incomingName =
            filename?.trim() || `application-${applicationId}-${Date.now()}`;
          const sanitizedBaseName =
            path
              .basename(incomingName)
              .replace(/[\\/:*?"<>|]/g, "_")
              .trim() || `application-${applicationId}-${Date.now()}`;

          const mime = mimeType?.toLowerCase() ?? "";
          const looksLikeZip = isZipBuffer(binaryData) || mime.includes("zip");

          let finalFilename = sanitizedBaseName;
          if (looksLikeZip && !/\.zip$/i.test(finalFilename)) {
            finalFilename = `${finalFilename}.zip`;
          }

          const filePath = path.join(thorapiFolderPath, finalFilename);
          await fs.writeFile(filePath, binaryData);
          await sendProgress(
            "processing",
            `Saved archive to ${getReadablePath(filePath)}`,
          );

          let extractedPath: string | undefined;
          let readmePath: string | undefined;

          if (looksLikeZip) {
            await sendProgress("extracting", "Extracting project files...");
            try {
              extractedPath = await extractLocalZip(
                filePath,
                thorapiFolderPath,
                applicationName || applicationId,
              );
            } catch (extractionError) {
              throw new Error(
                `Failed to extract archive: ${
                  extractionError instanceof Error
                    ? extractionError.message
                    : String(extractionError)
                }`,
              );
            }

            if (extractedPath) {
              readmePath = await this.findReadmeFile(extractedPath);
              await sendProgress(
                "finalizing",
                `Extracted to ${getReadablePath(extractedPath)}`,
              );
            }

            await fs.unlink(filePath).catch((unlinkError) => {
              console.warn(
                `Failed to delete archive ${filePath}: ${
                  unlinkError instanceof Error
                    ? unlinkError.message
                    : String(unlinkError)
                }`,
              );
            });
          } else {
            await sendProgress(
              "finalizing",
              `Saved file to ${getReadablePath(filePath)}`,
            );
          }

          await this.postMessageToWebview({
            type: "streamToThorapiResult",
            streamToThorapiResult: {
              success: true,
              applicationId,
              filePath,
              filename: finalFilename,
              extractedPath,
              readmePath,
              step: "completed",
              message: looksLikeZip
                ? "Application extracted successfully."
                : "Application saved successfully.",
            },
          });
        } catch (error) {
          console.error("Error in streamToThorapi:", error);
          await this.postMessageToWebview({
            type: "streamToThorapiResult",
            streamToThorapiResult: {
              success: false,
              applicationId: message.applicationId,
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to stream to thorapi",
              step: "error",
            },
          });
        }
        break;
      }
      // Add more switch case statements here as more webview message commands
      // are created within the webview context (i.e. inside media/main.js)
    }
  }

  async updateTelemetrySetting(telemetrySetting: TelemetrySetting) {
    await updateGlobalState(this.context, "telemetrySetting", telemetrySetting);
    const isOptedIn = telemetrySetting === "enabled";
  }

  async togglePlanActModeWithChatSettings(
    chatSettings: ChatSettings,
    chatContent?: ChatContent,
  ) {
    const didSwitchToActMode = chatSettings.mode === "act";

    // Get previous model info that we will revert to after saving current mode api info
    const {
      apiConfiguration,
      previousModeApiProvider: newApiProvider,
      previousModeModelId: newModelId,
      previousModeModelInfo: newModelInfo,
      previousModeVsCodeLmModelSelector: newVsCodeLmModelSelector,
      previousModeThinkingBudgetTokens: newThinkingBudgetTokens,
      previousModeReasoningEffort: newReasoningEffort,
      planActSeparateModelsSetting,
    } = await getAllExtensionState(this.context);

    const shouldSwitchModel = planActSeparateModelsSetting === true;

    if (shouldSwitchModel) {
      // Save the last model used in this mode
      await updateGlobalState(
        this.context,
        "previousModeApiProvider",
        apiConfiguration.apiProvider,
      );
      await updateGlobalState(
        this.context,
        "previousModeThinkingBudgetTokens",
        apiConfiguration.thinkingBudgetTokens,
      );
      await updateGlobalState(
        this.context,
        "previousModeReasoningEffort",
        apiConfiguration.reasoningEffort,
      );
      switch (apiConfiguration.apiProvider) {
        case "anthropic":
        case "bedrock":
        case "vertex":
        case "gemini":
        case "asksage":
        case "openai-native":
        case "qwen":
        case "deepseek":
        case "moonshot":
        case "minimax":
        case "xai":
        case "valkyrai":
          await updateGlobalState(
            this.context,
            "previousModeModelId",
            apiConfiguration.apiModelId,
          );
          break;
        case "openrouter":
        case "valoride":
          await updateGlobalState(
            this.context,
            "previousModeModelId",
            apiConfiguration.openRouterModelId,
          );
          await updateGlobalState(
            this.context,
            "previousModeModelInfo",
            apiConfiguration.openRouterModelInfo,
          );
          break;
        case "vscode-lm":
          // Important we don't set modelId to this, as it's an object not string (webview expects model id to be a string)
          await updateGlobalState(
            this.context,
            "previousModeVsCodeLmModelSelector",
            apiConfiguration.vsCodeLmModelSelector,
          );
          break;
        case "openai":
          await updateGlobalState(
            this.context,
            "previousModeModelId",
            apiConfiguration.openAiModelId,
          );
          await updateGlobalState(
            this.context,
            "previousModeModelInfo",
            apiConfiguration.openAiModelInfo,
          );
          break;
        case "ollama":
          await updateGlobalState(
            this.context,
            "previousModeModelId",
            apiConfiguration.ollamaModelId,
          );
          break;
        case "lmstudio":
          await updateGlobalState(
            this.context,
            "previousModeModelId",
            apiConfiguration.lmStudioModelId,
          );
          break;
        case "litellm":
          await updateGlobalState(
            this.context,
            "previousModeModelId",
            apiConfiguration.liteLlmModelId,
          );
          break;
        case "requesty":
          await updateGlobalState(
            this.context,
            "previousModeModelId",
            apiConfiguration.requestyModelId,
          );
          await updateGlobalState(
            this.context,
            "previousModeModelInfo",
            apiConfiguration.requestyModelInfo,
          );
          break;
      }

      // Restore the model used in previous mode
      if (
        newApiProvider ||
        newModelId ||
        newThinkingBudgetTokens !== undefined ||
        newReasoningEffort ||
        newVsCodeLmModelSelector
      ) {
        await updateGlobalState(this.context, "apiProvider", newApiProvider);
        await updateGlobalState(
          this.context,
          "thinkingBudgetTokens",
          newThinkingBudgetTokens,
        );
        await updateGlobalState(
          this.context,
          "reasoningEffort",
          newReasoningEffort,
        );
        switch (newApiProvider) {
          case "anthropic":
          case "bedrock":
          case "vertex":
          case "gemini":
          case "asksage":
          case "openai-native":
          case "qwen":
          case "deepseek":
          case "moonshot":
          case "minimax":
          case "xai":
          case "valkyrai":
            await updateGlobalState(this.context, "apiModelId", newModelId);
            if (apiConfiguration.apiProvider === "valkyrai") {
              await updateGlobalState(
                this.context,
                "valkyraiServiceId",
                newModelId,
              );
            }
            break;
          case "openrouter":
          case "valoride":
            await updateGlobalState(
              this.context,
              "openRouterModelId",
              newModelId,
            );
            await updateGlobalState(
              this.context,
              "openRouterModelInfo",
              newModelInfo,
            );
            break;
          case "vscode-lm":
            await updateGlobalState(
              this.context,
              "vsCodeLmModelSelector",
              newVsCodeLmModelSelector,
            );
            break;
          case "openai":
            await updateGlobalState(this.context, "openAiModelId", newModelId);
            await updateGlobalState(
              this.context,
              "openAiModelInfo",
              newModelInfo,
            );
            break;
          case "ollama":
            await updateGlobalState(this.context, "ollamaModelId", newModelId);
            break;
          case "lmstudio":
            await updateGlobalState(
              this.context,
              "lmStudioModelId",
              newModelId,
            );
            break;
          case "litellm":
            await updateGlobalState(this.context, "liteLlmModelId", newModelId);
            break;
          case "requesty":
            await updateGlobalState(
              this.context,
              "requestyModelId",
              newModelId,
            );
            await updateGlobalState(
              this.context,
              "requestyModelInfo",
              newModelInfo,
            );
            break;
        }

        if (this.task) {
          const { apiConfiguration: updatedApiConfiguration } =
            await getAllExtensionState(this.context);
          this.task.api = buildApiHandler(
            await this.resolveTaskApiConfiguration(updatedApiConfiguration),
          );
        }
      }
    }

    await updateGlobalState(this.context, "chatSettings", chatSettings);
    await this.postStateToWebview();

    if (this.task) {
      this.task.chatSettings = chatSettings;
      if (this.task.isAwaitingPlanResponse && didSwitchToActMode) {
        this.task.didRespondToPlanAskBySwitchingMode = true;
        // Use chatContent if provided, otherwise use default message
        await this.postMessageToWebview({
          type: "invoke",
          invoke: "sendMessage",
          text: chatContent?.message || "PLAN_MODE_TOGGLE_RESPONSE",
          images: chatContent?.images,
        });
      } else {
        this.cancelTask();
      }
    }
  }

  async cancelTask() {
    if (this.task) {
      const { historyItem } = await this.getTaskWithId(this.task.taskId);
      try {
        await this.task.abortTask();
      } catch (error) {
        console.error("Failed to abort task", error);
      }
      await pWaitFor(
        () =>
          this.task === undefined ||
          this.task.isStreaming === false ||
          this.task.didFinishAbortingStream ||
          this.task.isWaitingForFirstChunk, // if only first chunk is processed, then there's no need to wait for graceful abort (closes edits, browser, etc)
        {
          timeout: 3_000,
        },
      ).catch(() => {
        console.error("Failed to abort task");
      });
      if (this.task) {
        // 'abandoned' will prevent this valoride instance from affecting future valoride instance gui. this may happen if its hanging on a streaming request
        this.task.abandoned = true;
      }
      await this.initTask(undefined, undefined, historyItem); // clears task again, so we need to abortTask manually above
      // await this.postStateToWebview() // new ValorIDE instance will post state when it's ready. having this here sent an empty messages array to webview leading to virtuoso having to reload the entire list
    }
  }

  async updateCustomInstructions(instructions?: string) {
    // User may be clearing the field
    await updateGlobalState(
      this.context,
      "customInstructions",
      instructions || undefined,
    );
    if (this.task) {
      this.task.customInstructions = instructions || undefined;
    }
  }

  // VSCode LM API

  private async getVsCodeLmModels() {
    try {
      const models = await vscode.lm.selectChatModels({});
      return models || [];
    } catch (error) {
      console.error("Error fetching VS Code LM models:", error);
      return [];
    }
  }

  // Ollama

  async getOllamaModels(baseUrl?: string) {
    try {
      if (!baseUrl) {
        baseUrl = "http://localhost:11434";
      }
      if (!URL.canParse(baseUrl)) {
        return [];
      }
      const response = await axios.get(`${baseUrl}/api/tags`);
      const modelsArray =
        response.data?.models?.map((model: any) => model.name) || [];
      const models = [...new Set<string>(modelsArray)];
      return models;
    } catch (error) {
      return [];
    }
  }

  // LM Studio

  async getLmStudioModels(baseUrl?: string) {
    try {
      if (!baseUrl) {
        baseUrl = "http://localhost:1234";
      }
      if (!URL.canParse(baseUrl)) {
        return [];
      }
      const response = await axios.get(`${baseUrl}/v1/models`);
      const modelsArray =
        response.data?.data?.map((model: any) => model.id) || [];
      const models = [...new Set<string>(modelsArray)];
      return models;
    } catch (error) {
      return [];
    }
  }

  // Auth

  public async validateAuthState(state: string | null): Promise<boolean> {
    const storedNonce = await getSecret(this.context, "authNonce");
    if (!state || state !== storedNonce) {
      return false;
    }
    await storeSecret(this.context, "authNonce", undefined); // Clear after use
    return true;
  }

  async handleAuthCallback(
    customToken: string,
    apiKey: string,
    authenticatedPrincipal?: any,
  ) {
    try {
      // Store API key for API calls
      await storeSecret(this.context, "valorideApiKey", apiKey);

      // Store JWT token for ThorAPI requests
      await storeSecret(this.context, "jwtToken", customToken);

      // Store authenticated principal in backend state
      if (authenticatedPrincipal) {
        await updateGlobalState(
          this.context,
          "userInfo",
          authenticatedPrincipal,
        );
        await updateGlobalState(
          this.context,
          "authenticatedPrincipal",
          authenticatedPrincipal,
        );
        await this.storeTenantContextFromPayloads(authenticatedPrincipal);
      }

      // Store authentication state flags
      await updateGlobalState(this.context, "isLoggedIn", true);
      await this.refreshGrayMatterSessionState(customToken);

      // Send login success message to webview with all auth data
      await this.postMessageToWebview({
        type: "loginSuccess",
        token: customToken,
        authenticatedPrincipal: authenticatedPrincipal
          ? JSON.stringify(authenticatedPrincipal)
          : undefined,
      });

      const valkyraiProvider: ApiProvider = "valkyrai";
      await updateGlobalState(this.context, "apiProvider", valkyraiProvider);

      // Update API configuration with the new provider and API key
      const { apiConfiguration } = await getAllExtensionState(this.context);
      const updatedConfig = {
        ...apiConfiguration,
        apiProvider: valkyraiProvider,
        valorideApiKey: apiKey,
      };

      if (this.task) {
        this.task.api = buildApiHandler(
          await this.resolveTaskApiConfiguration(updatedConfig),
        );
      }

      await this.postStateToWebview();
      // vscode.window.showInformationMessage("Successfully logged in to ValorIDE")
    } catch (error) {
      console.error("Failed to handle auth callback:", error);
      vscode.window.showErrorMessage("Failed to log in to ValorIDE");
      // Even on login failure, we preserve any existing tokens
      // Only clear tokens on explicit logout
    }
  }

  private async refreshGrayMatterSessionState(token?: string) {
    const resolvedToken = token || (await getSecret(this.context, "jwtToken"));
    const tenantContext = await this.readStoredTenantContext();
    const grayMatterSession = await createGrayMatterSessionState({
      baseUrl: getValkyraiBasePath(),
      tenantContext,
      token: resolvedToken,
    });
    await updateGlobalState(
      this.context,
      "grayMatterSession",
      grayMatterSession,
    );
    getStatusBarService().updateGrayMatterStatus(
      grayMatterSession.status,
      grayMatterSession.error,
    );
    return grayMatterSession;
  }

  private async storeTenantContextFromPayloads(...payloads: unknown[]) {
    const tenantContext = mergeTenantContext(
      ...payloads.map((payload) => extractTenantContext(payload)),
    );
    if (tenantContext.tenantId) {
      await this.context.secrets.store(
        "tenantContext",
        JSON.stringify(tenantContext),
      );
    }
  }

  private normalizePrincipalPayload(payload: unknown) {
    if (!payload) {
      return undefined;
    }
    if (typeof payload === "string") {
      try {
        const parsed = JSON.parse(payload);
        return parsed && typeof parsed === "object" ? parsed : undefined;
      } catch {
        return undefined;
      }
    }
    return typeof payload === "object" ? payload : undefined;
  }

  private async readStoredTenantContext() {
    const authenticatedPrincipal = await getGlobalState(
      this.context,
      "authenticatedPrincipal",
    );
    const userInfo = await getGlobalState(this.context, "userInfo");
    const rawTenantContext = await this.context.secrets.get("tenantContext");
    let tenantSecret = undefined;
    if (rawTenantContext) {
      try {
        tenantSecret = JSON.parse(rawTenantContext);
      } catch {
        tenantSecret = undefined;
      }
    }
    return mergeTenantContext(
      extractTenantContext(authenticatedPrincipal),
      extractTenantContext(userInfo),
      tenantSecret,
    );
  }

  private async readStoredJwtToken() {
    return (
      (await getSecret(this.context, "jwtToken")) ||
      (await this.context.secrets.get("valor_jwt_token")) ||
      (await getSecret(this.context, "valkyraiJwt"))
    );
  }

  private async retrySwarmRegistration(reason: string): Promise<void> {
    try {
      const jwtToken = await this.readStoredJwtToken();
      const { authenticatedPrincipal, userInfo, agenticState } =
        await getAllExtensionState(this.context);
      const currentAgenticState =
        createAgenticCommandCenterState(agenticState);

      if (!jwtToken) {
        const nextAgenticState = updateSwarmState(currentAgenticState, {
          lastError: "Sign in before connecting SWARM.",
          status: "offline",
        });
        await updateGlobalState(this.context, "agenticState", nextAgenticState);
        await this.postStateToWebview();
        Logger.log(`SWARM retry skipped (${reason}): missing JWT token`);
        return;
      }

      const principal = (authenticatedPrincipal || userInfo || {}) as {
        id?: string;
        principalId?: string;
      };
      await initializeAgentRuntimeCoordinator(this.context, jwtToken, {
        id: principal.id || principal.principalId,
      });
      await this.postStateToWebview();
    } catch (error) {
      const { agenticState } = await getAllExtensionState(this.context);
      const nextAgenticState = updateSwarmState(
        createAgenticCommandCenterState(agenticState),
        {
          lastError: error instanceof Error ? error.message : String(error),
          status: "error",
        },
      );
      await updateGlobalState(this.context, "agenticState", nextAgenticState);
      await this.postStateToWebview();
      Logger.log(`SWARM retry failed (${reason}): ${String(error)}`);
    }
  }

  private resolveThorapiWebviewUrl(url: string): string {
    const basePath = getValkyraiBasePath().replace(/\/+$/, "");
    const baseUrl = new URL(`${basePath}/`);
    const resolved = new URL(url, baseUrl);

    if (
      resolved.origin !== baseUrl.origin ||
      !resolved.pathname.startsWith(baseUrl.pathname.replace(/\/$/, ""))
    ) {
      throw new Error("Refusing ThorAPI request outside configured API host");
    }

    return resolved.toString();
  }

  private async handleThorapiWebviewRequest(
    request: NonNullable<WebviewMessage["thorapiRequest"]>,
  ) {
    const { requestId } = request;
    try {
      const token = await this.readStoredJwtToken();
      const tenantHeaders = buildTenantHeaders(
        await this.readStoredTenantContext(),
      );
      const headers: Record<string, string> = {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(request.headers ?? {}),
        ...tenantHeaders,
      };

      const hasAuthorizationHeader = Object.keys(headers).some(
        (key) => key.toLowerCase() === "authorization",
      );
      const hasJwtSessionHeader = Object.keys(headers).some(
        (key) => key.toLowerCase() === "jwtsession",
      );

      if (token && !hasAuthorizationHeader) {
        headers.authorization = `Bearer ${token}`;
      }
      if (token && !hasJwtSessionHeader) {
        headers.jwtSession = token;
      }

      const response = await axios.request({
        url: this.resolveThorapiWebviewUrl(request.url),
        method: request.method || "GET",
        data: request.body,
        params: request.params,
        headers,
        responseType:
          request.responseType === "arraybuffer" ? "arraybuffer" : "json",
        timeout: 30000,
        validateStatus: () => true,
      });
      const responseHeaders = Object.fromEntries(
        Object.entries(response.headers).map(([key, value]) => [
          key,
          Array.isArray(value) ? value.join(", ") : String(value),
        ]),
      );
      const responseBuffer =
        request.responseType === "arraybuffer"
          ? Buffer.isBuffer(response.data)
            ? response.data
            : Buffer.from(response.data)
          : undefined;

      await this.postMessageToWebview({
        type: "thorapiResponse",
        thorapiResponse: {
          requestId,
          ok: response.status >= 200 && response.status < 300,
          status: response.status,
          statusText: response.statusText,
          data:
            request.responseType === "arraybuffer" ? undefined : response.data,
          headers: responseHeaders,
          bodyBase64: responseBuffer?.toString("base64"),
        },
      });
    } catch (error) {
      const status = axios.isAxiosError(error)
        ? error.response?.status
        : undefined;
      const statusText = axios.isAxiosError(error)
        ? error.response?.statusText
        : undefined;
      const data = axios.isAxiosError(error) ? error.response?.data : undefined;
      const errorMessage =
        error instanceof Error ? error.message : "ThorAPI request failed";

      await this.postMessageToWebview({
        type: "thorapiResponse",
        thorapiResponse: {
          requestId,
          ok: false,
          status,
          statusText,
          data,
          error: errorMessage,
        },
      });
    }
  }

  // MCP Marketplace

  private async fetchMcpMarketplaceFromApi(
    silent: boolean = false,
  ): Promise<McpMarketplaceCatalog | undefined> {
    try {
      const token = await this.readStoredJwtToken();
      const tenantHeaders = buildTenantHeaders(
        await this.readStoredTenantContext(),
      );
      const headers: Record<string, string> = {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...tenantHeaders,
      };
      if (token) {
        headers["authorization"] = `Bearer ${token}`;
        headers.jwtSession = token;
      }

      const basePath = getValkyraiBasePath().replace(/\/+$/, "");
      const endpoints = [
        `${basePath}/McpMarketplaceItem`,
        `${basePath}/McpMarketplaceCatalog`,
        `${basePath}/McpMarketplace`,
      ];
      let responseData: unknown;
      let lastError: unknown;

      for (const endpoint of endpoints) {
        try {
          const response = await axios.get(endpoint, {
            headers,
            timeout: 10000,
          });
          responseData = response.data;
          lastError = undefined;
          break;
        } catch (error) {
          lastError = error;
          if (!axios.isAxiosError(error) || error.response?.status !== 404) {
            throw error;
          }
        }
      }

      if (lastError) {
        const catalog: McpMarketplaceCatalog = { items: [] };
        await updateGlobalState(this.context, "mcpMarketplaceCatalog", catalog);
        return catalog;
      }

      const extractMarketplaceItems = (payload: unknown): unknown[] => {
        const source = (payload as any)?.data ?? payload;
        if (Array.isArray(source)) {
          if (source.some((item) => Array.isArray((item as any)?.items))) {
            return source.flatMap((item) => extractMarketplaceItems(item));
          }
          return source;
        }
        if (Array.isArray((source as any)?.content)) {
          return extractMarketplaceItems((source as any).content);
        }
        if (Array.isArray((source as any)?.results)) {
          return extractMarketplaceItems((source as any).results);
        }
        if (Array.isArray((source as any)?.items)) {
          return extractMarketplaceItems((source as any).items);
        }
        return [];
      };
      const normalizeMarketplaceItem = (item: any): McpMarketplaceItem => ({
        mcpId:
          item?.mcpId ||
          item?.mcpServerId ||
          item?.slug ||
          item?.serviceId ||
          item?.id ||
          item?.name ||
          "",
        mcpServerId: item?.mcpServerId,
        slug: item?.slug,
        serviceId: item?.serviceId || item?.service?.id,
        applicationId: item?.applicationId || item?.application?.id,
        apiBaseUrl: item?.apiBaseUrl,
        manifestUrl: item?.manifestUrl,
        githubUrl: item?.githubUrl || item?.repoUrl || "",
        repoUrl: item?.repoUrl,
        name: item?.name || item?.displayName || "Unknown MCP",
        displayName: item?.displayName,
        author: item?.author || item?.creator || item?.owner || "",
        description: item?.description || item?.summary || "",
        icon: item?.icon || "",
        logoUrl: item?.logoUrl || item?.iconUrl || "",
        category: item?.category || "Uncategorized",
        tags: Array.isArray(item?.tags)
          ? item.tags
              .map((tag: any) =>
                typeof tag === "string" ? tag : tag?.name || tag?.label || "",
              )
              .filter(Boolean)
          : [],
        requiresApiKey: Boolean(item?.requiresApiKey),
        readmeContent: item?.readmeContent,
        llmsInstallationContent: item?.llmsInstallationContent,
        isRecommended: Boolean(item?.isRecommended || item?.curated),
        githubStars: Number(item?.githubStars ?? item?.stars ?? 0) || 0,
        downloadCount:
          Number(item?.downloadCount ?? item?.installCount ?? 0) || 0,
        createdAt: String(item?.createdAt ?? item?.createdDate ?? ""),
        updatedAt: String(item?.updatedAt ?? item?.lastModifiedDate ?? ""),
        lastGithubSync: String(item?.lastGithubSync ?? item?.updatedAt ?? ""),
      });
      const items = extractMarketplaceItems(responseData).map(
        normalizeMarketplaceItem,
      );
      const catalog: McpMarketplaceCatalog = { items };

      // Store in global state
      await updateGlobalState(this.context, "mcpMarketplaceCatalog", catalog);
      return catalog;
    } catch (error) {
      let errorMessage = "Failed to fetch MCP marketplace";

      if (axios.isAxiosError(error)) {
        if (error.code === "ECONNABORTED") {
          errorMessage = "MCP marketplace request timed out. Please try again.";
        } else if (error.response?.status === 404) {
          errorMessage =
            "MCP marketplace service is not available (404). Please check if the service is running.";
        } else if (error.response?.status === 500) {
          errorMessage =
            "MCP marketplace service encountered an internal error. Please try again later.";
        } else if (error.response?.status === 503) {
          errorMessage =
            "MCP marketplace service is temporarily unavailable. Please try again later.";
        } else if (!error.response && error.request) {
          errorMessage =
            "Cannot connect to MCP marketplace service. Please check your network connection.";
        } else if (error.response) {
          errorMessage = `MCP marketplace service returned error ${error.response.status}: ${error.response.statusText}`;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      console.error("Failed to fetch MCP marketplace:", error);

      if (!silent) {
        await this.postMessageToWebview({
          type: "mcpMarketplaceCatalog",
          error: errorMessage,
        });
        vscode.window.showErrorMessage(errorMessage);
      }
      return undefined;
    }
  }

  async silentlyRefreshMcpMarketplace() {
    try {
      const catalog = await this.fetchMcpMarketplaceFromApi(true);
      if (catalog) {
        await this.postMessageToWebview({
          type: "mcpMarketplaceCatalog",
          mcpMarketplaceCatalog: catalog,
        });
      }
    } catch (error) {
      console.error("Failed to silently refresh MCP marketplace:", error);
    }
  }

  private async fetchMcpMarketplace(forceRefresh: boolean = false) {
    try {
      // Check if we have cached data
      const cachedCatalog = (await getGlobalState(
        this.context,
        "mcpMarketplaceCatalog",
      )) as McpMarketplaceCatalog | undefined;
      if (!forceRefresh && cachedCatalog?.items) {
        await this.postMessageToWebview({
          type: "mcpMarketplaceCatalog",
          mcpMarketplaceCatalog: cachedCatalog,
        });
        return;
      }

      const catalog = await this.fetchMcpMarketplaceFromApi(false);
      if (catalog) {
        await this.postMessageToWebview({
          type: "mcpMarketplaceCatalog",
          mcpMarketplaceCatalog: catalog,
        });
      }
    } catch (error) {
      console.error("Failed to handle cached MCP marketplace:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to handle cached MCP marketplace";
      await this.postMessageToWebview({
        type: "mcpMarketplaceCatalog",
        error: errorMessage,
      });
      vscode.window.showErrorMessage(errorMessage);
    }
  }

  private async downloadMcp(
    mcpId: string,
    marketplaceItem?: McpMarketplaceItem,
  ) {
    try {
      const getMarketplaceAliases = (
        item?: Partial<McpMarketplaceItem>,
      ): string[] => {
        const aliases = [
          item?.mcpServerId,
          item?.slug,
          item?.serviceId,
          item?.mcpId,
          item?.name,
          item?.displayName,
        ]
          .map((value) => String(value ?? "").trim())
          .filter(Boolean);
        const lowerAliases = aliases.map((alias) => alias.toLowerCase());
        if (
          lowerAliases.some(
            (alias) =>
              alias === "graymatter" || alias.includes("graymatter"),
          )
        ) {
          aliases.push("graymatter-memory");
        }
        return Array.from(new Set(aliases));
      };

      const cachedCatalog = (await getGlobalState(
        this.context,
        "mcpMarketplaceCatalog",
      )) as McpMarketplaceCatalog | undefined;
      const target = String(mcpId).trim().toLowerCase();
      const cachedMarketplaceItem = cachedCatalog?.items?.find((item) =>
        getMarketplaceAliases(item).some(
          (alias) => alias.toLowerCase() === target,
        ),
      );
      const sourceItem = marketplaceItem || cachedMarketplaceItem;
      const aliases = getMarketplaceAliases(sourceItem);
      const serviceIdentifiers = Array.from(new Set([mcpId, ...aliases]))
        .map((value) => String(value).trim())
        .filter(Boolean);

      // First check if we already have this MCP server installed
      const servers = this.mcpHub?.getServers() || [];
      const isInstalled = servers.some((server: McpServer) =>
        serviceIdentifiers.some(
          (identifier) =>
            server.name.toLowerCase() === identifier.toLowerCase(),
        ),
      );

      if (isInstalled) {
        throw new Error("This MCP server is already installed");
      }

      // Get JWT token for authentication (same as ApplicationService)
      const token = await this.readStoredJwtToken();
      const tenantHeaders = buildTenantHeaders(
        await this.readStoredTenantContext(),
      );
      const headers: any = {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...tenantHeaders,
      };
      if (token) {
        headers["authorization"] = `Bearer ${token}`;
        headers.jwtSession = token;
      }

      const getServiceByIdentifier = async (identifier: string) =>
        axios.get<any>(
          `${getValkyraiBasePath()}/mcp/services/${encodeURIComponent(identifier)}`,
          {
            headers,
            timeout: 10000,
          },
        );

      let response: any;
      let resolvedServiceId = serviceIdentifiers[0] || mcpId;
      let lastLookupError: unknown;

      for (const identifier of serviceIdentifiers) {
        try {
          response = await getServiceByIdentifier(identifier);
          resolvedServiceId = identifier;
          lastLookupError = undefined;
          break;
        } catch (error) {
          lastLookupError = error;
          const isNotFound =
            axios.isAxiosError(error) && error.response?.status === 404;

          if (!isNotFound) {
            throw error;
          }
        }
      }

      if (!response) {
        // Fallback: resolve marketplace item IDs to a concrete service identifier
        // (slug, id, or name) then retry /mcp/services/{slug}.
        try {
          const serviceListResponse = await axios.get<any>(
            `${getValkyraiBasePath()}/mcp/services`,
            {
              headers,
              timeout: 10000,
            },
          );

          const services = Array.isArray(serviceListResponse.data)
            ? serviceListResponse.data
            : [];
          const targetIdentifiers = serviceIdentifiers.map((identifier) =>
            identifier.toLowerCase(),
          );

          const matchedService = services.find((service: any) => {
            const candidates = [
              service?.slug,
              service?.id,
              service?.mcpServerId,
              service?.name,
              service?.displayName,
            ]
              .filter((value) => value !== undefined && value !== null)
              .map((value) => String(value).trim().toLowerCase());

            return candidates.some((candidate) =>
              targetIdentifiers.includes(candidate),
            );
          });

          const fallbackIdentifier =
            matchedService?.slug ||
            matchedService?.id ||
            matchedService?.mcpServerId ||
            matchedService?.name;

          if (fallbackIdentifier) {
            resolvedServiceId = String(fallbackIdentifier);
            response = await getServiceByIdentifier(resolvedServiceId);
          }
        } catch (error) {
          lastLookupError = error;
        }
      }

      if (!response?.data && !sourceItem) {
        throw lastLookupError instanceof Error
          ? lastLookupError
          : new Error("MCP server not found in marketplace.");
      }

      console.log("[downloadMcp] Response from MCP services API", { response });

      const mcpService = response?.data ?? sourceItem ?? {};
      const normalizedMcpId =
        mcpService.slug ||
        mcpService.mcpServerId ||
        mcpService.serviceId ||
        mcpService.id ||
        sourceItem?.mcpId ||
        resolvedServiceId ||
        mcpId;

      // Construct the download details response from the service registry
      const mcpDetails: McpDownloadResponse = {
        mcpId: String(normalizedMcpId),
        name:
          mcpService.displayName ||
          mcpService.name ||
          mcpService.slug ||
          String(normalizedMcpId),
        author:
          mcpService.author ||
          mcpService.creator ||
          mcpService.owner ||
          "Unknown",
        description: mcpService.description || sourceItem?.description || "",
        githubUrl:
          mcpService.githubUrl ||
          mcpService.repoUrl ||
          sourceItem?.githubUrl ||
          sourceItem?.repoUrl ||
          "",
        llmsInstallationContent:
          mcpService.llmsInstallationContent ||
          sourceItem?.llmsInstallationContent ||
          "",
        readmeContent:
          mcpService.readmeContent || sourceItem?.readmeContent || "",
        requiresApiKey: Boolean(
          mcpService.requiresApiKey || sourceItem?.requiresApiKey,
        ),
      };

      if (!mcpDetails.readmeContent) {
        mcpDetails.readmeContent = `# ${mcpDetails.name}\n\n${mcpDetails.description}\n\nAuthor: ${mcpDetails.author}`;
      }

      // Send details to webview
      await this.postMessageToWebview({
        type: "mcpDownloadDetails",
        mcpDownloadDetails: mcpDetails,
      });

      // Create task with context from README and added guidelines for MCP server installation
      const task = `Set up the MCP server from ${mcpDetails.githubUrl} while adhering to these MCP server installation rules:
- Start by loading the MCP documentation.
- Use "${mcpDetails.mcpId}" as the server name in valoride_mcp_settings.json.
- Create the directory for the new MCP server before starting installation.
- Make sure you read the user's existing valoride_mcp_settings.json file before editing it with this new mcp, to not overwrite any existing servers.
- Use commands aligned with the user's shell and operating system best practices.
- The following README may contain instructions that conflict with the user's OS, in which case proceed thoughtfully.
- Once installed, demonstrate the server's capabilities by using one of its tools.
Here is the project's README to help you get started:\n\n${mcpDetails.readmeContent}\n${mcpDetails.llmsInstallationContent}`;

      // Initialize task and show chat view
      await this.initTask(task);
      await this.postMessageToWebview({
        type: "action",
        action: "chatButtonClicked",
      });
    } catch (error) {
      console.error("Failed to download MCP:", error);
      let errorMessage = "Failed to download MCP";

      if (axios.isAxiosError(error)) {
        if (error.code === "ECONNABORTED") {
          errorMessage = "Request timed out. Please try again.";
        } else if (error.response?.status === 404) {
          errorMessage = "MCP server not found in marketplace.";
        } else if (error.response?.status === 500) {
          errorMessage = "Internal server error. Please try again later.";
        } else if (!error.response && error.request) {
          errorMessage =
            "Network error. Please check your internet connection.";
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      // Show error in both notification and marketplace UI
      vscode.window.showErrorMessage(errorMessage);
      await this.postMessageToWebview({
        type: "mcpDownloadDetails",
        error: errorMessage,
      });
    }
  }

  // OpenAi

  async getOpenAiModels(baseUrl?: string, apiKey?: string) {
    try {
      if (!baseUrl) {
        return [];
      }

      if (!URL.canParse(baseUrl)) {
        return [];
      }

      const config: AxiosRequestConfig = {};
      if (apiKey) {
        config["headers"] = { Authorization: `Bearer ${apiKey}` };
      }

      const response = await axios.get(`${baseUrl}/models`, config);
      const modelsArray =
        response.data?.data?.map((model: any) => model.id) || [];
      const models = [...new Set<string>(modelsArray)];
      return models;
    } catch (error) {
      return [];
    }
  }

  // OpenRouter

  async handleOpenRouterCallback(code: string) {
    let apiKey: string;
    try {
      const response = await axios.post(
        "https://openrouter.ai/api/v1/auth/keys",
        { code },
      );
      if (response.data && response.data.key) {
        apiKey = response.data.key;
      } else {
        throw new Error("Invalid response from OpenRouter API");
      }
    } catch (error) {
      console.error("Error exchanging code for API key:", error);
      throw error;
    }

    const openrouter: ApiProvider = "openrouter";
    await updateGlobalState(this.context, "apiProvider", openrouter);
    await storeSecret(this.context, "openRouterApiKey", apiKey);
    await this.postStateToWebview();
    if (this.task) {
      this.task.api = buildApiHandler({
        apiProvider: openrouter,
        openRouterApiKey: apiKey,
      });
    }
    // await this.postMessageToWebview({ type: "action", action: "settingsButtonClicked" }) // bad ux if user is on welcome
  }

  private async ensureCacheDirectoryExists(): Promise<string> {
    const cacheDir = path.join(this.context.globalStorageUri.fsPath, "cache");
    await fs.mkdir(cacheDir, { recursive: true });
    return cacheDir;
  }

  async readOpenRouterModels(): Promise<Record<string, ModelInfo> | undefined> {
    const openRouterModelsFilePath = path.join(
      await this.ensureCacheDirectoryExists(),
      GlobalFileNames.openRouterModels,
    );
    const fileExists = await fileExistsAtPath(openRouterModelsFilePath);
    if (fileExists) {
      const fileContents = await fs.readFile(openRouterModelsFilePath, "utf8");
      return JSON.parse(fileContents);
    }
    return undefined;
  }

  async refreshOpenRouterModels() {
    const openRouterModelsFilePath = path.join(
      await this.ensureCacheDirectoryExists(),
      GlobalFileNames.openRouterModels,
    );

    let models: Record<string, ModelInfo> = {};
    try {
      const response = await axios.get("https://openrouter.ai/api/v1/models");
      /*
      {
        "id": "anthropic/claude-3.5-sonnet",
        "name": "Anthropic: ClaudeX 3.5 Sonnet",
        "created": 1718841600,
        "description": "ClaudeX 3.5 Sonnet delivers better-than-Opus capabilities, faster-than-Sonnet speeds, at the same Sonnet prices. Sonnet is particularly good at:\n\n- Coding: Autonomously writes, edits, and runs code with reasoning and troubleshooting\n- Data science: Augments human data science expertise; navigates unstructured data while using multiple tools for insights\n- Visual processing: excelling at interpreting charts, graphs, and images, accurately transcribing text to derive insights beyond just the text alone\n- Agentic tasks: exceptional tool use, making it great at agentic tasks (i.e. complex, multi-step problem solving tasks that require engaging with other systems)\n\n#multimodal",
        "context_length": 200000,
        "architecture": {
          "modality": "text+image-\u003Etext",
          "tokenizer": "Claude",
          "instruct_type": null
        },
        "pricing": {
          "prompt": "0.000003",
          "completion": "0.000015",
          "image": "0.0048",
          "request": "0"
        },
        "top_provider": {
          "context_length": 200000,
          "max_completion_tokens": 8192,
          "is_moderated": true
        },
        "per_request_limits": null
      },
      */
      if (response.data?.data) {
        const rawModels = response.data.data;
        const parsePrice = (price: any) => {
          if (price) {
            return parseFloat(price) * 1_000_000;
          }
          return undefined;
        };
        for (const rawModel of rawModels) {
          const modelInfo: ModelInfo = {
            maxTokens: rawModel.top_provider?.max_completion_tokens,
            contextWindow: rawModel.context_length,
            supportsImages: rawModel.architecture?.modality?.includes("image"),
            supportsPromptCache: false,
            inputPrice: parsePrice(rawModel.pricing?.prompt),
            outputPrice: parsePrice(rawModel.pricing?.completion),
            description: rawModel.description,
          };

          switch (rawModel.id) {
            case "anthropic/claude-3-7-sonnet":
            case "anthropic/claude-3-7-sonnet:beta":
            case "anthropic/claude-3.7-sonnet":
            case "anthropic/claude-3.7-sonnet:beta":
            case "anthropic/claude-3.7-sonnet:thinking":
            case "anthropic/claude-3.5-sonnet":
            case "anthropic/claude-3.5-sonnet:beta":
              // NOTE: this needs to be synced with api.ts/openrouter default model info
              modelInfo.supportsPromptCache = true;
              modelInfo.cacheWritesPrice = 3.75;
              modelInfo.cacheReadsPrice = 0.3;
              break;
            case "anthropic/claude-3.5-sonnet-20240620":
            case "anthropic/claude-3.5-sonnet-20240620:beta":
              modelInfo.supportsPromptCache = true;
              modelInfo.cacheWritesPrice = 3.75;
              modelInfo.cacheReadsPrice = 0.3;
              break;
            case "anthropic/claude-3-5-haiku":
            case "anthropic/claude-3-5-haiku:beta":
            case "anthropic/claude-3-5-haiku-20241022":
            case "anthropic/claude-3-5-haiku-20241022:beta":
            case "anthropic/claude-3.5-haiku":
            case "anthropic/claude-3.5-haiku:beta":
            case "anthropic/claude-3.5-haiku-20241022":
            case "anthropic/claude-3.5-haiku-20241022:beta":
              modelInfo.supportsPromptCache = true;
              modelInfo.cacheWritesPrice = 1.25;
              modelInfo.cacheReadsPrice = 0.1;
              break;
            case "anthropic/claude-3-opus":
            case "anthropic/claude-3-opus:beta":
              modelInfo.supportsPromptCache = true;
              modelInfo.cacheWritesPrice = 18.75;
              modelInfo.cacheReadsPrice = 1.5;
              break;
            case "anthropic/claude-3-haiku":
            case "anthropic/claude-3-haiku:beta":
              modelInfo.supportsPromptCache = true;
              modelInfo.cacheWritesPrice = 0.3;
              modelInfo.cacheReadsPrice = 0.03;
              break;
            case "deepseek/deepseek-chat":
              modelInfo.supportsPromptCache = true;
              // see api.ts/deepSeekModels for more info
              modelInfo.inputPrice = 0;
              modelInfo.cacheWritesPrice = 0.14;
              modelInfo.cacheReadsPrice = 0.014;
              break;
          }

          models[rawModel.id] = modelInfo;
        }
      } else {
        console.error("Invalid response from OpenRouter API");
      }
      await fs.writeFile(openRouterModelsFilePath, JSON.stringify(models));
      console.log("OpenRouter models fetched and saved", models);
    } catch (error) {
      console.error("Error fetching OpenRouter models:", error);
    }

    await this.postMessageToWebview({
      type: "openRouterModels",
      openRouterModels: models,
    });
    return models;
  }

  async refreshRequestyModels() {
    const parsePrice = (price: any) => {
      if (price) {
        return parseFloat(price) * 1_000_000;
      }
      return undefined;
    };

    let models: Record<string, ModelInfo> = {};
    try {
      const apiKey = await getSecret(this.context, "requestyApiKey");
      const headers = {
        Authorization: `Bearer ${apiKey}`,
      };
      const response = await axios.get("https://router.requesty.ai/v1/models", {
        headers,
      });
      if (response.data?.data) {
        for (const model of response.data.data) {
          const modelInfo: ModelInfo = {
            maxTokens: model.max_output_tokens || undefined,
            contextWindow: model.context_window,
            supportsImages: model.supports_vision || undefined,
            supportsPromptCache: model.supports_caching || undefined,
            inputPrice: parsePrice(model.input_price),
            outputPrice: parsePrice(model.output_price),
            cacheWritesPrice: parsePrice(model.caching_price),
            cacheReadsPrice: parsePrice(model.cached_price),
            description: model.description,
          };
          models[model.id] = modelInfo;
        }
        console.log("Requesty models fetched", models);
      } else {
        console.error("Invalid response from Requesty API");
      }
    } catch (error) {
      console.error("Error fetching Requesty models:", error);
    }

    await this.postMessageToWebview({
      type: "requestyModels",
      requestyModels: models,
    });
    return models;
  }

  async refreshLLMDetails() {
    let models: Record<string, any> = {};
    const llmDetailsList: LlmDetailsSummary[] = [];
    let lastError: string | undefined;
    try {
      const { apiConfiguration } = await getAllExtensionState(this.context);

      // If ValkyrAI is not configured, don't attempt to fetch
      if (!apiConfiguration?.valkyraiHost) {
        console.log("ValkyrAI host not configured, skipping LLMDetails fetch");
        await this.postMessageToWebview({
          type: "llmDetailsUpdated",
          models: {},
          llmDetails: [],
        });
        return {};
      }

      // Fetch LLM details from ValkyrAI
      const valkyraiUrl = normalizeValkyraiHost(apiConfiguration.valkyraiHost);
      const endpoint = `${valkyraiUrl}/LlmDetails`;

      const headers: Record<string, string> = {
        Accept: "application/json",
        "Content-Type": "application/json",
      };

      // Prefer explicit ValkyrAI token, otherwise fall back to login JWT.
      const authToken =
        apiConfiguration?.valkyraiJwt ||
        (await getSecret(this.context, "jwtToken"));
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
        headers["jwtSession"] = authToken;
      }

      const response = await axios.get(endpoint, { headers });

      if (Array.isArray(response.data)) {
        // Transform ValkyrAI LLMDetails to ModelInfo format
        for (const llmDetail of response.data) {
          if (llmDetail.id) {
            const modelInfo: ModelInfo = {
              maxTokens: llmDetail.maxTokens,
              contextWindow: llmDetail.contextWindow,
              supportsImages: llmDetail.supportsImages,
              supportsPromptCache: llmDetail.supportsPromptCache,
              inputPrice: llmDetail.inputPrice,
              outputPrice: llmDetail.outputPrice,
              description:
                llmDetail.description ||
                `${llmDetail.provider} ${llmDetail.name}${llmDetail.version ? ` (${llmDetail.version})` : ""}`,
            };
            models[llmDetail.id] = modelInfo;
            llmDetailsList.push({
              id: llmDetail.id,
              name: llmDetail.name || llmDetail.provider || llmDetail.id,
              description: llmDetail.description,
              promptType: (llmDetail.promptType || "SYSTEM") as
                | "SYSTEM"
                | "APPEND",
              initialPrompt: llmDetail.initialPrompt,
              tags: Array.isArray(llmDetail.tags) ? llmDetail.tags : [],
              ratingScore:
                typeof llmDetail.ratingScore === "number"
                  ? llmDetail.ratingScore
                  : undefined,
              provider: llmDetail.provider,
              version: llmDetail.version,
              lastModifiedDate: llmDetail.lastModifiedDate,
            });
          }
        }
        console.log("LLMDetails fetched from ValkyrAI", models);
      } else {
        console.error("Invalid response from ValkyrAI LLMDetails endpoint");
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        lastError =
          "Authentication required for ValkyrAI LLMDetails. Sign in again or provide a ValkyrAI JWT.";
        console.warn(
          "Unauthorized when fetching LLMDetails from ValkyrAI (401).",
        );
      } else {
        console.error("Error fetching LLMDetails from ValkyrAI:", error);
        lastError =
          error instanceof Error ? error.message : "Unknown LLMDetails error";
      }
    }

    await this.postMessageToWebview({
      type: "llmDetailsUpdated",
      models,
      llmDetails: llmDetailsList,
      error: lastError,
    });
    return models;
  }

  private async testValkyraiHostConnection(host: string) {
    let success = false;
    let errorMessage: string | undefined;
    const normalizedHost = normalizeValkyraiHost(host);
    const endpoints = [
      `${normalizedHost}/health`,
      `${normalizedHost}/status`,
      normalizedHost,
    ];
    for (const endpoint of endpoints) {
      try {
        await axios.get(endpoint, { timeout: 5000 });
        success = true;
        errorMessage = undefined;
        break;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
          success = true;
          errorMessage = undefined;
          break;
        }
        errorMessage =
          error instanceof Error ? error.message : "Unable to reach host.";
      }
    }

    if (success) {
      void this.registerSwarmSession(normalizedHost);
    }

    await this.postMessageToWebview({
      type: "valkyraiHostTestResult",
      host: normalizedHost,
      success,
      error: errorMessage,
    });
  }

  /**
   * Registers this ValorIDE instance as a SWARM session with the ValkyrAI backend.
   * Non-fatal: errors are logged but do not affect normal operation.
   */
  private async registerSwarmSession(host: string): Promise<void> {
    try {
      const jwtToken = await getSecret(this.context, "jwtToken");
      const instanceId = vscode.env.machineId || crypto.randomUUID();
      const version = this.context.extension?.packageJSON?.version ?? "unknown";
      const workspaceName =
        vscode.workspace.workspaceFolders?.map((f) => f.name).join(", ") ??
        "unknown";

      const sessionMessage = buildSwarmMessage(
        SwarmMessageType.EVENT,
        { type: SwarmEntityType.AGENT, instanceId, username: "valoride" },
        { type: SwarmEntityType.SERVER },
        "register",
        {
          agentType: "valoride-ide",
          version,
          machineId: instanceId,
          workspace: workspaceName,
        },
      );

      const headers: Record<string, string> = {
        Accept: "application/json",
        "Content-Type": "application/json",
      };
      if (jwtToken) {
        headers["Authorization"] = `Bearer ${jwtToken}`;
        headers["jwtSession"] = jwtToken;
      }

      await axios.post(`${host}/swarm/sessions`, sessionMessage, {
        headers,
        timeout: 5000,
      });
      console.log(`[SWARM] ValorIDE session registered with ${host}`);

      await this.postMessageToWebview({
        type: "swarm:broadcast",
        payload: { action: "sessionRegistered", data: { host, instanceId } },
      });
    } catch (error) {
      // Non-fatal: SWARM registration is best-effort
      console.warn(
        "[SWARM] Session registration skipped:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  private async handleValkyraiHostConfigChange() {
    try {
      const configuredHost = vscode.workspace
        .getConfiguration("valoride.valkyrai")
        .get<string>("host");
      await updateGlobalState(
        this.context,
        "valkyraiHost",
        normalizeValkyraiHost(configuredHost),
      );
      await this.postStateToWebview();
      await this.refreshLLMDetails();
    } catch (error) {
      console.error("Failed to react to ValkyrAI host change:", error);
    }
  }

  // Context menus and code actions

  getFileMentionFromPath(filePath: string) {
    const cwd = vscode.workspace.workspaceFolders
      ?.map((folder) => folder.uri.fsPath)
      .at(0);
    if (!cwd) {
      return "@thorapi/" + filePath;
    }
    const relativePath = path.relative(cwd, filePath);
    return "@thorapi/" + relativePath;
  }

  // 'Add to ValorIDE' context menu in editor and code action
  async addSelectedCodeToChat(
    code: string,
    filePath: string,
    languageId: string,
    diagnostics?: vscode.Diagnostic[],
  ) {
    // Ensure the sidebar view is visible
    await vscode.commands.executeCommand("valoride-dev.SidebarProvider.focus");
    await setTimeoutPromise(100);

    // Post message to webview with the selected code
    const fileMention = this.getFileMentionFromPath(filePath);

    let input = `${fileMention}\n\`\`\`\n${code}\n\`\`\``;
    if (diagnostics) {
      const problemsString =
        this.convertDiagnosticsToProblemsString(diagnostics);
      input += `\nProblems:\n${problemsString}`;
    }

    await this.postMessageToWebview({
      type: "addToInput",
      text: input,
    });

    console.log("addSelectedCodeToChat", code, filePath, languageId);
  }

  // 'Add to ValorIDE' context menu in Terminal
  async addSelectedTerminalOutputToChat(output: string, terminalName: string) {
    // Ensure the sidebar view is visible
    await vscode.commands.executeCommand("valoride-dev.SidebarProvider.focus");
    await setTimeoutPromise(100);

    // Post message to webview with the selected terminal output
    // await this.postMessageToWebview({
    //     type: "addSelectedTerminalOutput",
    //     output,
    //     terminalName
    // })

    await this.postMessageToWebview({
      type: "addToInput",
      text: `Terminal output:\n\`\`\`\n${output}\n\`\`\``,
    });

    console.log("addSelectedTerminalOutputToChat", output, terminalName);
  }

  // 'Fix with ValorIDE' in code actions
  async fixWithValorIDE(
    code: string,
    filePath: string,
    languageId: string,
    diagnostics: vscode.Diagnostic[],
  ) {
    // Ensure the sidebar view is visible
    await vscode.commands.executeCommand("valoride-dev.SidebarProvider.focus");
    await setTimeoutPromise(100);

    const fileMention = this.getFileMentionFromPath(filePath);
    const problemsString = this.convertDiagnosticsToProblemsString(diagnostics);
    await this.initTask(
      `Fix the following code in ${fileMention}\n\`\`\`\n${code}\n\`\`\`\n\nProblems:\n${problemsString}`,
    );

    console.log(
      "fixWithValorIDE",
      code,
      filePath,
      languageId,
      diagnostics,
      problemsString,
    );
  }

  convertDiagnosticsToProblemsString(diagnostics: vscode.Diagnostic[]) {
    let problemsString = "";
    for (const diagnostic of diagnostics) {
      let label: string;
      switch (diagnostic.severity) {
        case vscode.DiagnosticSeverity.Error:
          label = "Error";
          break;
        case vscode.DiagnosticSeverity.Warning:
          label = "Warning";
          break;
        case vscode.DiagnosticSeverity.Information:
          label = "Information";
          break;
        case vscode.DiagnosticSeverity.Hint:
          label = "Hint";
          break;
        default:
          label = "Diagnostic";
      }
      const line = diagnostic.range.start.line + 1; // VSCode lines are 0-indexed
      const source = diagnostic.source ? `${diagnostic.source} ` : "";
      problemsString += `\n- [${source}${label}] Line ${line}: ${diagnostic.message}`;
    }
    problemsString = problemsString.trim();
    return problemsString;
  }

  // Task history

  async getTaskWithId(id: string): Promise<{
    historyItem: HistoryItem;
    taskDirPath: string;
    apiConversationHistoryFilePath: string;
    uiMessagesFilePath: string;
    contextHistoryFilePath: string;
    taskMetadataFilePath: string;
    apiConversationHistory: Anthropic.MessageParam[];
  }> {
    const history =
      ((await getGlobalState(this.context, "taskHistory")) as
        | HistoryItem[]
        | undefined) || [];
    const historyItem = history.find((item) => item.id === id);
    if (historyItem) {
      const taskDirPath = path.join(
        this.context.globalStorageUri.fsPath,
        "tasks",
        id,
      );
      const apiConversationHistoryFilePath = path.join(
        taskDirPath,
        GlobalFileNames.apiConversationHistory,
      );
      const uiMessagesFilePath = path.join(
        taskDirPath,
        GlobalFileNames.uiMessages,
      );
      const contextHistoryFilePath = path.join(
        taskDirPath,
        GlobalFileNames.contextHistory,
      );
      const taskMetadataFilePath = path.join(
        taskDirPath,
        GlobalFileNames.taskMetadata,
      );
      const fileExists = await fileExistsAtPath(apiConversationHistoryFilePath);
      if (fileExists) {
        const apiConversationHistory = JSON.parse(
          await fs.readFile(apiConversationHistoryFilePath, "utf8"),
        );
        return {
          historyItem,
          taskDirPath,
          apiConversationHistoryFilePath,
          uiMessagesFilePath,
          contextHistoryFilePath,
          taskMetadataFilePath,
          apiConversationHistory,
        };
      }
    }
    // if we tried to get a task that doesn't exist, remove it from state
    // FIXME: this seems to happen sometimes when the json file doesn't save to disk for some reason
    await this.deleteTaskFromState(id);
    throw new Error("Task not found");
  }

  async showTaskWithId(id: string) {
    if (!id) {
      await this.postMessageToWebview({
        type: "action",
        action: "chatButtonClicked",
      });
      return;
    }

    if (id !== this.task?.taskId) {
      try {
        // non-current task
        const { historyItem } = await this.getTaskWithId(id);
        await this.initTask(undefined, undefined, historyItem); // clears existing task
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Task history item unavailable";
        console.warn(`showTaskWithId failed for ${id}:`, error);
        await this.postStateToWebview();
        void vscode.window.showWarningMessage(
          `Could not open that task: ${message}`,
        );
        return;
      }
    }

    await this.postMessageToWebview({
      type: "action",
      action: "chatButtonClicked",
    });
  }

  async exportTaskWithId(id: string) {
    const { historyItem, apiConversationHistory } =
      await this.getTaskWithId(id);
    await downloadTask(historyItem.ts, apiConversationHistory);
  }

  async deleteAllTaskHistory() {
    await this.clearTask();
    await updateGlobalState(this.context, "taskHistory", undefined);
    try {
      // Remove all contents of tasks directory
      const taskDirPath = path.join(
        this.context.globalStorageUri.fsPath,
        "tasks",
      );
      if (await fileExistsAtPath(taskDirPath)) {
        await fs.rm(taskDirPath, { recursive: true, force: true });
      }
      // Remove checkpoints directory contents
      const checkpointsDirPath = path.join(
        this.context.globalStorageUri.fsPath,
        "checkpoints",
      );
      if (await fileExistsAtPath(checkpointsDirPath)) {
        await fs.rm(checkpointsDirPath, { recursive: true, force: true });
      }
    } catch (error) {
      vscode.window.showErrorMessage(
        `Encountered error while deleting task history, there may be some files left behind. Error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    // await this.postStateToWebview()
  }

  async refreshTotalTasksSize() {
    getTotalTasksSize(this.context.globalStorageUri.fsPath)
      .then((newTotalSize) => {
        this.postMessageToWebview({
          type: "totalTasksSize",
          totalTasksSize: newTotalSize,
        });
      })
      .catch((error) => {
        console.error("Error calculating total tasks size:", error);
      });
  }

  async deleteTaskWithId(id: string) {
    console.info("deleteTaskWithId: ", id);

    try {
      if (id === this.task?.taskId) {
        await this.clearTask();
        console.debug("cleared task");
      }

      const {
        taskDirPath,
        apiConversationHistoryFilePath,
        uiMessagesFilePath,
        contextHistoryFilePath,
        taskMetadataFilePath,
      } = await this.getTaskWithId(id);
      const legacyMessagesFilePath = path.join(
        taskDirPath,
        "claude_messages.json",
      );
      const updatedTaskHistory = await this.deleteTaskFromState(id);

      // Delete the task files
      for (const filePath of [
        apiConversationHistoryFilePath,
        uiMessagesFilePath,
        contextHistoryFilePath,
        taskMetadataFilePath,
        legacyMessagesFilePath,
      ]) {
        const fileExists = await fileExistsAtPath(filePath);
        if (fileExists) {
          await fs.unlink(filePath);
        }
      }

      await fs.rmdir(taskDirPath); // succeeds if the dir is empty

      if (updatedTaskHistory.length === 0) {
        await this.deleteAllTaskHistory();
      }
    } catch (error) {
      console.debug(`Error deleting task:`, error);
    }

    this.refreshTotalTasksSize();
  }

  async deleteTaskFromState(id: string) {
    // Remove the task from history
    const taskHistory =
      ((await getGlobalState(this.context, "taskHistory")) as
        | HistoryItem[]
        | undefined) || [];
    const updatedTaskHistory = taskHistory.filter((task) => task.id !== id);
    await updateGlobalState(this.context, "taskHistory", updatedTaskHistory);

    // Notify the webview that the task has been deleted
    await this.postStateToWebview();

    return updatedTaskHistory;
  }

  async postStateToWebview() {
    try {
      const state = await this.getStateToPostToWebview();
      await this.postMessageToWebview({ type: "state", state });
    } catch (error) {
      // Log and notify webview of failure to initialize state. Avoid throwing to keep extension running.
      const msg = error instanceof Error ? error.message : String(error);
      console.error("postStateToWebview failed:", error);
      await this.postMessageToWebview({
        type: "state",
        state: {
          /* minimal fallback state */
        } as any,
      });
      await this.postMessageToWebview({
        type: "webviewError",
        text: `Failed to initialize UI: ${msg}`,
      });
    }
  }

  async getStateToPostToWebview(): Promise<ExtensionState> {
    const {
      apiConfiguration,
      lastShownAnnouncementId,
      customInstructions,
      taskHistory,
      autoApprovalSettings,
      browserSettings,
      chatSettings,
      userInfo,
      mcpMarketplaceEnabled,
      telemetrySetting,
      planActSeparateModelsSetting,
      globalValorIDERulesToggles,
      authenticatedPrincipal,
      isLoggedIn,
      grayMatterSession,
      agenticState,
    } = await getAllExtensionState(this.context);

    // Build advanced settings from VS Code configuration
    const cfg = vscode.workspace.getConfiguration("valoride");
    const advancedSettings = validateAdvancedSettings({
      fileProcessing: {
        maxFileSize:
          (cfg.get<number>("advanced.fileProcessing.maxFileSize") as
            | number
            | undefined) ??
          DEFAULT_ADVANCED_SETTINGS.fileProcessing.maxFileSize,
        warnLargeFiles:
          (cfg.get<boolean>("advanced.fileProcessing.warnLargeFiles") as
            | boolean
            | undefined) ??
          DEFAULT_ADVANCED_SETTINGS.fileProcessing.warnLargeFiles,
        largeFileThreshold:
          (cfg.get<number>("advanced.fileProcessing.largeFileThreshold") as
            | number
            | undefined) ??
          DEFAULT_ADVANCED_SETTINGS.fileProcessing.largeFileThreshold,
        chunkSize: DEFAULT_ADVANCED_SETTINGS.fileProcessing.chunkSize,
        streamingDelay: DEFAULT_ADVANCED_SETTINGS.fileProcessing.streamingDelay,
        enableProgressiveLoading:
          DEFAULT_ADVANCED_SETTINGS.fileProcessing.enableProgressiveLoading,
      },
      budgetAlerts: {
        depletedThreshold:
          (cfg.get<number>("advanced.budgetAlerts.depletedThreshold") as
            | number
            | undefined) ??
          DEFAULT_ADVANCED_SETTINGS.budgetAlerts.depletedThreshold,
        criticalThreshold:
          (cfg.get<number>("advanced.budgetAlerts.criticalThreshold") as
            | number
            | undefined) ??
          DEFAULT_ADVANCED_SETTINGS.budgetAlerts.criticalThreshold,
        lowThreshold:
          (cfg.get<number>("advanced.budgetAlerts.lowThreshold") as
            | number
            | undefined) ?? DEFAULT_ADVANCED_SETTINGS.budgetAlerts.lowThreshold,
        alertThreshold:
          (cfg.get<number>("advanced.budgetAlerts.alertThreshold") as
            | number
            | undefined) ??
          DEFAULT_ADVANCED_SETTINGS.budgetAlerts.alertThreshold,
      },
      debugging: {
        enableVerboseLogging:
          (cfg.get<boolean>("advanced.debugging.enableVerboseLogging") as
            | boolean
            | undefined) ??
          DEFAULT_ADVANCED_SETTINGS.debugging.enableVerboseLogging,
        saveFailedMatches:
          (cfg.get<boolean>("advanced.debugging.saveFailedMatches") as
            | boolean
            | undefined) ??
          DEFAULT_ADVANCED_SETTINGS.debugging.saveFailedMatches,
        enablePerformanceMetrics:
          (cfg.get<boolean>("advanced.debugging.enablePerformanceMetrics") as
            | boolean
            | undefined) ??
          DEFAULT_ADVANCED_SETTINGS.debugging.enablePerformanceMetrics,
        logOutputFiltering:
          (cfg.get<boolean>("advanced.debugging.logOutputFiltering") as
            | boolean
            | undefined) ??
          DEFAULT_ADVANCED_SETTINGS.debugging.logOutputFiltering,
        showPsrResultsReport:
          (cfg.get<boolean>("advanced.debugging.showPsrResultsReport") as
            | boolean
            | undefined) ??
          DEFAULT_ADVANCED_SETTINGS.debugging.showPsrResultsReport,
      },
      thorapi: {
        outputFolder:
          (cfg.get<string>("advanced.thorapi.outputFolder") as
            | string
            | undefined) ?? DEFAULT_ADVANCED_SETTINGS.thorapi.outputFolder,
      },
    });
    const thorapiFolderPath = resolveThorapiFolderPath(cwd);

    // Get JWT token from secrets
    const jwtToken = await getSecret(this.context, "jwtToken");

    const localValorIDERulesToggles =
      ((await getWorkspaceState(
        this.context,
        "localValorIDERulesToggles",
      )) as ValorIDERulesToggles) || {};

    return {
      version: this.context.extension?.packageJSON?.version ?? "",
      apiConfiguration,
      customInstructions,
      uriScheme: vscode.env.uriScheme,
      currentTaskItem: this.task?.taskId
        ? (taskHistory || []).find((item) => item.id === this.task?.taskId)
        : undefined,
      checkpointTrackerErrorMessage: this.task?.checkpointTrackerErrorMessage,
      valorideMessages: this.task?.valorideMessages || [],
      taskHistory: (taskHistory || [])
        .filter((item) => item.ts && item.task)
        .sort((a, b) => b.ts - a.ts)
        .slice(0, 100), // for now we're only getting the latest 100 tasks, but a better solution here is to only pass in 3 for recent task history, and then get the full task history on demand when going to the task history view (maybe with pagination?)
      shouldShowAnnouncement:
        lastShownAnnouncementId !== this.latestAnnouncementId,
      platform: process.platform as Platform,
      autoApprovalSettings,
      browserSettings,
      chatSettings,
      userInfo,
      mcpMarketplaceEnabled,
      telemetrySetting,
      planActSeparateModelsSetting,
      vscMachineId: vscode.env.machineId,
      globalValorIDERulesToggles: globalValorIDERulesToggles || {},
      localValorIDERulesToggles: localValorIDERulesToggles || {},
      thorapiFolderPath,
      // Include authentication state fields
      authenticatedPrincipal,
      grayMatterSession,
      agenticState,
      isLoggedIn,
      jwtToken,
    };
  }

  async clearTask() {
    this.task?.abortTask();
    this.task = undefined; // removes reference to it, so once promises end it will be garbage collected
  }

  // Caching mechanism to keep track of webview messages + API conversation history per provider instance

  /*
  Now that we use retainContextWhenHidden, we don't have to store a cache of valoride messages in the user's state, but we could to reduce memory footprint in long conversations.

  - We have to be careful of what state is shared between ValorIDEProvider instances since there could be multiple instances of the extension running at once. For example when we cached valoride messages using the same key, two instances of the extension could end up using the same key and overwriting each other's messages.
  - Some state does need to be shared between the instances, i.e. the API key--however there doesn't seem to be a good way to notify the other instances that the API key has changed.

  We need to use a unique identifier for each ValorIDEProvider instance's message cache since we could be running several instances of the extension outside of just the sidebar i.e. in editor panels.

  // conversation history to send in API requests

  /*
  It seems that some API messages do not comply with vscode state requirements. Either the Anthropic library is manipulating these values somehow in the backend in a way that's creating cyclic references, or the API returns a function or a Symbol as part of the message content.
  VSCode docs about state: "The value must be JSON-stringifyable ... value — A value. MUST not contain cyclic references."
  For now we'll store the conversation history in memory, and if we need to store in state directly we'd need to do a manual conversion to ensure proper json stringification.
  */

  // getApiConversationHistory(): Anthropic.MessageParam[] {
  // 	// const history = (await this.getGlobalState(
  // 	// 	this.getApiConversationHistoryStateKey()
  // 	// )) as Anthropic.MessageParam[]
  // 	// return history || []
  // 	return this.apiConversationHistory
  // }

  // setApiConversationHistory(history: Anthropic.MessageParam[] | undefined) {
  // 	// await this.updateGlobalState(this.getApiConversationHistoryStateKey(), history)
  // 	this.apiConversationHistory = history || []
  // }

  // addMessageToApiConversationHistory(message: Anthropic.MessageParam): Anthropic.MessageParam[] {
  // 	// const history = await this.getApiConversationHistory()
  // 	// history.push(message)
  // 	// await this.setApiConversationHistory(history)
  // 	// return history
  // 	this.apiConversationHistory.push(message)
  // 	return this.apiConversationHistory
  // }

  async updateTaskHistory(item: HistoryItem): Promise<HistoryItem[]> {
    const history =
      ((await getGlobalState(this.context, "taskHistory")) as HistoryItem[]) ||
      [];
    const existingItemIndex = history.findIndex((h) => h.id === item.id);
    if (existingItemIndex !== -1) {
      history[existingItemIndex] = item;
    } else {
      history.push(item);
    }
    await updateGlobalState(this.context, "taskHistory", history);
    return history;
  }

  // private async clearState() {
  // 	this.context.workspaceState.keys().forEach((key) => {
  // 		this.context.workspaceState.update(key, undefined)
  // 	})
  // 	this.context.globalState.keys().forEach((key) => {
  // 		this.context.globalState.update(key, undefined)
  // 	})
  // 	this.context.secrets.delete("apiKey")
  // }

  // secrets

  // Open Graph Data

  async fetchOpenGraphData(url: string) {
    try {
      // Use the fetchOpenGraphData function from link-preview.ts
      const ogData = await fetchOpenGraphData(url);

      // Send the data back to the webview
      await this.postMessageToWebview({
        type: "openGraphData",
        openGraphData: ogData,
        url: url,
      });
    } catch (error) {
      console.error(`Error fetching Open Graph data for ${url}:`, error);
      // Send an error response
      await this.postMessageToWebview({
        type: "openGraphData",
        error: `Failed to fetch Open Graph data: ${error}`,
        url: url,
      });
    }
  }

  // Check if a URL is an image
  async checkIsImageUrl(url: string) {
    try {
      // Check if the URL is an image
      const isImage = await isImageUrl(url);

      // Send the result back to the webview
      await this.postMessageToWebview({
        type: "isImageUrlResult",
        isImage,
        url,
      });
    } catch (error) {
      console.error(`Error checking if URL is an image: ${url}`, error);
      // Send an error response
      await this.postMessageToWebview({
        type: "isImageUrlResult",
        isImage: false,
        url,
      });
    }
  }

  // File system helpers

  private async findReadmeFile(
    directory: string | undefined,
  ): Promise<string | undefined> {
    if (!directory) {
      return undefined;
    }

    const readmeRegex = /^readme(\.|$)/i;

    try {
      const entries = await fs.readdir(directory, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isFile() && readmeRegex.test(entry.name)) {
          return path.join(directory, entry.name);
        }
      }

      for (const entry of entries) {
        if (!entry.isDirectory()) {
          continue;
        }
        const subdir = path.join(directory, entry.name);
        try {
          const subEntries = await fs.readdir(subdir, { withFileTypes: true });
          const readmeEntry = subEntries.find(
            (subEntry) => subEntry.isFile() && readmeRegex.test(subEntry.name),
          );
          if (readmeEntry) {
            return path.join(subdir, readmeEntry.name);
          }
        } catch (subdirError) {
          console.warn(
            `findReadmeFile: unable to scan ${subdir}: ${
              subdirError instanceof Error
                ? subdirError.message
                : String(subdirError)
            }`,
          );
        }
      }
    } catch (error) {
      console.warn(
        `findReadmeFile: unable to scan ${directory}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    return undefined;
  }

  async getThorapiFolderStructure(folderPath: string): Promise<any[]> {
    try {
      const exists = await fileExistsAtPath(folderPath);
      if (!exists) {
        return [];
      }

      const entries = await fs.readdir(folderPath, { withFileTypes: true });
      const files: any[] = [];

      for (const entry of entries) {
        const fullPath = path.join(folderPath, entry.name);
        const relativePath = path.relative(cwd, fullPath);

        if (entry.isDirectory()) {
          const children = await this.getThorapiFolderStructure(fullPath);
          files.push({
            name: entry.name,
            path: relativePath,
            type: "directory",
            children: children,
          });
        } else {
          files.push({
            name: entry.name,
            path: relativePath,
            type: "file",
          });
        }
      }

      return files;
    } catch (error) {
      console.error("Error reading thorapi folder structure:", error);
      return [];
    }
  }

  // dev

  async resetState() {
    vscode.window.showInformationMessage("Resetting state...");
    await resetExtensionState(this.context);
    if (this.task) {
      this.task.abortTask();
      this.task = undefined;
    }
    vscode.window.showInformationMessage("State reset");
    await this.postStateToWebview();
    await this.postMessageToWebview({
      type: "action",
      action: "chatButtonClicked",
    });
  }
}
