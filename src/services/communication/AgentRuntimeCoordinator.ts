import * as vscode from "vscode";
import { getAllExtensionState, updateGlobalState } from "@core/storage/state";
import {
  MothershipService,
  MothershipConnectionOptions,
  RemoteCommand,
} from "./MothershipService";
import { Logger } from "../logging/Logger";
import { WebviewProvider } from "../../core/webview";
import { WidgetCommandEnvelope } from "@shared/ExtensionMessage";
import {
  CapabilityAnnouncement,
  CapabilityRegistry,
  createDefaultValorCapabilities,
} from "../agentic/CapabilityRegistry";
import {
  AgenticCommandBus,
  type AgenticCommand,
  type CommandApprovalDecision,
} from "../agentic/CommandBus";
import {
  createAgenticCommandCenterState,
  updateSwarmState,
} from "../agentic/AgenticStateModel";
import { MothershipSwarmTransport } from "../swarm/MothershipSwarmTransport";
import {
  SwarmNodeRegistrationError,
  SwarmNodeService,
} from "../swarm/SwarmNodeService";
import {
  buildSwarmMessage,
  SwarmEntityType,
  SwarmMessage,
  SwarmMessageType,
  validateSwarmMessage,
} from "@shared/swarm-protocol";
import type {
  AgenticCapabilityCommandCenterState,
  AgenticSwarmState,
} from "@shared/AgenticState";
import type { ApiConfiguration } from "@shared/api";
import type { TaskTerminalEvent } from "@shared/TaskLifecycle";
import {
  authorizeCanonicalSwarmApproval,
  buildSwarmRuntimeOutcome,
  classifySwarmTerminalStatus,
  extractSwarmInboundCommandContext,
  normalizeServerStampedSwarmMessage,
  SwarmCorrelationError,
  SwarmOutcomeHandoffLedger,
  type SwarmApprovalAuthorization,
  type SwarmCommandCorrelation,
  type SwarmInboundCommandContext,
  type SwarmOutcomeHandoffSnapshot,
  type SwarmRuntimeOutcome,
  type SwarmRuntimeOutcomeConfidence,
  type SwarmRuntimeOutcomeSource,
  type SwarmRuntimeOutcomeStatus,
  wrapSwarmRuntimeOutcome,
} from "../swarm/SwarmRuntimeOutcome";

type GitExtension = {
  getAPI(version: number): GitAPI;
};

type GitAPI = {
  repositories: Repository[];
  onDidOpenRepository(
    listener: (repository: Repository) => void,
  ): vscode.Disposable;
  onDidCloseRepository(
    listener: (repository: Repository) => void,
  ): vscode.Disposable;
};

type Repository = {
  rootUri: vscode.Uri;
  state: RepositoryState;
};

type RepositoryState = {
  HEAD: Branch | undefined;
  onDidChange(listener: () => void): vscode.Disposable;
};

type Branch = {
  name?: string;
  commit?: string;
  upstream?: Branch;
};

type TaskAssignment = {
  commandId?: string;
  projectId?: string;
  taskId: string;
  workerId?: string;
  description?: string;
  metadata?: Record<string, unknown>;
};

type CapabilityEnvelope = {
  instanceId: string;
  version: string;
  vscodeVersion: string;
  platform: NodeJS.Platform;
  machineId: string;
  gitEnabled: boolean;
  repositories: string[];
  commands: string[];
  swarm: CapabilityAnnouncement;
  languages: string[];
  features: Record<string, boolean | string>;
};

const INSTANCE_ID_KEY = "valorideSwarmInstanceId" as const;
const WIDGET_PROTOCOL_VERSION = "1.0" as const;
const EXECUTABLE_SWARM_ACTIONS = new Set([
  "chat.send",
  "code.execute",
  "deploy-application",
  "execute",
  "filesystem.write",
  "ide.execute",
  "new-task",
  "newtask",
  "remote_chat_message",
  "send_message",
  "swarm.command",
  "task.start",
  "valhalla.swarm.createapp",
  "valor.execute",
]);

/**
 * Coordinates ValorIDE's swarm runtime presence when running inside VS Code.
 *
 * Handles mothership connectivity, capability publication, task assignment handling,
 * and git/task telemetry fan-out to ValkyrAI.
 */
