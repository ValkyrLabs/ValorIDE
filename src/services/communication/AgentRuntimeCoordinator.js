import * as vscode from "vscode";
import { getAllExtensionState, updateGlobalState } from "@core/storage/state";
import { MothershipService } from "./MothershipService";
import { Logger } from "../logging/Logger";
import { WebviewProvider } from "../../core/webview";
const INSTANCE_ID_KEY = "valorideSwarmInstanceId";
/**
 * Coordinates ValorIDE's swarm runtime presence when running inside VS Code.
 *
 * Handles mothership connectivity, capability publication, task assignment handling,
 * and git/task telemetry fan-out to ValkyrAI.
 */
export class AgentRuntimeCoordinator {
    context;
    mothership = null;
    instanceId = null;
    gitDisposables = [];
    repositoryCommits = new Map();
    activeAssignments = new Map();
    capabilityCache = null;
    isInitialized = false;
    constructor(context) {
        this.context = context;
    }
    async initialize(jwtToken, principal) {
        if (!jwtToken || jwtToken.trim().length === 0) {
            Logger.log("AgentRuntimeCoordinator.initialize skipped: missing JWT token");
            return;
        }
        const { apiConfiguration } = await getAllExtensionState(this.context);
        if (!apiConfiguration?.valkyraiHost) {
            Logger.log("AgentRuntimeCoordinator.initialize skipped: no ValkyrAI host configured");
            return;
        }
        this.instanceId = await this.ensureInstanceId();
        const options = {
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
    getInstanceId() {
        return this.instanceId;
    }
    dispose() {
        this.gitDisposables.forEach((d) => d.dispose());
        this.gitDisposables = [];
        if (this.mothership) {
            try {
                this.mothership.removeAllListeners?.();
                this.mothership.disconnect();
            }
            catch (error) {
                Logger.log(`Error disposing mothership connection: ${error}`);
            }
        }
        this.mothership = null;
    }
    async ensureMothership(options) {
        if (this.mothership) {
            this.mothership.updateJwtToken(options.jwtToken);
            return;
        }
        this.mothership = new MothershipService(options);
        this.mothership.on("connected", () => {
            Logger.log("Mothership connected");
            void this.publishCapabilities();
        });
        this.mothership.on("disconnected", () => {
            Logger.log("Mothership disconnected");
        });
        this.mothership.on("error", (error) => {
            Logger.log(`Mothership error: ${String(error)}`);
        });
        this.mothership.on("remoteCommand", (command) => {
            void this.handleRemoteCommand(command);
        });
        this.mothership.on("broadcast", (payload) => {
            this.forwardBroadcastToWebviews(payload);
        });
        this.mothership.on("privateMessage", (payload) => {
            this.forwardPrivateMessage(payload);
        });
        try {
            await this.mothership.connect();
        }
        catch (error) {
            Logger.log(`Failed to connect to mothership: ${String(error)}`);
        }
    }
    async ensureInstanceId() {
        const existing = await this.context.globalState.get(INSTANCE_ID_KEY);
        if (existing) {
            return existing;
        }
        const generated = `valoride-${vscode.env.machineId.slice(0, 6)}-${Math.random()
            .toString(36)
            .substring(2, 8)}`;
        await updateGlobalState(this.context, INSTANCE_ID_KEY, generated);
        return generated;
    }
    async publishCapabilities(force = false) {
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
        const envelope = {
            instanceId: this.instanceId ?? "unknown",
            version,
            vscodeVersion: vscode.version,
            platform: process.platform,
            machineId: vscode.env.machineId,
            gitEnabled: repositories.length > 0,
            repositories,
            commands: commands.slice(0, 80),
            languages: languages.slice(0, 40),
            features: {
                mcpMarketplace: !!(await this.context.globalState.get("valoride.mcpMarketplace.enabled")),
                browserAutomation: true,
                terminal: true,
                restClient: true,
            },
        };
        this.capabilityCache = envelope;
        this.mothership.sendAppTopic("capabilities", envelope);
    }
    getTrackedRepositories() {
        return Array.from(this.repositoryCommits.keys()).map((key) => key.replace(/^file:\/\//, ""));
    }
    async setupGitTelemetry() {
        const gitExtension = vscode.extensions.getExtension("vscode.git");
        if (!gitExtension) {
            Logger.log("Git extension not found; git telemetry disabled");
            return;
        }
        let api;
        try {
            if (!gitExtension.isActive) {
                await gitExtension.activate();
            }
            api = gitExtension.exports?.getAPI?.(1);
        }
        catch (error) {
            Logger.log(`Failed to activate git extension: ${String(error)}`);
            return;
        }
        if (!api) {
            Logger.log("Git API unavailable; git telemetry disabled");
            return;
        }
        api.repositories.forEach((repo) => this.observeRepository(repo));
        this.gitDisposables.push(api.onDidOpenRepository((repo) => {
            this.observeRepository(repo);
        }));
        this.gitDisposables.push(api.onDidCloseRepository((repo) => {
            this.repositoryCommits.delete(repo.rootUri.toString());
        }));
    }
    observeRepository(repository) {
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
    sendGitEvent(event, details) {
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
    async handleRemoteCommand(command) {
        if (!command || !command.type) {
            return;
        }
        const payload = typeof command.payload === "string" ? this.safeParse(command.payload) : command.payload;
        switch (command.type) {
            case "task-assignment":
                await this.handleTaskAssignment(command, payload);
                break;
            case "task-cancel":
                this.handleTaskCancellation(command, payload);
                break;
            default:
                Logger.log(`Unhandled remote command type: ${command.type}`);
                this.forwardRemoteCommandToWebview(command);
        }
    }
    async handleTaskAssignment(command, payload) {
        if (!payload) {
            return;
        }
        const assignment = {
            commandId: command.id,
            projectId: payload.projectId ?? payload.metadata?.projectId,
            taskId: payload.taskId ?? payload.metadata?.taskId,
            workerId: payload.workerId ?? this.instanceId ?? "unknown",
            description: payload.description ?? payload.scope ?? "",
            metadata: payload,
        };
        if (assignment.taskId) {
            this.activeAssignments.set(assignment.taskId, assignment);
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
    handleTaskCancellation(command, payload) {
        const taskId = payload?.taskId;
        if (taskId && this.activeAssignments.has(taskId)) {
            this.activeAssignments.delete(taskId);
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
    forwardTaskToWebviews(type, payload) {
        WebviewProvider.getAllInstances().forEach((instance) => {
            instance.controller.postMessageToWebview({
                type,
                payload,
            });
        });
    }
    forwardRemoteCommandToWebview(command) {
        WebviewProvider.getAllInstances().forEach((instance) => {
            instance.controller.postMessageToWebview({
                type: "swarm:remote-command",
                command,
            });
        });
    }
    forwardBroadcastToWebviews(payload) {
        if (!payload) {
            return;
        }
        WebviewProvider.getAllInstances().forEach((instance) => {
            instance.controller.postMessageToWebview({
                type: "swarm:broadcast",
                payload,
            });
        });
    }
    forwardPrivateMessage(payload) {
        WebviewProvider.getAllInstances().forEach((instance) => {
            instance.controller.postMessageToWebview({
                type: "swarm:private-message",
                payload,
            });
        });
    }
    async reportTaskCompletion(taskId, results) {
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
    }
    safeParse(input) {
        try {
            return JSON.parse(input);
        }
        catch {
            return undefined;
        }
    }
    registerCommands() {
        const completeTaskCmd = vscode.commands.registerCommand("valoride.swarm.completeTask", async () => {
            if (!this.isInitialized) {
                vscode.window.showWarningMessage("ValorIDE agent has not announced presence yet.");
                return;
            }
            if (this.activeAssignments.size === 0) {
                vscode.window.showInformationMessage("No active swarm assignments for this agent.");
                return;
            }
            const picks = Array.from(this.activeAssignments.values()).map((assignment) => ({
                label: assignment.taskId,
                description: assignment.description ?? "",
                assignment,
            }));
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
            vscode.window.showInformationMessage(`Task ${selection.assignment.taskId} marked complete.`);
        });
        const refreshCapabilitiesCmd = vscode.commands.registerCommand("valoride.swarm.refreshCapabilities", async () => {
            if (!this.mothership) {
                vscode.window.showWarningMessage("ValorIDE mothership connection not active.");
                return;
            }
            this.capabilityCache = null;
            await this.publishCapabilities(true);
            vscode.window.showInformationMessage("ValorIDE capabilities re-announced to swarm.");
        });
        this.context.subscriptions.push(completeTaskCmd, refreshCapabilitiesCmd);
    }
}
export default AgentRuntimeCoordinator;
//# sourceMappingURL=AgentRuntimeCoordinator.js.map