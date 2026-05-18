import * as vscode from "vscode";
import { getAllExtensionState, updateGlobalState } from "@core/storage/state";
import {
  MothershipService,
  MothershipConnectionOptions,
  RemoteCommand,
} from "./MothershipService";
import { Logger } from "../logging/Logger";
import { WebviewProvider } from "../../core/webview";
<<<<<<< HEAD
import { WidgetCommandEnvelope } from "@shared/ExtensionMessage";
=======
import {
  CapabilityAnnouncement,
  CapabilityRegistry,
  createDefaultValorCapabilities,
} from "../agentic/CapabilityRegistry";
import {
  createAgenticCommandCenterState,
  updateSwarmState,
} from "../agentic/AgenticStateModel";
import { MothershipSwarmTransport } from "../swarm/MothershipSwarmTransport";
import {
  SwarmNodeRegistrationError,
  SwarmNodeService,
} from "../swarm/SwarmNodeService";
import type {
  AgenticCapabilityCommandCenterState,
  AgenticSwarmState,
} from "@shared/AgenticState";
import type { ApiConfiguration } from "@shared/api";
>>>>>>> e007b234 (feat(core): rc wip login and reliability fixes)

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
  features: Record<string, boolean>;
};

const INSTANCE_ID_KEY = "valorideSwarmInstanceId" as const;
const WIDGET_PROTOCOL_VERSION = "1.0" as const;

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
  private principalId: string | undefined;
  private swarmNode: SwarmNodeService | null = null;
  private swarmTransport: MothershipSwarmTransport | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private agenticState: AgenticCapabilityCommandCenterState =
    createAgenticCommandCenterState({
      approvalPolicy: "local-confirmation-required",
    });
  private isInitialized = false;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
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
    await this.setupGitTelemetry();
    this.registerCommands();
    this.isInitialized = true;
  }

  public getInstanceId(): string | null {
    return this.instanceId;
  }

  public dispose(): void {
    this.gitDisposables.forEach((d) => d.dispose());
    this.gitDisposables = [];
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
  }

  private async ensureMothership(
    options: MothershipConnectionOptions,
  ): Promise<void> {
    if (this.mothership) {
      this.mothership.updateJwtToken(options.jwtToken);
      return;
    }

    this.mothership = new MothershipService(options);
    this.swarmTransport = new MothershipSwarmTransport(this.mothership);
    this.mothership.on("connected", () => {
      Logger.log("Mothership connected");
      this.setSwarmState({
        instanceId: this.instanceId ?? undefined,
        status: "registering",
      });
      void this.publishCapabilities();
      void this.registerSwarmNode();
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
      this.mothership.sendAppTopic("capabilities", this.capabilityCache);
      return;
    }

    const repositories = this.getTrackedRepositories();
    const commands = await vscode.commands.getCommands(true);
    const languages = await vscode.languages.getLanguages();
    const version = this.context.extension.packageJSON?.version ?? "0.0.0";
    const workspaceFolders = this.getWorkspaceFolders();

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
        version,
        workspaceFolders,
      }),
      features: {
        grayMatterMemory: true,
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
    this.mothership.sendAppTopic("capabilities", envelope);
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
      approvalPolicy: "local-confirmation-required",
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
        this.handleTaskCancellation(command, payload);
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
      default:
        Logger.log(`Unhandled remote command type: ${command.type}`);
        this.forwardRemoteCommandToWebview(command);
    }
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

  private handleTaskCancellation(command: RemoteCommand, payload: any): void {
    const taskId = payload?.taskId;
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
    return error instanceof Error ? error.message : String(error);
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

export default AgentRuntimeCoordinator;