export class AgentRuntimeCoordinator implements vscode.Disposable {
  private readonly context: vscode.ExtensionContext;
  private mothership: MothershipService | null = null;
  private instanceId: string | null = null;
  private gitDisposables: vscode.Disposable[] = [];
  private repositoryCommits = new Map<string, string | undefined>();
  private activeAssignments = new Map<string, TaskAssignment>();
  private capabilityCache: CapabilityEnvelope | null = null;
  private readonly capabilityRegistry = new CapabilityRegistry(
    createDefaultValorCapabilities(),
  );
  private readonly commandBus: AgenticCommandBus;
  private outcomeHandoffLedger = new SwarmOutcomeHandoffLedger();
  private outcomeHandoffsRestored = false;
  private readonly terminalSubscriptions = new Map<string, vscode.Disposable>();
  private principalId: string | undefined;
  private swarmNode: SwarmNodeService | null = null;
  private swarmTransport: MothershipSwarmTransport | null = null;
  private mothershipBaseUrl: string | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private agenticState: AgenticCapabilityCommandCenterState =
    createAgenticCommandCenterState({
      approvalPolicy: "server-policy",
    });
  private isInitialized = false;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.commandBus = new AgenticCommandBus({
      approve: (command) => this.resolveCanonicalSwarmApproval(command),
      capabilities: this.capabilityRegistry,
    });
    this.commandBus.registerHandler("swarm.command", (command) =>
      this.startInboundSwarmTask(command),
    );
  }

  public async initialize(
    jwtToken: string,
    principal?: { id?: string },
  ): Promise<void> {
    if (!jwtToken || jwtToken.trim().length === 0) {
      Logger.log(
        "AgentRuntimeCoordinator.initialize skipped: missing JWT token",
      );
      return;
    }

    const { apiConfiguration } = await getAllExtensionState(this.context);
    if (!apiConfiguration?.valkyraiHost) {
      Logger.log(
        "AgentRuntimeCoordinator.initialize skipped: no ValkyrAI host configured",
      );
      return;
    }

    this.instanceId = await this.ensureInstanceId();
    await this.restoreOutcomeHandoffs();
    this.principalId = principal?.id;
    this.setSwarmState({
      instanceId: this.instanceId,
      status: "registering",
    });

    const options: MothershipConnectionOptions = {
      jwtToken,
      userId: principal?.id ?? "anonymous",
      baseUrl: apiConfiguration.valkyraiHost,
      instanceId: this.instanceId,
    };

    await this.ensureMothership(options);
    if (!this.isInitialized) {
      await this.setupGitTelemetry();
      this.registerCommands();
    }
    this.isInitialized = true;
  }

  public getInstanceId(): string | null {
    return this.instanceId;
  }

  public getDurableOutcomeHandoffs(): SwarmOutcomeHandoffSnapshot {
    return this.outcomeHandoffLedger.getSnapshot();
  }

  public dispose(): void {
    this.gitDisposables.forEach((d) => d.dispose());
    this.gitDisposables = [];
    this.terminalSubscriptions.forEach((subscription) =>
      subscription.dispose(),
    );
    this.terminalSubscriptions.clear();
    this.disposeMothershipConnection();
    this.isInitialized = false;
  }

  private disposeMothershipConnection(): void {
    if (this.mothership) {
      try {
        this.swarmTransport?.dispose();
        this.stopHeartbeat();
        this.mothership.removeAllListeners?.();
        this.mothership.disconnect();
      } catch (error) {
        Logger.log(`Error disposing mothership connection: ${error}`);
      }
    }
    this.mothership = null;
    this.swarmNode = null;
    this.swarmTransport = null;
    this.mothershipBaseUrl = null;
  }

  private async ensureMothership(
    options: MothershipConnectionOptions,
  ): Promise<void> {
    const nextBaseUrl = (options.baseUrl ?? "").replace(/\/+$/, "");
    if (this.mothership) {
      if (this.mothershipBaseUrl !== nextBaseUrl) {
        Logger.log(
          `Reconnecting mothership for ValkyrAI host change: ${this.mothershipBaseUrl || "unset"} -> ${nextBaseUrl || "default"}`,
        );
        this.disposeMothershipConnection();
      } else {
        this.mothership.updateJwtToken(options.jwtToken);
        if (!this.mothership.isConnected()) {
          try {
            await this.mothership.connect();
          } catch (error) {
            Logger.log(`Failed to reconnect to mothership: ${String(error)}`);
          }
        }
        return;
      }
    }

    this.mothership = new MothershipService(options);
    this.mothershipBaseUrl = nextBaseUrl;
    this.swarmTransport = new MothershipSwarmTransport(this.mothership);
    this.mothership.on("connected", () => {
      Logger.log("Mothership connected");
      this.setSwarmState({
        instanceId: this.instanceId ?? undefined,
        status: "registering",
      });
      void this.publishCapabilities();
      void this.registerSwarmNode();
      void this.replayDurableOutcomes();
    });

    this.mothership.on("disconnected", () => {
      Logger.log("Mothership disconnected");
      this.stopHeartbeat();
      this.setSwarmState({
        instanceId: this.instanceId ?? undefined,
        status: "offline",
      });
    });

    this.mothership.on("error", (error) => {
      Logger.log(`Mothership error: ${String(error)}`);
      this.setSwarmState({
        instanceId: this.instanceId ?? undefined,
        lastError: this.errorMessage(error),
        status: "error",
      });
    });

    this.mothership.on("remoteCommand", (command: RemoteCommand) => {
      void this.handleRemoteCommand(command);
    });

    this.mothership.on("broadcast", (payload: any) => {
      this.forwardBroadcastToWebviews(payload);
    });

    this.mothership.on("privateMessage", (payload: any) => {
      this.forwardPrivateMessage(payload);
    });

    try {
      await this.mothership.connect();
    } catch (error) {
      Logger.log(`Failed to connect to mothership: ${String(error)}`);
    }
  }

  private async ensureInstanceId(): Promise<string> {
    const existing =
      await this.context.globalState.get<string>(INSTANCE_ID_KEY);
    if (existing) {
      return existing;
    }
    const generated = `valoride-${vscode.env.machineId.slice(0, 6)}-${Math.random()
      .toString(36)
      .substring(2, 8)}`;
    await updateGlobalState(this.context, INSTANCE_ID_KEY, generated);
    return generated;
  }

  private async publishCapabilities(force = false): Promise<void> {
    if (!this.mothership || !this.mothership.isConnected()) {
      return;
    }
    if (!force && this.capabilityCache) {
      return;
    }

    const repositories = this.getTrackedRepositories();
    const commands = await vscode.commands.getCommands(true);
    const languages = await vscode.languages.getLanguages();
    const version = this.context.extension.packageJSON?.version ?? "0.0.0";
    const workspaceFolders = this.getWorkspaceFolders();
    const { apiConfiguration, grayMatterSession, selectedLlmDetails } =
      await getAllExtensionState(this.context);
    const grayMatterReady =
      grayMatterSession?.status === "ready" &&
      grayMatterSession.capabilities.memoryQuery;

    const envelope: CapabilityEnvelope = {
      instanceId: this.instanceId ?? "unknown",
      version,
      vscodeVersion: vscode.version,
      platform: process.platform,
      machineId: vscode.env.machineId,
      gitEnabled: repositories.length > 0,
      repositories,
      commands: commands.slice(0, 80),
      languages: languages.slice(0, 40),
      swarm: this.capabilityRegistry.toSwarmAnnouncement({
        instanceId: this.instanceId ?? "unknown",
        selectedModelId: this.resolveSelectedModelId(apiConfiguration),
        selectedPromptId: selectedLlmDetails?.id,
        selectedPromptName: selectedLlmDetails?.name,
        version,
        workspaceFolders,
      }),
      features: {
        grayMatterMemory: grayMatterReady,
        grayMatterStatus: grayMatterSession?.status ?? "unavailable",
        llmPromptSelected: Boolean(selectedLlmDetails?.id),
        mcpMarketplace: !!(await this.context.globalState.get<boolean>(
          "valoride.mcpMarketplace.enabled",
        )),
        browserAutomation: true,
        precisionSearchReplace: true,
        swarmProtocol: true,
        terminal: true,
        restClient: true,
      },
    };

    this.capabilityCache = envelope;
  }

  private getTrackedRepositories(): string[] {
    return Array.from(this.repositoryCommits.keys()).map((key) =>
      key.replace(/^file:\/\//, ""),
    );
  }

  private getWorkspaceFolders(): string[] {
    return (
      vscode.workspace.workspaceFolders?.map((folder) => folder.uri.fsPath) ??
      []
    );
  }

  private async registerSwarmNode(): Promise<void> {
    if (
      !this.mothership ||
      !this.mothership.isConnected() ||
      !this.swarmTransport ||
      !this.instanceId
    ) {
      return;
    }

    const version = this.context.extension.packageJSON?.version ?? "0.0.0";
    const { apiConfiguration, selectedLlmDetails } = await getAllExtensionState(
      this.context,
    );
    const capabilityIds = this.capabilityRegistry
      .listCapabilities()
      .filter((capability) => capability.enabled)
      .map((capability) => capability.id);
    this.setSwarmState({
      capabilities: capabilityIds,
      instanceId: this.instanceId,
      status: "registering",
    });
    this.swarmNode = new SwarmNodeService({
      approvalPolicy: "server-policy",
      capabilities: this.capabilityRegistry,
      instance: {
        instanceId: this.instanceId,
        principalId: this.principalId,
      },
      selectedModelId: this.resolveSelectedModelId(apiConfiguration),
      selectedPromptId: selectedLlmDetails?.id,
      selectedPromptName: selectedLlmDetails?.name,
      transport: this.swarmTransport,
      version,
      workspaceFolders: this.getWorkspaceFolders(),
    });

    try {
      const response = await this.swarmNode.register({
        sessionId: this.instanceId,
      });
      Logger.log(`ValorIDE SWARM registration acknowledged: ${response.type}`);
      this.setSwarmState({
        capabilities: capabilityIds,
        instanceId: this.instanceId,
        lastAckAt: new Date().toISOString(),
        lastError: undefined,
        status: "online",
      });
      this.startHeartbeat();
    } catch (error) {
      Logger.log(`ValorIDE SWARM registration failed: ${String(error)}`);
      this.stopHeartbeat();
      this.setSwarmState({
        capabilities: capabilityIds,
        instanceId: this.instanceId,
        lastError: this.errorMessage(error),
        status:
          error instanceof SwarmNodeRegistrationError ? "rejected" : "error",
      });
    }
  }

  private async setupGitTelemetry(): Promise<void> {
    const gitExtension =
      vscode.extensions.getExtension<GitExtension>("vscode.git");
    if (!gitExtension) {
      Logger.log("Git extension not found; git telemetry disabled");
      return;
    }

    let api: GitAPI | undefined;
    try {
      if (!gitExtension.isActive) {
        await gitExtension.activate();
      }
      api = gitExtension.exports?.getAPI?.(1);
    } catch (error) {
      Logger.log(`Failed to activate git extension: ${String(error)}`);
      return;
    }

    if (!api) {
      Logger.log("Git API unavailable; git telemetry disabled");
      return;
    }

    api.repositories.forEach((repo) => this.observeRepository(repo));
    this.gitDisposables.push(
      api.onDidOpenRepository((repo) => {
        this.observeRepository(repo);
      }),
    );
    this.gitDisposables.push(
      api.onDidCloseRepository((repo) => {
        this.repositoryCommits.delete(repo.rootUri.toString());
      }),
    );
  }

  private observeRepository(repository: Repository): void {
    const repoKey = repository.rootUri.toString();
    this.repositoryCommits.set(repoKey, repository.state.HEAD?.commit);

    const disposable = repository.state.onDidChange(() => {
      const head = repository.state.HEAD;
      const previousCommit = this.repositoryCommits.get(repoKey);
      if (!head) {
        return;
      }

      if (head.commit && previousCommit !== head.commit) {
        this.repositoryCommits.set(repoKey, head.commit);
        this.sendGitEvent("commit", {
          repository: repoKey,
          commit: head.commit,
          branch: head.name ?? "unknown",
          upstream: head.upstream?.name,
        });
      }
    });

    this.gitDisposables.push(disposable);
  }

  private sendGitEvent(event: string, details: Record<string, unknown>): void {
    if (!this.mothership || !this.instanceId) {
      return;
    }
    const assignmentIterator = this.activeAssignments.values();
    const first = assignmentIterator.next();
    const projectId = first.done ? undefined : first.value.projectId;

    this.mothership.sendAppTopic("git-event", {
      workerId: this.instanceId,
      projectId,
      event,
      timestamp: Date.now(),
      details,
    });
  }

  private async handleRemoteCommand(command: RemoteCommand): Promise<void> {
    if (!command || !command.type) {
      return;
    }

    const payload =
      typeof command.payload === "string"
        ? this.safeParse(command.payload)
        : command.payload;

    switch (command.type) {
      case "task-assignment":
        await this.handleTaskAssignment(command, payload);
        break;
      case "task-cancel":
        await this.handleTaskCancellation(command, payload);
        break;
      case "widget-open":
      case "ui-widget-open":
        this.handleWidgetCommand("open", command, payload);
        break;
      case "widget-configure":
      case "ui-widget-configure":
        this.handleWidgetCommand("configure", command, payload);
        break;
      case "widget-submit":
      case "ui-widget-submit":
        this.handleWidgetCommand("submit", command, payload);
        break;
      case "chat.send":
      case "code.execute":
      case "deploy-application":
      case "execute":
      case "ide.execute":
      case "new-task":
      case "newtask":
      case "remote_chat_message":
      case "send_message":
      case "swarm.command":
      case "task.start":
      case "valhalla.swarm.createapp":
      case "valor.execute":
        if (await this.tryHandleInboundSwarmCommand(command, payload)) {
          break;
        }
        Logger.log(
          `Refused executable SWARM command ${command.id}: governed runtime is unavailable.`,
        );
        break;
      default:
        if (await this.tryHandleInboundSwarmCommand(command, payload)) {
          break;
        }
        if (this.isExecutableSwarmRemoteCommand(command, payload)) {
          Logger.log(
            `Refused executable SWARM command ${command.id}: governed runtime is unavailable.`,
          );
          break;
        }
        Logger.log(`Unhandled remote command type: ${command.type}`);
        this.forwardRemoteCommandToWebview(command);
    }
  }

  private isExecutableSwarmRemoteCommand(
    command: RemoteCommand,
    payload: any,
  ): boolean {
    const raw = command.raw?.command ?? command.raw ?? command;
    return (
      (validateSwarmMessage(raw) && raw.type === SwarmMessageType.COMMAND) ||
      EXECUTABLE_SWARM_ACTIONS.has(
        String(command.type || payload?.action || "").trim(),
      )
    );
  }

  private async tryHandleInboundSwarmCommand(
    command: RemoteCommand,
    payload: any,
  ): Promise<boolean> {
    if (!this.swarmNode || !this.swarmTransport || !this.instanceId) {
      return false;
    }

    const swarmCommand = this.toInboundSwarmCommand(command, payload);
    if (!swarmCommand) {
      return false;
    }

    const response = await this.swarmNode.handleInboundCommand(
      swarmCommand,
      (message) => this.executeInboundSwarmCommand(message),
    );
    await this.swarmTransport.send(response);
    return true;
  }

  private toInboundSwarmCommand(
    command: RemoteCommand,
    payload: any,
  ): SwarmMessage | undefined {
    const raw = command.raw?.command ?? command.raw ?? command;
    if (validateSwarmMessage(raw)) {
      return raw.type === SwarmMessageType.COMMAND
        ? normalizeServerStampedSwarmMessage({ ...raw, id: command.id }, [
            command.raw,
            command.raw?.command,
            raw,
            payload,
          ])
        : undefined;
    }

    const action = String(command.type || payload?.action || "").trim();
    if (!EXECUTABLE_SWARM_ACTIONS.has(action)) {
      return undefined;
    }

    const data =
      payload && typeof payload === "object" ? payload : { message: payload };
    const sourceInstanceId =
      command.sourceInstanceId || command.raw?.sourceInstanceId || "api-0";
    const message = buildSwarmMessage(
      SwarmMessageType.COMMAND,
      {
        instanceId: sourceInstanceId,
        type:
          sourceInstanceId === "api-0"
            ? SwarmEntityType.SERVER
            : SwarmEntityType.AGENT,
      },
      {
        instanceId: command.targetInstanceId || this.instanceId,
        type: SwarmEntityType.AGENT,
      },
      action,
      data,
      {
        metadata: {
          ...(payload?.metadata && typeof payload.metadata === "object"
            ? payload.metadata
            : {}),
          commandId: command.id,
          approvalProof:
            payload?.metadata?.approvalProof ??
            payload?.approvalProof ??
            command.raw?.approvalProof,
          checkpointId:
            payload?.metadata?.checkpointId ?? payload?.checkpointId,
          correlationId:
            payload?.metadata?.correlationId ?? payload?.correlationId,
          goalId: payload?.metadata?.goalId ?? payload?.goalId,
          idempotencyKey:
            payload?.metadata?.idempotencyKey ?? payload?.idempotencyKey,
          receiptRef: command.raw?.receiptRef ?? payload?.receiptRef,
          sessionId: payload?.metadata?.sessionId ?? payload?.sessionId,
          taskId: payload?.metadata?.taskId ?? payload?.taskId,
          traceId:
            command.raw?.trace?.traceId ??
            command.raw?.traceId ??
            payload?.traceId,
          trajectoryId:
            payload?.metadata?.trajectoryId ?? payload?.trajectoryId,
          workflowExecutionRef:
            payload?.metadata?.workflowExecutionRef ??
            payload?.workflowExecutionRef,
          workflowVersionId:
            payload?.metadata?.workflowVersionId ?? payload?.workflowVersionId,
        },
      },
    );
    message.id = command.id;
    return normalizeServerStampedSwarmMessage(message, [
      command.raw,
      command.raw?.command,
      raw,
      payload,
    ]);
  }

  private async executeInboundSwarmCommand(
    message: SwarmMessage,
  ): Promise<Record<string, unknown>> {
    if (!this.instanceId) {
      throw new Error("ValorIDE SWARM instance identity is unavailable.");
    }

    const context = extractSwarmInboundCommandContext(message, this.instanceId);
    const authorization = authorizeCanonicalSwarmApproval(message, context);
    if (authorization.code === "ERR_GOVERNED_BINDING_REQUIRED") {
      const refused = await this.commandBus.execute({
        capabilityId: "swarm.command",
        correlationId: context.correlation.correlationId,
        id: context.correlation.commandId,
        payload: { context, message },
        source: "swarm",
      });
      return {
        action: context.correlation.action,
        code: authorization.code,
        commandBusStatus: refused.status,
        commandId: context.correlation.commandId,
        error: authorization.reason,
        status: "WAITING_APPROVAL",
      };
    }
    const receivedAt = new Date().toISOString();
    const acceptance = this.outcomeHandoffLedger.accept(
      context.correlation,
      receivedAt,
    );
    if (acceptance.kind === "conflict") {
      throw new SwarmCorrelationError(
        "ERR_CORRELATION_CONFLICT",
        acceptance.reason,
      );
    }
    if (acceptance.kind === "duplicate-terminal") {
      this.emitRuntimeOutcome(acceptance.outcome);
      return {
        action: context.correlation.action,
        commandId: context.correlation.commandId,
        duplicate: true,
        outcome: acceptance.outcome,
        status: "terminal-replayed",
      };
    }
    if (acceptance.kind === "duplicate-active") {
      return {
        action: context.correlation.action,
        commandId: context.correlation.commandId,
        correlationId: context.correlation.correlationId,
        duplicate: true,
        localTaskId: acceptance.handoff.localTaskId,
        sessionId: context.correlation.sessionId,
        status: acceptance.handoff.state === "RUNNING" ? "started" : "accepted",
      };
    }
    await this.persistOutcomeHandoffs();

    const commandResult = await this.commandBus.execute({
      capabilityId: "swarm.command",
      correlationId: context.correlation.correlationId,
      id: context.correlation.commandId,
      payload: { context, message },
      source: "swarm",
    });
    if (commandResult.status === "success") {
      return (
        this.asRecord(commandResult.output) ?? {
          action: context.correlation.action,
          commandId: context.correlation.commandId,
          status: "started",
        }
      );
    }

    const terminalStatus = this.statusForRejectedCommand(
      commandResult.status,
      authorization,
    );
    const error = {
      code:
        authorization.code ??
        commandResult.error?.code ??
        "ERR_SWARM_COMMAND_REJECTED",
      message:
        authorization.reason ||
        commandResult.error?.message ||
        "SWARM command could not be started.",
      retryable: terminalStatus !== "BLOCKED",
    };
    const outcome = await this.closeSwarmAssignment({
      approvalRef: authorization.approvalRef,
      completedAt: new Date().toISOString(),
      correlation: context.correlation,
      error,
      retryable: error.retryable,
      startedAt: receivedAt,
      status: terminalStatus,
      summary: error.message,
    });
    return {
      action: context.correlation.action,
      commandId: context.correlation.commandId,
      outcome,
      status: "terminal",
    };
  }

  private resolveCanonicalSwarmApproval(
    command: AgenticCommand,
  ): CommandApprovalDecision {
    const message = command.payload.message as SwarmMessage | undefined;
    const context = command.payload.context as
      | SwarmInboundCommandContext
      | undefined;
    if (!message || !context) {
      return {
        approved: false,
        reason: "Canonical SWARM command context is missing.",
      };
    }
    const authorization = authorizeCanonicalSwarmApproval(message, context);
    return {
      approved: authorization.approved,
      reason: authorization.reason,
    };
  }

  private async startInboundSwarmTask(
    command: AgenticCommand,
  ): Promise<Record<string, unknown>> {
    const message = command.payload.message as SwarmMessage;
    const context = command.payload.context as SwarmInboundCommandContext;
    const action = context.correlation.action;
    const data = message.payload.data ?? {};
    const text = this.extractRemoteTaskText(action, data);
    const images = Array.isArray(data.images)
      ? data.images.filter(
          (image): image is string => typeof image === "string",
        )
      : undefined;
    const webview = WebviewProvider.getAllInstances()[0];
    if (!webview) {
      throw new Error(
        "No active ValorIDE webview is available to accept remote SWARM tasks.",
      );
    }

    this.setSwarmState({
      activeTaskId: context.correlation.taskId ?? context.correlation.commandId,
      instanceId: this.instanceId ?? undefined,
      status: "busy",
    });
    await webview.controller.initTask(text, images);
    const localTaskId = webview.controller.task?.taskId;
    if (!localTaskId) {
      throw new Error(
        "ValorIDE did not create a local task for the governed SWARM command.",
      );
    }

    const startedAt = new Date().toISOString();
    this.outcomeHandoffLedger.markRunning(
      context.correlation.commandId,
      startedAt,
      localTaskId,
    );
    const previousSubscription = this.terminalSubscriptions.get(
      context.correlation.commandId,
    );
    previousSubscription?.dispose();
    const subscription = webview.controller.onTaskTerminal((event) => {
      if (event.taskId === localTaskId) {
        void this.completeSwarmTaskFromLifecycle(
          context.correlation.commandId,
          event,
        );
      }
    });
    this.terminalSubscriptions.set(context.correlation.commandId, subscription);
    try {
      await this.persistOutcomeHandoffs();
    } catch (error) {
      Logger.log(
        `Failed to persist running SWARM handoff ${context.correlation.commandId}: ${String(error)}`,
      );
    }

    return {
      action,
      commandId: context.correlation.commandId,
      correlationId: context.correlation.correlationId,
      instanceId: this.instanceId,
      localTaskId,
      sessionId: context.correlation.sessionId,
      status: "started",
      taskPreview: text.slice(0, 240),
    };
  }

  private statusForRejectedCommand(
    commandStatus: string,
    authorization: SwarmApprovalAuthorization,
  ): SwarmRuntimeOutcomeStatus {
    if (authorization.status) {
      return authorization.status;
    }
    if (commandStatus === "approval-required") {
      return "WAITING_APPROVAL";
    }
    if (commandStatus === "rejected") {
      return "BLOCKED";
    }
    return "FAILED";
  }

  private extractRemoteTaskText(
    action: string,
    data: Record<string, any>,
  ): string {
    const candidates = [
      data.instruction,
      data.text,
      data.prompt,
      data.message,
      data.task,
      data.description,
      data.scope,
      data.command,
      data.content,
    ];
    const direct = candidates.find(
      (candidate) => typeof candidate === "string" && candidate.trim(),
    );
    if (direct) {
      return direct.trim();
    }

    return [
      `Execute remote SageChat/Valor SWARM command: ${action}`,
      "",
      "Payload:",
      JSON.stringify(data, null, 2),
    ].join("\n");
  }

  private async completeSwarmTaskFromLifecycle(
    commandId: string,
    event: TaskTerminalEvent,
  ): Promise<void> {
    const handoff = this.outcomeHandoffLedger
      .listActive()
      .find((candidate) => candidate.correlation.commandId === commandId);
    if (!handoff) {
      return;
    }
    const status = classifySwarmTerminalStatus({
      blocked: event.kind === "blocked",
      exitCode: event.exitCode,
      explicitFailure: event.kind === "failed",
      outcomeUncertain: event.kind === "outcome-uncertain",
      succeeded:
        event.kind === "completed" &&
        event.source === "runtime-envelope" &&
        event.confidence === "EXPLICIT" &&
        Boolean(event.evidenceRefs?.some((reference) => reference.trim())),
      waitingApproval: event.kind === "waiting-approval",
    });
    const unprovenCompletion =
      event.kind === "completed" && status !== "SUCCEEDED";
    await this.closeSwarmAssignment({
      completedAt: event.completedAt,
      confidence: unprovenCompletion ? "UNRESOLVED" : event.confidence,
      correlation: handoff.correlation,
      error: event.error,
      evidenceRefs: event.evidenceRefs,
      localTaskId: event.taskId,
      retryable: event.error?.retryable,
      source: unprovenCompletion ? "legacy-classifier" : event.source,
      startedAt: handoff.startedAt ?? handoff.receivedAt,
      status,
      summary: this.limitSummary(event.summary),
    });
  }

  private async closeSwarmAssignment(input: {
    approvalRef?: string;
    completedAt: string;
    confidence?: SwarmRuntimeOutcomeConfidence;
    correlation: SwarmCommandCorrelation;
    error?: {
      code: string;
      message: string;
      retryable: boolean;
    };
    evidenceRefs?: string[];
    localTaskId?: string;
    retryable?: boolean;
    source?: SwarmRuntimeOutcomeSource;
    startedAt: string;
    status: SwarmRuntimeOutcomeStatus;
    summary: string;
  }): Promise<SwarmRuntimeOutcome> {
    const outcome = buildSwarmRuntimeOutcome({
      approvalRef: input.approvalRef,
      completedAt: input.completedAt,
      confidence: input.confidence,
      correlation: input.correlation,
      error: input.error,
      evidenceRefs: input.evidenceRefs,
      localTaskId: input.localTaskId,
      retryable: input.retryable,
      source: input.source,
      startedAt: input.startedAt,
      status: input.status,
      summary: this.limitSummary(input.summary),
    });
    const durableOutcome = this.outcomeHandoffLedger.complete(outcome);
    await this.persistOutcomeHandoffs();
    this.terminalSubscriptions.get(input.correlation.commandId)?.dispose();
    this.terminalSubscriptions.delete(input.correlation.commandId);
    this.emitRuntimeOutcome(durableOutcome);
    if (this.outcomeHandoffLedger.listActive().length === 0) {
      this.setSwarmState(this.nextIdleSwarmState());
    }
    return durableOutcome;
  }

  private async restoreOutcomeHandoffs(): Promise<void> {
    if (this.outcomeHandoffsRestored) {
      return;
    }
    const stored = this.context.globalState.get<SwarmOutcomeHandoffSnapshot>(
      "valorideSwarmOutcomeHandoffs",
    );
    this.outcomeHandoffLedger = new SwarmOutcomeHandoffLedger(stored);
    const recovered = this.outcomeHandoffLedger.recoverUnfinished(
      new Date().toISOString(),
    );
    this.outcomeHandoffsRestored = true;
    if (recovered.length > 0) {
      await this.persistOutcomeHandoffs();
      Logger.log(
        `Recovered ${recovered.length} unfinished SWARM handoff(s) as OUTCOME_UNCERTAIN.`,
      );
    }
  }

  private async persistOutcomeHandoffs(): Promise<void> {
    await updateGlobalState(
      this.context,
      "valorideSwarmOutcomeHandoffs",
      this.outcomeHandoffLedger.getSnapshot(),
    );
  }

  private replayDurableOutcomes(): void {
    for (const outcome of this.outcomeHandoffLedger.listOutcomes()) {
      this.emitRuntimeOutcome(outcome);
    }
  }

  private emitRuntimeOutcome(outcome: SwarmRuntimeOutcome): void {
    if (!this.mothership || !this.mothership.isConnected()) {
      return;
    }
    this.mothership.sendAppTopic(
      "swarm-outcome",
      wrapSwarmRuntimeOutcome(outcome),
    );
  }

  private limitSummary(summary: string): string {
    const normalized = String(summary ?? "").trim();
    if (!normalized) {
      return "ValorIDE reported a terminal SWARM outcome without a summary.";
    }
    return normalized.length > 2_000
      ? `${normalized.slice(0, 1_997)}...`
      : normalized;
  }

  private asRecord(value: unknown): Record<string, unknown> | undefined {
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : undefined;
  }

  private handleWidgetCommand(
    action: WidgetCommandEnvelope["action"],
    command: RemoteCommand,
    payload: any,
  ): void {
    const widgetEnvelope: WidgetCommandEnvelope = {
      protocolVersion: WIDGET_PROTOCOL_VERSION,
      action,
      widgetType:
        payload?.widgetType ?? payload?.widget ?? payload?.type ?? "unknown",
      requestId: payload?.requestId ?? command.id,
      sourceCommandId: command.id,
      sourceInstanceId: command.sourceInstanceId,
      targetInstanceId: command.targetInstanceId,
      payload,
    };

    this.forwardWidgetCommandToWebview(widgetEnvelope);
    this.forwardRemoteCommandToWebview(command);
    this.captureWidgetTelemetry(widgetEnvelope);
  }

  private captureWidgetTelemetry(widgetCommand: WidgetCommandEnvelope): void {
    if (!this.mothership || !this.instanceId) {
      return;
    }

    this.mothership.sendAppTopic("telemetry", {
      topic: "widget-command",
      workerId: this.instanceId,
      protocolVersion: widgetCommand.protocolVersion,
      action: widgetCommand.action,
      widgetType: widgetCommand.widgetType,
      requestId: widgetCommand.requestId,
      timestamp: Date.now(),
    });
  }

  private async handleTaskAssignment(
    command: RemoteCommand,
    payload: any,
  ): Promise<void> {
    if (!payload) {
      return;
    }
    const assignment: TaskAssignment = {
      commandId: command.id,
      projectId: payload.projectId ?? payload.metadata?.projectId,
      taskId: payload.taskId ?? payload.metadata?.taskId,
      workerId: payload.workerId ?? this.instanceId ?? "unknown",
      description: payload.description ?? payload.scope ?? "",
      metadata: payload,
    };

    if (assignment.taskId) {
      this.activeAssignments.set(assignment.taskId, assignment);
      this.setSwarmState({
        activeTaskId: assignment.taskId,
        instanceId: this.instanceId ?? undefined,
        projectId: assignment.projectId,
        status: "busy",
      });
    }

    if (this.mothership && this.instanceId && command.id) {
      this.mothership.sendAppTopic("ack", {
        commandId: command.id,
        taskId: assignment.taskId,
        projectId: assignment.projectId,
        workerId: this.instanceId,
        status: "received",
        timestamp: Date.now(),
      });
    }

    this.forwardTaskToWebviews("swarm:task-assignment", assignment);
  }

  private async handleTaskCancellation(
    command: RemoteCommand,
    payload: any,
  ): Promise<void> {
    const taskId = payload?.taskId;
    const governedHandoff = this.outcomeHandoffLedger
      .listActive()
      .find(
        (handoff) =>
          handoff.correlation.taskId === taskId ||
          handoff.correlation.commandId === payload?.commandId,
      );
    if (governedHandoff) {
      await this.closeSwarmAssignment({
        completedAt: new Date().toISOString(),
        correlation: governedHandoff.correlation,
        error: {
          code: "ERR_TASK_CANCELLED",
          message: "The governed SWARM assignment was cancelled.",
          retryable: false,
        },
        localTaskId: governedHandoff.localTaskId,
        retryable: false,
        startedAt: governedHandoff.startedAt ?? governedHandoff.receivedAt,
        status: "BLOCKED",
        summary: "The governed SWARM assignment was cancelled.",
      });
    }
    if (taskId && this.activeAssignments.has(taskId)) {
      this.activeAssignments.delete(taskId);
      this.setSwarmState(this.nextIdleSwarmState());
    }
    this.forwardTaskToWebviews("swarm:task-cancelled", {
      commandId: command.id,
      taskId,
      projectId: payload?.projectId,
    });

    if (this.mothership && this.instanceId && command.id) {
      this.mothership.sendAppTopic("ack", {
        commandId: command.id,
        taskId,
        projectId: payload?.projectId,
        workerId: this.instanceId,
        status: "cancelled",
        timestamp: Date.now(),
      });
    }
  }

  private forwardTaskToWebviews(
    type: "swarm:task-assignment" | "swarm:task-cancelled",
    payload: unknown,
  ): void {
    WebviewProvider.getAllInstances().forEach((instance) => {
      instance.controller.postMessageToWebview({
        type,
        payload,
      });
    });
  }

  private forwardRemoteCommandToWebview(command: RemoteCommand): void {
    WebviewProvider.getAllInstances().forEach((instance) => {
      instance.controller.postMessageToWebview({
        type: "swarm:remote-command",
        command,
      });
    });
  }

  private forwardWidgetCommandToWebview(
    widgetCommand: WidgetCommandEnvelope,
  ): void {
    WebviewProvider.getAllInstances().forEach((instance) => {
      instance.controller.postMessageToWebview({
        type: "swarm:widget-command",
        widgetCommand,
      });
    });
  }

  private forwardBroadcastToWebviews(payload: any): void {
    if (!payload) {
      return;
    }
    WebviewProvider.getAllInstances().forEach((instance) => {
      instance.controller.postMessageToWebview({
        type: "swarm:broadcast",
        payload,
      });
      // Trigger a lightweight server-console notification so UI can highlight the Server Console tab
      instance.controller.postMessageToWebview({
        type: "serverConsoleNewMessage",
        payload: {
          preview:
            typeof payload === "string"
              ? payload
              : payload?.message || payload?.text || payload,
        },
      });
    });
  }

  private forwardPrivateMessage(payload: any): void {
    WebviewProvider.getAllInstances().forEach((instance) => {
      instance.controller.postMessageToWebview({
        type: "swarm:private-message",
        payload,
      });
      // Also notify webview to flash the server console tab for attention
      instance.controller.postMessageToWebview({
        type: "serverConsoleNewMessage",
        payload: {
          preview:
            typeof payload === "string"
              ? payload
              : payload?.message || payload?.text || payload,
        },
      });
    });
  }

  public async reportTaskCompletion(
    taskId: string,
    results?: Record<string, unknown>,
  ): Promise<void> {
    const assignment = this.activeAssignments.get(taskId);
    if (!assignment || !this.mothership || !this.instanceId) {
      return;
    }

    this.mothership.sendAppTopic("team-progress", {
      topic: "task-completed",
      projectId: assignment.projectId,
      payload: {
        taskId,
        workerId: this.instanceId,
        results: results ?? {},
        timestamp: Date.now(),
      },
    });

    this.mothership.sendAppTopic("ack", {
      commandId: assignment.commandId,
      taskId,
      projectId: assignment.projectId,
      workerId: this.instanceId,
      status: "completed",
      timestamp: Date.now(),
    });

    this.activeAssignments.delete(taskId);
    this.setSwarmState(this.nextIdleSwarmState());
  }

  private safeParse<T = any>(input: string): T | undefined {
    try {
      return JSON.parse(input) as T;
    } catch {
      return undefined;
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.sendHeartbeat();
    this.heartbeatInterval = setInterval(() => this.sendHeartbeat(), 30000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private sendHeartbeat(): void {
    if (!this.swarmNode) {
      return;
    }
    const active = this.firstActiveAssignment();
    this.swarmNode
      .heartbeat({
        activeTaskId: active?.taskId,
        projectId: active?.projectId,
        status: active ? "busy" : "online",
      })
      .then(() => {
        this.setSwarmState({
          activeTaskId: active?.taskId,
          instanceId: this.instanceId ?? undefined,
          lastHeartbeatAt: new Date().toISOString(),
          projectId: active?.projectId,
          status: active ? "busy" : "online",
        });
      })
      .catch((error) => {
        this.setSwarmState({
          instanceId: this.instanceId ?? undefined,
          lastError: this.errorMessage(error),
          status: "error",
        });
      });
  }

  private firstActiveAssignment(): TaskAssignment | undefined {
    const first = this.activeAssignments.values().next();
    return first.done ? undefined : first.value;
  }

  private nextIdleSwarmState(): Partial<AgenticSwarmState> &
    Pick<AgenticSwarmState, "status"> {
    const active = this.firstActiveAssignment();
    return {
      activeTaskId: active?.taskId,
      instanceId: this.instanceId ?? undefined,
      projectId: active?.projectId,
      status: active ? "busy" : "online",
    };
  }

  private setSwarmState(
    swarm: Partial<AgenticSwarmState> & Pick<AgenticSwarmState, "status">,
  ): void {
    this.agenticState = updateSwarmState(this.agenticState, swarm);
    void this.publishAgenticState();
  }

  private async publishAgenticState(): Promise<void> {
    try {
      await updateGlobalState(this.context, "agenticState", this.agenticState);
      WebviewProvider.getAllInstances().forEach((instance) => {
        instance.controller.postMessageToWebview({
          type: "agenticState",
          agenticState: this.agenticState,
        });
      });
    } catch (error) {
      Logger.log(`Failed to publish agentic state: ${String(error)}`);
    }
  }

  private resolveSelectedModelId(
    config?: ApiConfiguration,
  ): string | undefined {
    return (
      config?.apiModelId ||
      config?.openRouterModelId ||
      config?.requestyModelId ||
      config?.togetherModelId ||
      config?.ollamaModelId ||
      config?.lmStudioModelId ||
      config?.openAiModelId ||
      config?.liteLlmModelId ||
      config?.vsCodeLmModelSelector?.id
    );
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    if (error && typeof error === "object") {
      const eventType =
        "type" in error ? String((error as { type?: unknown }).type) : "";
      if (
        eventType ||
        Object.prototype.toString.call(error) === "[object ErrorEvent]" ||
        Object.prototype.toString.call(error) === "[object Event]"
      ) {
        return `WebSocket connection failed${eventType ? ` (${eventType})` : ""}; verify the ValkyrAI /ws STOMP endpoint and session token.`;
      }
    }
    const fallback = String(error);
    return fallback === "[object Object]" || fallback === "[object ErrorEvent]"
      ? "WebSocket connection failed; verify the ValkyrAI /ws STOMP endpoint and session token."
      : fallback;
  }

  private registerCommands(): void {
    const completeTaskCmd = vscode.commands.registerCommand(
      "valoride.swarm.completeTask",
      async () => {
        if (!this.isInitialized) {
          vscode.window.showWarningMessage(
            "ValorIDE agent has not announced presence yet.",
          );
          return;
        }
        if (this.activeAssignments.size === 0) {
          vscode.window.showInformationMessage(
            "No active swarm assignments for this agent.",
          );
          return;
        }

        const picks = Array.from(this.activeAssignments.values()).map(
          (assignment) => ({
            label: assignment.taskId,
            description: assignment.description ?? "",
            assignment,
          }),
        );

        const selection = await vscode.window.showQuickPick(picks, {
          title: "Select task to mark complete",
        });
        if (!selection) {
          return;
        }

        const resultSummary = await vscode.window.showInputBox({
          prompt: "Provide a brief summary of the work completed (optional)",
          placeHolder: "Implemented checkout form and added tests...",
        });

        await this.reportTaskCompletion(selection.assignment.taskId, {
          summary: resultSummary ?? "",
        });

        vscode.window.showInformationMessage(
          `Task ${selection.assignment.taskId} marked complete.`,
        );
      },
    );

    const refreshCapabilitiesCmd = vscode.commands.registerCommand(
      "valoride.swarm.refreshCapabilities",
      async () => {
        if (!this.mothership) {
          vscode.window.showWarningMessage(
            "ValorIDE mothership connection not active.",
          );
          return;
        }
        this.capabilityCache = null;
        await this.publishCapabilities(true);
        await this.registerSwarmNode();
        vscode.window.showInformationMessage(
          "ValorIDE capabilities re-announced to swarm.",
        );
      },
    );

    this.context.subscriptions.push(completeTaskCmd, refreshCapabilitiesCmd);
  }
}

let sharedAgentRuntimeCoordinator: AgentRuntimeCoordinator | null = null;

export const initializeAgentRuntimeCoordinator = async (
  context: vscode.ExtensionContext,
  jwtToken: string,
  principal?: { id?: string },
): Promise<AgentRuntimeCoordinator> => {
  if (!sharedAgentRuntimeCoordinator) {
    sharedAgentRuntimeCoordinator = new AgentRuntimeCoordinator(context);
  }
  await sharedAgentRuntimeCoordinator.initialize(jwtToken, principal);
  return sharedAgentRuntimeCoordinator;
};

export const disposeAgentRuntimeCoordinator = (): void => {
  sharedAgentRuntimeCoordinator?.dispose();
  sharedAgentRuntimeCoordinator = null;
};

export default AgentRuntimeCoordinator;
