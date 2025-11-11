import axios from "axios";
import crypto from "crypto";
import fs from "fs/promises";
import { setTimeout as setTimeoutPromise } from "node:timers/promises";
import pWaitFor from "p-wait-for";
import * as path from "path";
import * as vscode from "vscode";
import { handleGrpcRequest } from "./grpc-handler";
import { buildApiHandler } from "@api/index";
import { cleanupLegacyCheckpoints } from "@integrations/checkpoints/CheckpointMigration";
import { downloadTask } from "@integrations/misc/export-markdown";
import { extractLocalZip, isZipBuffer } from "@utils/zipExtractor";
import { fetchOpenGraphData, isImageUrl, } from "@integrations/misc/link-preview";
import { openImage } from "@integrations/misc/open-file";
import { handleFileServiceRequest } from "./file";
import { selectImages } from "@integrations/misc/process-images";
import { getTheme } from "@integrations/theme/getTheme";
import WorkspaceTracker from "@integrations/workspace/WorkspaceTracker";
import { ValorIDEAccountService } from "@services/account/ValorIDEAccountService";
import { BrowserSession } from "@services/browser/BrowserSession";
import { McpHub } from "@services/mcp/McpHub";
import { searchWorkspaceFiles } from "@services/search/file-search";
import { telemetryService } from "@services/telemetry/TelemetryService";
import { validateAdvancedSettings, DEFAULT_ADVANCED_SETTINGS } from "@shared/AdvancedSettings";
import { fileExistsAtPath } from "@utils/fs";
import { searchCommits } from "@utils/git";
import { getReadablePath, getWorkspacePath } from "@utils/path";
import { resolveThorapiFolderPath } from "@utils/thorapi";
import { getTotalTasksSize } from "@utils/storage";
import { openMention } from "../mentions";
import { ensureMcpServersDirectoryExists, ensureSettingsDirectoryExists, GlobalFileNames, } from "../storage/disk";
import { getAllExtensionState, getGlobalState, getSecret, getWorkspaceState, resetExtensionState, storeSecret, updateApiConfiguration, updateGlobalState, updateWorkspaceState, } from "../storage/state";
import { Task, cwd } from "../task";
import { createRuleFile, deleteRuleFile, refreshValorIDERulesToggles, } from "../context/instructions/user-instructions/valoride-rules";
/*
https://github.com/microsoft/vscode-webview-ui-toolkit-samples/blob/main/default/weather-webview/src/providers/WeatherViewProvider.ts

https://github.com/KumarVariable/vscode-extension-sidebar-html/blob/master/src/customSidebarViewProvider.ts
*/
export class Controller {
    context;
    outputChannel;
    postMessage;
    disposables = [];
    task;
    workspaceTracker;
    mcpHub;
    accountService;
    latestAnnouncementId = "april-18-2025_21:15::00"; // update to some unique identifier when we add a new announcement
    constructor(context, outputChannel, postMessage) {
        this.context = context;
        this.outputChannel = outputChannel;
        this.outputChannel.appendLine("ValorIDEProvider instantiated");
        this.postMessage = postMessage;
        this.workspaceTracker = new WorkspaceTracker((msg) => this.postMessageToWebview(msg));
        this.mcpHub = new McpHub(() => ensureMcpServersDirectoryExists(), () => ensureSettingsDirectoryExists(this.context), (msg) => this.postMessageToWebview(msg), this.context.extension?.packageJSON?.version ?? "1.0.0");
        this.accountService = new ValorIDEAccountService((msg) => this.postMessageToWebview(msg), async () => {
            const { apiConfiguration } = await this.getStateToPostToWebview();
            return apiConfiguration?.valorideApiKey;
        });
        // Clean up legacy checkpoints
        cleanupLegacyCheckpoints(this.context.globalStorageUri.fsPath, this.outputChannel).catch((error) => {
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
        }
        catch (error) {
            this.outputChannel.appendLine(`Error clearing task: ${error}`);
            console.error("Error clearing task:", error);
        }
        // Dispose all disposables with individual error handling
        while (this.disposables.length) {
            const disposable = this.disposables.pop();
            if (disposable) {
                try {
                    disposable.dispose();
                }
                catch (error) {
                    this.outputChannel.appendLine(`Error disposing resource: ${error}`);
                    console.error("Error disposing resource:", error);
                }
            }
        }
        try {
            this.workspaceTracker.dispose();
            this.outputChannel.appendLine("Workspace tracker disposed successfully");
        }
        catch (error) {
            this.outputChannel.appendLine(`Error disposing workspace tracker: ${error}`);
            console.error("Error disposing workspace tracker:", error);
        }
        try {
            await this.mcpHub.dispose();
            this.outputChannel.appendLine("MCP hub disposed successfully");
        }
        catch (error) {
            this.outputChannel.appendLine(`Error disposing MCP hub: ${error}`);
            console.error("Error disposing MCP hub:", error);
        }
        this.outputChannel.appendLine("ValorIDEProvider disposal completed");
        console.log("Controller disposed successfully");
    }
    // Auth methods
    async handleSignOut() {
        try {
            // Clear all authentication-related secrets
            await storeSecret(this.context, "valorideApiKey", undefined);
            await storeSecret(this.context, "jwtToken", undefined);
            // Clear all authentication-related global state
            await updateGlobalState(this.context, "userInfo", undefined);
            await updateGlobalState(this.context, "authenticatedPrincipal", undefined);
            await updateGlobalState(this.context, "isLoggedIn", false);
            // Reset API provider to default
            await updateGlobalState(this.context, "apiProvider", "openrouter");
            await this.postStateToWebview();
            vscode.window.showInformationMessage("Successfully logged out of ValorIDE");
        }
        catch (error) {
            vscode.window.showErrorMessage("Logout failed");
        }
    }
    async setUserInfo(info) {
        await updateGlobalState(this.context, "userInfo", info);
    }
    async initTask(task, images, historyItem) {
        await this.clearTask(); // ensures that an existing task doesn't exist before starting a new one, although this shouldn't be possible since user must clear task before starting a new one
        const { apiConfiguration, customInstructions, autoApprovalSettings, browserSettings, chatSettings, } = await getAllExtensionState(this.context);
        if (autoApprovalSettings) {
            const updatedAutoApprovalSettings = {
                ...autoApprovalSettings,
                version: (autoApprovalSettings.version ?? 1) + 1,
            };
            await updateGlobalState(this.context, "autoApprovalSettings", updatedAutoApprovalSettings);
        }
        this.task = new Task(this.context, this.mcpHub, this.workspaceTracker, (historyItem) => this.updateTaskHistory(historyItem), () => this.postStateToWebview(), (message) => this.postMessageToWebview(message), (taskId) => this.reinitExistingTaskFromId(taskId), () => this.cancelTask(), apiConfiguration, autoApprovalSettings, browserSettings, chatSettings, customInstructions, task, images, historyItem);
    }
    async reinitExistingTaskFromId(taskId) {
        const history = await this.getTaskWithId(taskId);
        if (history) {
            await this.initTask(undefined, undefined, history.historyItem);
        }
    }
    // Send any JSON serializable data to the react app
    async postMessageToWebview(message) {
        await this.postMessage(message);
    }
    /**
     * Sets up an event listener to listen for messages passed from the webview context and
     * executes code based on the message that is received.
     *
     * @param webview A reference to the extension webview
     */
    async handleWebviewMessage(message) {
        switch (message.type) {
            case "openFile": {
                const relPath = message.text;
                if (relPath) {
                    const absPath = path.join(cwd, relPath);
                    await handleFileServiceRequest(this, "openFile", { value: absPath });
                }
                break;
            }
            case "addRemoteServer": {
                try {
                    await this.mcpHub?.addRemoteServer(message.serverName, message.serverUrl);
                    await this.postMessageToWebview({
                        type: "addRemoteServerResult",
                        addRemoteServerResult: {
                            success: true,
                            serverName: message.serverName,
                        },
                    });
                }
                catch (error) {
                    await this.postMessageToWebview({
                        type: "addRemoteServerResult",
                        addRemoteServerResult: {
                            success: false,
                            serverName: message.serverName,
                            error: error.message,
                        },
                    });
                }
                break;
            }
            case "authStateChanged":
                await this.setUserInfo(message.user
                    ? {
                        username: message.user.name || null,
                        email: null, // Replace with actual email if available
                        avatarUrl: null, // Replace with actual avatar URL if available
                    }
                    : undefined);
                await this.postStateToWebview();
                break;
            case "webviewDidLaunch":
                this.postStateToWebview();
                this.workspaceTracker?.populateFilePaths(); // don't await
                getTheme().then((theme) => this.postMessageToWebview({
                    type: "theme",
                    text: JSON.stringify(theme),
                }));
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
                getGlobalState(this.context, "mcpMarketplaceCatalog").then((mcpMarketplaceCatalog) => {
                    if (mcpMarketplaceCatalog) {
                        this.postMessageToWebview({
                            type: "mcpMarketplaceCatalog",
                            mcpMarketplaceCatalog: mcpMarketplaceCatalog,
                        });
                    }
                });
                this.silentlyRefreshMcpMarketplace();
                this.refreshOpenRouterModels().then(async (openRouterModels) => {
                    if (openRouterModels) {
                        // update model info in state (this needs to be done here since we don't want to update state while settings is open, and we may refresh models there)
                        const { apiConfiguration } = await getAllExtensionState(this.context);
                        if (apiConfiguration.openRouterModelId) {
                            await updateGlobalState(this.context, "openRouterModelInfo", openRouterModels[apiConfiguration.openRouterModelId]);
                            await this.postStateToWebview();
                        }
                    }
                });
                // If user already opted in to telemetry, enable telemetry service
                this.getStateToPostToWebview().then((state) => {
                    const { telemetrySetting } = state;
                    const isOptedIn = telemetrySetting === "enabled";
                    telemetryService.updateTelemetryState(isOptedIn);
                });
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
                        this.task.api = buildApiHandler(message.apiConfiguration);
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
                        await updateGlobalState(this.context, "autoApprovalSettings", message.autoApprovalSettings);
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
                    await updateGlobalState(this.context, "browserSettings", message.browserSettings);
                    if (this.task) {
                        this.task.browserSettings = message.browserSettings;
                        this.task.browserSession.browserSettings = message.browserSettings;
                    }
                    await this.postStateToWebview();
                }
                break;
            case "togglePlanActMode":
                if (message.chatSettings) {
                    await this.togglePlanActModeWithChatSettings(message.chatSettings, message.chatContent);
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
                const browserSession = new BrowserSession(this.context, browserSettings);
                await browserSession.relaunchChromeDebugMode(this);
                break;
            case "askResponse":
                this.task?.handleWebviewAskResponse(message.askResponse, message.text, message.images);
                break;
            case "didShowAnnouncement":
                await updateGlobalState(this.context, "lastShownAnnouncementId", this.latestAnnouncementId);
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
                this.showTaskWithId(message.text);
                break;
            case "deleteTaskWithId":
                this.deleteTaskWithId(message.text);
                break;
            case "exportTaskWithId":
                this.exportTaskWithId(message.text);
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
            case "refreshOpenAiModels":
                const { apiConfiguration } = await getAllExtensionState(this.context);
                const openAiModels = await this.getOpenAiModels(apiConfiguration.openAiBaseUrl, apiConfiguration.openAiApiKey);
                this.postMessageToWebview({ type: "openAiModels", openAiModels });
                break;
            case "refreshValorIDERules":
                await refreshValorIDERulesToggles(this.context, cwd);
                await this.postStateToWebview();
                break;
            case "openImage":
                openImage(message.text);
                break;
            case "openInBrowser":
                if (message.url) {
                    vscode.env.openExternal(vscode.Uri.parse(message.url));
                }
                break;
            case "fetchOpenGraphData":
                this.fetchOpenGraphData(message.text);
                break;
            case "checkIsImageUrl":
                this.checkIsImageUrl(message.text);
                break;
            case "createRuleFile":
                if (typeof message.isGlobal !== "boolean" ||
                    typeof message.filename !== "string" ||
                    !message.filename) {
                    console.error("createRuleFile: Missing or invalid parameters", {
                        isGlobal: typeof message.isGlobal === "boolean"
                            ? message.isGlobal
                            : `Invalid: ${typeof message.isGlobal}`,
                        filename: typeof message.filename === "string"
                            ? message.filename
                            : `Invalid: ${typeof message.filename}`,
                    });
                    return;
                }
                const { filePath, fileExists } = await createRuleFile(message.isGlobal, message.filename, cwd);
                if (fileExists && filePath) {
                    vscode.window.showWarningMessage(`Rule file "${message.filename}" already exists.`);
                    // Still open it for editing
                    await handleFileServiceRequest(this, "openFile", { value: filePath });
                    return;
                }
                else if (filePath && !fileExists) {
                    await refreshValorIDERulesToggles(this.context, cwd);
                    await this.postStateToWebview();
                    await handleFileServiceRequest(this, "openFile", { value: filePath });
                    vscode.window.showInformationMessage(`Created new ${message.isGlobal ? "global" : "workspace"} rule file: ${message.filename}`);
                }
                else {
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
                    await this.task?.presentFileDiff(message.number, message.relativePath, message.seeNewChangesSinceLastTaskCompletion ?? true);
                }
                break;
            }
            case "getLatestState":
                await this.postStateToWebview();
                break;
            case "accountLoginClicked": {
                // Generate nonce for state validation
                const nonce = crypto.randomBytes(32).toString("hex");
                await storeSecret(this.context, "authNonce", nonce);
                // Open browser for authentication with state param
                console.log("Login button clicked in account page");
                console.log("Opening auth page with state param");
                const uriScheme = vscode.env.uriScheme;
                const authUrl = vscode.Uri.parse(`https://valkyrlabs.com/sign-up`);
                vscode.env.openExternal(authUrl);
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
                });
                break;
            }
            case "fetchUserCreditsData": {
                await this.fetchUserCreditsData();
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
                    await this.downloadMcp(message.mcpId);
                }
                break;
            }
            case "silentlyRefreshMcpMarketplace": {
                await this.silentlyRefreshMcpMarketplace();
                break;
            }
            case "taskFeedback":
                if (message.feedbackType && this.task?.taskId) {
                    telemetryService.captureTaskFeedback(this.task.taskId, message.feedbackType);
                }
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
                    await this.mcpHub?.toggleToolAutoApprove(message.serverName, message.toolNames, message.autoApprove);
                }
                catch (error) {
                    if (message.toolNames?.length === 1) {
                        console.error(`Failed to toggle auto-approve for server ${message.serverName} with tool ${message.toolNames[0]}:`, error);
                    }
                    else {
                        console.error(`Failed to toggle auto-approve tools for server ${message.serverName}:`, error);
                    }
                }
                break;
            }
            case "toggleValorIDERule": {
                const { isGlobal, rulePath, enabled } = message;
                if (rulePath &&
                    typeof enabled === "boolean" &&
                    typeof isGlobal === "boolean") {
                    if (isGlobal) {
                        const toggles = (await getGlobalState(this.context, "globalValorIDERulesToggles")) || {};
                        toggles[rulePath] = enabled;
                        await updateGlobalState(this.context, "globalValorIDERulesToggles", toggles);
                    }
                    else {
                        const toggles = (await getWorkspaceState(this.context, "localValorIDERulesToggles")) || {};
                        toggles[rulePath] = enabled;
                        await updateWorkspaceState(this.context, "localValorIDERulesToggles", toggles);
                    }
                    await this.postStateToWebview();
                }
                else {
                    console.error("toggleValorIDERule: Missing or invalid parameters", {
                        rulePath,
                        isGlobal: typeof isGlobal === "boolean"
                            ? isGlobal
                            : `Invalid: ${typeof isGlobal}`,
                        enabled: typeof enabled === "boolean"
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
                    }
                    else {
                        console.error("Failed to delete rule file:", result.message);
                    }
                }
                else {
                    console.error("deleteValorIDERule: Missing or invalid parameters", {
                        rulePath,
                        isGlobal: typeof isGlobal === "boolean"
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
                    await this.mcpHub?.restartConnection(message.text);
                }
                catch (error) {
                    console.error(`Failed to retry connection for ${message.text}:`, error);
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
                    }
                    catch (error) {
                        console.error(`Error searching commits: ${JSON.stringify(error)}`);
                    }
                }
                break;
            }
            case "openExtensionSettings": {
                const settingsFilter = message.text || "";
                await vscode.commands.executeCommand("workbench.action.openSettings", `@ext:valkyrlabsinc.valoride-dev ${settingsFilter}`.trim());
                break;
            }
            case "invoke": {
                if (message.text) {
                    await this.postMessageToWebview({
                        type: "invoke",
                        invoke: message.text,
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
                        this.task.api = buildApiHandler(message.apiConfiguration);
                    }
                }
                // custom instructions
                await this.updateCustomInstructions(message.customInstructionsSetting);
                // telemetry setting
                if (message.telemetrySetting) {
                    await this.updateTelemetrySetting(message.telemetrySetting);
                }
                // plan act setting
                await updateGlobalState(this.context, "planActSeparateModelsSetting", message.planActSeparateModelsSetting);
                // after settings are updated, post state to webview
                await this.postStateToWebview();
                await this.postMessageToWebview({ type: "didUpdateSettings" });
                break;
            }
            case "requestSetBudgetLimit": {
                // Prompt user for USD budget limit and persist without toggling mode
                const { chatSettings: currentChatSettings } = await getAllExtensionState(this.context);
                const valueStr = await vscode.window.showInputBox({
                    title: "Set budget limit",
                    prompt: "Set budget limit (USD) for this task",
                    value: currentChatSettings?.budgetLimit != null
                        ? String(currentChatSettings.budgetLimit)
                        : "",
                    validateInput: (v) => {
                        if (v.trim() === "")
                            return null;
                        const n = Number(v);
                        return isFinite(n) && n >= 0 ? null : "Enter a non-negative number";
                    },
                });
                if (valueStr === undefined)
                    break; // cancelled
                const nextBudget = valueStr.trim() === "" ? undefined : Number(valueStr);
                const nextSettings = {
                    ...(currentChatSettings ?? { mode: "act" }),
                    budgetLimit: nextBudget,
                };
                await updateGlobalState(this.context, "chatSettings", nextSettings);
                if (this.task)
                    this.task.chatSettings = nextSettings;
                await this.postStateToWebview();
                if (nextBudget != null) {
                    vscode.window.showInformationMessage(`Budget limit set to $${nextBudget.toFixed(2)}`);
                }
                else {
                    vscode.window.showInformationMessage("Budget limit cleared");
                }
                break;
            }
            case "requestSetApiThrottle": {
                // Prompt user for delay between API calls (ms) and persist
                const { chatSettings: currentChatSettings } = await getAllExtensionState(this.context);
                const valueStr = await vscode.window.showInputBox({
                    title: "Set API throttle",
                    prompt: "Set delay between API calls (ms)",
                    value: currentChatSettings?.apiThrottleMs != null
                        ? String(currentChatSettings.apiThrottleMs)
                        : "",
                    validateInput: (v) => {
                        if (v.trim() === "")
                            return null;
                        const n = Number(v);
                        return Number.isInteger(n) && n >= 0
                            ? null
                            : "Enter a non-negative integer";
                    },
                });
                if (valueStr === undefined)
                    break; // cancelled
                const nextDelay = valueStr.trim() === "" ? undefined : Number(valueStr);
                const nextSettings = {
                    ...(currentChatSettings ?? { mode: "act" }),
                    apiThrottleMs: nextDelay,
                };
                await updateGlobalState(this.context, "chatSettings", nextSettings);
                if (this.task)
                    this.task.chatSettings = nextSettings;
                await this.postStateToWebview();
                if (nextDelay != null) {
                    vscode.window.showInformationMessage(`API throttle set to ${nextDelay} ms`);
                }
                else {
                    vscode.window.showInformationMessage("API throttle cleared");
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
                    const browserSession = new BrowserSession(this.context, browserSettings);
                    const { path, isBundled } = await browserSession.getDetectedChromePath();
                    await this.postMessageToWebview({
                        type: "detectedChromePath",
                        text: path,
                        isBundled,
                    });
                }
                catch (error) {
                    console.error("Error getting detected Chrome path:", error);
                }
                break;
            }
            case "getRelativePaths": {
                if (message.uris && message.uris.length > 0) {
                    const resolvedPaths = await Promise.all(message.uris.map(async (uriString) => {
                        try {
                            const fileUri = vscode.Uri.parse(uriString, true);
                            const relativePath = vscode.workspace.asRelativePath(fileUri, false);
                            if (path.isAbsolute(relativePath)) {
                                console.warn(`Dropped file ${relativePath} is outside the workspace. Sending original path.`);
                                return fileUri.fsPath.replace(/\\/g, "/");
                            }
                            else {
                                let finalPath = "/" + relativePath.replace(/\\/g, "/");
                                try {
                                    const stat = await vscode.workspace.fs.stat(fileUri);
                                    if (stat.type === vscode.FileType.Directory) {
                                        finalPath += "/";
                                    }
                                }
                                catch (statError) {
                                    console.error(`Error stating file ${fileUri.fsPath}:`, statError);
                                }
                                return finalPath;
                            }
                        }
                        catch (error) {
                            console.error(`Error calculating relative path for ${uriString}:`, error);
                            return null;
                        }
                    }));
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
                    const results = await searchWorkspaceFiles(message.query || "", workspacePath, 20);
                    // debug logging to be removed
                    //console.log(`controller/index.ts: Search results: ${results.length}`)
                    // Send results back to webview
                    await this.postMessageToWebview({
                        type: "fileSearchResults",
                        results,
                        mentionsRequestId: message.mentionsRequestId,
                    });
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
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
                    await updateGlobalState(this.context, "favoritedModelIds", updatedFavorites);
                    // Capture telemetry for model favorite toggle
                    const isFavorited = !favoritedModelIds.includes(message.modelId);
                    telemetryService.captureModelFavoritesUsage(message.modelId, isFavorited);
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
                }
                catch (error) {
                    console.error("Error getting thorapi folder contents:", error);
                    await this.postMessageToWebview({
                        type: "workspaceFiles",
                        files: [],
                        error: error instanceof Error
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
                    if (!cwd || !rel)
                        break;
                    const abs = path.resolve(cwd, rel);
                    const choice = await vscode.window.showInformationMessage(`Add generated code at "${rel}" to your project?`, { modal: false }, "Add", "Skip");
                    if (choice !== "Add")
                        break;
                    // Reuse existing command to update tsconfig aliases and includes
                    await vscode.commands.executeCommand("valoride.addThorAliasesFromFolder", vscode.Uri.file(abs));
                }
                catch (err) {
                    console.error("promptAddGeneratedToProject error", err);
                    vscode.window.showWarningMessage(`Failed to prepare alias update: ${err instanceof Error ? err.message : String(err)}`);
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
                    if (!cwd || !rel)
                        break;
                    const abs = path.resolve(cwd, rel);
                    // Reuse existing command to update tsconfig aliases and includes
                    await vscode.commands.executeCommand("valoride.addThorAliasesFromFolder", vscode.Uri.file(abs));
                    // Show success message
                    vscode.window.showInformationMessage(`Successfully added "${folderName}" to your project with TypeScript aliases.`);
                }
                catch (err) {
                    console.error("addGeneratedToProject error", err);
                    vscode.window.showErrorMessage(`Failed to add generated code to project: ${err instanceof Error ? err.message : String(err)}`);
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
                    if (!cwd || !rel)
                        break;
                    const abs = path.resolve(cwd, rel);
                    let command;
                    let port;
                    let serverDescription;
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
                            await vscode.commands.executeCommand("valoride.addThorAliasesFromFolder", vscode.Uri.file(abs));
                        }
                        catch (e) {
                            console.warn(`Failed to update tsconfig aliases for ${folderName}: ${e instanceof Error ? e.message : String(e)}`);
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
                    vscode.window.showInformationMessage(`Starting ${serverDescription} for "${folderName}"${portMessage}. Check the terminal for output.`);
                    // If it's a web server, offer to open in browser after a delay
                    if (port && serverType !== "typescript") {
                        setTimeout(() => {
                            vscode.window
                                .showInformationMessage(`Server should be running on localhost:${port}. Open in browser?`, "Open Browser", "Later")
                                .then((choice) => {
                                if (choice === "Open Browser") {
                                    vscode.env.openExternal(vscode.Uri.parse(`http://localhost:${port}`));
                                }
                            });
                        }, 5000); // Wait 5 seconds for server to start
                    }
                }
                catch (err) {
                    console.error("startServer error", err);
                    vscode.window.showErrorMessage(`Failed to start server: ${err instanceof Error ? err.message : String(err)}`);
                }
                break;
            }
            case "streamToThorapi": {
                const { blobData, applicationId, applicationName, filename, mimeType, } = message;
                const sendProgress = async (step, progressMessage) => {
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
                    const incomingName = filename?.trim() ||
                        `application-${applicationId}-${Date.now()}`;
                    const sanitizedBaseName = path
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
                    await sendProgress("processing", `Saved archive to ${getReadablePath(filePath)}`);
                    let extractedPath;
                    let readmePath;
                    if (looksLikeZip) {
                        await sendProgress("extracting", "Extracting project files...");
                        try {
                            extractedPath = await extractLocalZip(filePath, thorapiFolderPath, applicationName || applicationId);
                        }
                        catch (extractionError) {
                            throw new Error(`Failed to extract archive: ${extractionError instanceof Error
                                ? extractionError.message
                                : String(extractionError)}`);
                        }
                        if (extractedPath) {
                            readmePath = await this.findReadmeFile(extractedPath);
                            await sendProgress("finalizing", `Extracted to ${getReadablePath(extractedPath)}`);
                        }
                        await fs.unlink(filePath).catch((unlinkError) => {
                            console.warn(`Failed to delete archive ${filePath}: ${unlinkError instanceof Error
                                ? unlinkError.message
                                : String(unlinkError)}`);
                        });
                    }
                    else {
                        await sendProgress("finalizing", `Saved file to ${getReadablePath(filePath)}`);
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
                }
                catch (error) {
                    console.error("Error in streamToThorapi:", error);
                    await this.postMessageToWebview({
                        type: "streamToThorapiResult",
                        streamToThorapiResult: {
                            success: false,
                            applicationId: message.applicationId,
                            error: error instanceof Error
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
    async updateTelemetrySetting(telemetrySetting) {
        await updateGlobalState(this.context, "telemetrySetting", telemetrySetting);
        const isOptedIn = telemetrySetting === "enabled";
        telemetryService.updateTelemetryState(isOptedIn);
    }
    async togglePlanActModeWithChatSettings(chatSettings, chatContent) {
        const didSwitchToActMode = chatSettings.mode === "act";
        // Capture mode switch telemetry | Capture regardless of if we know the taskId
        telemetryService.captureModeSwitch(this.task?.taskId ?? "0", chatSettings.mode);
        // Get previous model info that we will revert to after saving current mode api info
        const { apiConfiguration, previousModeApiProvider: newApiProvider, previousModeModelId: newModelId, previousModeModelInfo: newModelInfo, previousModeVsCodeLmModelSelector: newVsCodeLmModelSelector, previousModeThinkingBudgetTokens: newThinkingBudgetTokens, previousModeReasoningEffort: newReasoningEffort, planActSeparateModelsSetting, } = await getAllExtensionState(this.context);
        const shouldSwitchModel = planActSeparateModelsSetting === true;
        if (shouldSwitchModel) {
            // Save the last model used in this mode
            await updateGlobalState(this.context, "previousModeApiProvider", apiConfiguration.apiProvider);
            await updateGlobalState(this.context, "previousModeThinkingBudgetTokens", apiConfiguration.thinkingBudgetTokens);
            await updateGlobalState(this.context, "previousModeReasoningEffort", apiConfiguration.reasoningEffort);
            switch (apiConfiguration.apiProvider) {
                case "anthropic":
                case "bedrock":
                case "vertex":
                case "gemini":
                case "asksage":
                case "openai-native":
                case "qwen":
                case "deepseek":
                case "xai":
                    await updateGlobalState(this.context, "previousModeModelId", apiConfiguration.apiModelId);
                    break;
                case "openrouter":
                case "valoride":
                    await updateGlobalState(this.context, "previousModeModelId", apiConfiguration.openRouterModelId);
                    await updateGlobalState(this.context, "previousModeModelInfo", apiConfiguration.openRouterModelInfo);
                    break;
                case "vscode-lm":
                    // Important we don't set modelId to this, as it's an object not string (webview expects model id to be a string)
                    await updateGlobalState(this.context, "previousModeVsCodeLmModelSelector", apiConfiguration.vsCodeLmModelSelector);
                    break;
                case "openai":
                    await updateGlobalState(this.context, "previousModeModelId", apiConfiguration.openAiModelId);
                    await updateGlobalState(this.context, "previousModeModelInfo", apiConfiguration.openAiModelInfo);
                    break;
                case "ollama":
                    await updateGlobalState(this.context, "previousModeModelId", apiConfiguration.ollamaModelId);
                    break;
                case "lmstudio":
                    await updateGlobalState(this.context, "previousModeModelId", apiConfiguration.lmStudioModelId);
                    break;
                case "litellm":
                    await updateGlobalState(this.context, "previousModeModelId", apiConfiguration.liteLlmModelId);
                    break;
                case "requesty":
                    await updateGlobalState(this.context, "previousModeModelId", apiConfiguration.requestyModelId);
                    await updateGlobalState(this.context, "previousModeModelInfo", apiConfiguration.requestyModelInfo);
                    break;
            }
            // Restore the model used in previous mode
            if (newApiProvider ||
                newModelId ||
                newThinkingBudgetTokens !== undefined ||
                newReasoningEffort ||
                newVsCodeLmModelSelector) {
                await updateGlobalState(this.context, "apiProvider", newApiProvider);
                await updateGlobalState(this.context, "thinkingBudgetTokens", newThinkingBudgetTokens);
                await updateGlobalState(this.context, "reasoningEffort", newReasoningEffort);
                switch (newApiProvider) {
                    case "anthropic":
                    case "bedrock":
                    case "vertex":
                    case "gemini":
                    case "asksage":
                    case "openai-native":
                    case "qwen":
                    case "deepseek":
                    case "xai":
                        await updateGlobalState(this.context, "apiModelId", newModelId);
                        break;
                    case "openrouter":
                    case "valoride":
                        await updateGlobalState(this.context, "openRouterModelId", newModelId);
                        await updateGlobalState(this.context, "openRouterModelInfo", newModelInfo);
                        break;
                    case "vscode-lm":
                        await updateGlobalState(this.context, "vsCodeLmModelSelector", newVsCodeLmModelSelector);
                        break;
                    case "openai":
                        await updateGlobalState(this.context, "openAiModelId", newModelId);
                        await updateGlobalState(this.context, "openAiModelInfo", newModelInfo);
                        break;
                    case "ollama":
                        await updateGlobalState(this.context, "ollamaModelId", newModelId);
                        break;
                    case "lmstudio":
                        await updateGlobalState(this.context, "lmStudioModelId", newModelId);
                        break;
                    case "litellm":
                        await updateGlobalState(this.context, "liteLlmModelId", newModelId);
                        break;
                    case "requesty":
                        await updateGlobalState(this.context, "requestyModelId", newModelId);
                        await updateGlobalState(this.context, "requestyModelInfo", newModelInfo);
                        break;
                }
                if (this.task) {
                    const { apiConfiguration: updatedApiConfiguration } = await getAllExtensionState(this.context);
                    this.task.api = buildApiHandler(updatedApiConfiguration);
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
            }
            else {
                this.cancelTask();
            }
        }
    }
    async cancelTask() {
        if (this.task) {
            const { historyItem } = await this.getTaskWithId(this.task.taskId);
            try {
                await this.task.abortTask();
            }
            catch (error) {
                console.error("Failed to abort task", error);
            }
            await pWaitFor(() => this.task === undefined ||
                this.task.isStreaming === false ||
                this.task.didFinishAbortingStream ||
                this.task.isWaitingForFirstChunk, // if only first chunk is processed, then there's no need to wait for graceful abort (closes edits, browser, etc)
            {
                timeout: 3_000,
            }).catch(() => {
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
    async updateCustomInstructions(instructions) {
        // User may be clearing the field
        await updateGlobalState(this.context, "customInstructions", instructions || undefined);
        if (this.task) {
            this.task.customInstructions = instructions || undefined;
        }
    }
    // VSCode LM API
    async getVsCodeLmModels() {
        try {
            const models = await vscode.lm.selectChatModels({});
            return models || [];
        }
        catch (error) {
            console.error("Error fetching VS Code LM models:", error);
            return [];
        }
    }
    // Ollama
    async getOllamaModels(baseUrl) {
        try {
            if (!baseUrl) {
                baseUrl = "http://localhost:11434";
            }
            if (!URL.canParse(baseUrl)) {
                return [];
            }
            const response = await axios.get(`${baseUrl}/api/tags`);
            const modelsArray = response.data?.models?.map((model) => model.name) || [];
            const models = [...new Set(modelsArray)];
            return models;
        }
        catch (error) {
            return [];
        }
    }
    // LM Studio
    async getLmStudioModels(baseUrl) {
        try {
            if (!baseUrl) {
                baseUrl = "http://localhost:1234";
            }
            if (!URL.canParse(baseUrl)) {
                return [];
            }
            const response = await axios.get(`${baseUrl}/v1/models`);
            const modelsArray = response.data?.data?.map((model) => model.id) || [];
            const models = [...new Set(modelsArray)];
            return models;
        }
        catch (error) {
            return [];
        }
    }
    // Account
    async fetchUserCreditsData() {
        try {
            await Promise.all([
            // this.accountService?.fetchBalance(),
            // this.accountService?.fetchUsageTransactions(),
            // this.accountService?.fetchPaymentTransactions(),
            ]);
        }
        catch (error) {
            console.error("Failed to fetch user credits data:", error);
        }
    }
    // Auth
    async validateAuthState(state) {
        const storedNonce = await getSecret(this.context, "authNonce");
        if (!state || state !== storedNonce) {
            return false;
        }
        await storeSecret(this.context, "authNonce", undefined); // Clear after use
        return true;
    }
    async handleAuthCallback(customToken, apiKey, authenticatedPrincipal) {
        try {
            // Store API key for API calls
            await storeSecret(this.context, "valorideApiKey", apiKey);
            // Store JWT token for ThorAPI requests
            await storeSecret(this.context, "jwtToken", customToken);
            // Store authenticated principal in backend state
            if (authenticatedPrincipal) {
                await updateGlobalState(this.context, "userInfo", authenticatedPrincipal);
                await updateGlobalState(this.context, "authenticatedPrincipal", authenticatedPrincipal);
            }
            // Store authentication state flags
            await updateGlobalState(this.context, "isLoggedIn", true);
            // Send login success message to webview with all auth data
            await this.postMessageToWebview({
                type: "loginSuccess",
                token: customToken,
                authenticatedPrincipal: authenticatedPrincipal
                    ? JSON.stringify(authenticatedPrincipal)
                    : undefined,
            });
            const valorideProvider = "valoride";
            await updateGlobalState(this.context, "apiProvider", valorideProvider);
            // Update API configuration with the new provider and API key
            const { apiConfiguration } = await getAllExtensionState(this.context);
            const updatedConfig = {
                ...apiConfiguration,
                apiProvider: valorideProvider,
                valorideApiKey: apiKey,
            };
            if (this.task) {
                this.task.api = buildApiHandler(updatedConfig);
            }
            await this.postStateToWebview();
            // vscode.window.showInformationMessage("Successfully logged in to ValorIDE")
        }
        catch (error) {
            console.error("Failed to handle auth callback:", error);
            vscode.window.showErrorMessage("Failed to log in to ValorIDE");
            // Even on login failure, we preserve any existing tokens
            // Only clear tokens on explicit logout
        }
    }
    // MCP Marketplace
    async fetchMcpMarketplaceFromApi(silent = false) {
        try {
            const catalog = {
                items: [],
            };
            // Store in global state
            await updateGlobalState(this.context, "mcpMarketplaceCatalog", catalog);
            return catalog;
        }
        catch (error) {
            let errorMessage = "Failed to fetch MCP marketplace";
            if (axios.isAxiosError(error)) {
                if (error.code === "ECONNABORTED") {
                    errorMessage = "MCP marketplace request timed out. Please try again.";
                }
                else if (error.response?.status === 404) {
                    errorMessage =
                        "MCP marketplace service is not available (404). Please check if the service is running.";
                }
                else if (error.response?.status === 500) {
                    errorMessage =
                        "MCP marketplace service encountered an internal error. Please try again later.";
                }
                else if (error.response?.status === 503) {
                    errorMessage =
                        "MCP marketplace service is temporarily unavailable. Please try again later.";
                }
                else if (!error.response && error.request) {
                    errorMessage =
                        "Cannot connect to MCP marketplace service. Please check your network connection.";
                }
                else if (error.response) {
                    errorMessage = `MCP marketplace service returned error ${error.response.status}: ${error.response.statusText}`;
                }
            }
            else if (error instanceof Error) {
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
        }
        catch (error) {
            console.error("Failed to silently refresh MCP marketplace:", error);
        }
    }
    async fetchMcpMarketplace(forceRefresh = false) {
        try {
            // Check if we have cached data
            const cachedCatalog = (await getGlobalState(this.context, "mcpMarketplaceCatalog"));
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
        }
        catch (error) {
            console.error("Failed to handle cached MCP marketplace:", error);
            const errorMessage = error instanceof Error
                ? error.message
                : "Failed to handle cached MCP marketplace";
            await this.postMessageToWebview({
                type: "mcpMarketplaceCatalog",
                error: errorMessage,
            });
            vscode.window.showErrorMessage(errorMessage);
        }
    }
    async downloadMcp(mcpId) {
        try {
            // First check if we already have this MCP server installed
            const servers = this.mcpHub?.getServers() || [];
            const isInstalled = servers.some((server) => server.name === mcpId);
            if (isInstalled) {
                throw new Error("This MCP server is already installed");
            }
            // Get JWT token for authentication (same as ApplicationService)
            const token = await this.context.secrets.get("jwtToken");
            const headers = {
                "Content-Type": "application/json",
            };
            if (token) {
                headers["authorization"] = `Bearer ${token}`;
            }
            // Fetch server details from marketplace using same URL pattern as ApplicationService
            const response = await axios.post(`${process.env.VITE_basePath || "http://localhost:8080/v1"}/McpServer`, { mcpId }, {
                headers,
                timeout: 10000,
            });
            if (!response.data) {
                throw new Error("Invalid response from MCP marketplace API");
            }
            console.log("[downloadMcp] Response from download API", { response });
            const mcpDetails = response.data;
            // Validate required fields
            if (!mcpDetails.githubUrl) {
                throw new Error("Missing GitHub URL in MCP download response");
            }
            if (!mcpDetails.readmeContent) {
                throw new Error("Missing README content in MCP download response");
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
        }
        catch (error) {
            console.error("Failed to download MCP:", error);
            let errorMessage = "Failed to download MCP";
            if (axios.isAxiosError(error)) {
                if (error.code === "ECONNABORTED") {
                    errorMessage = "Request timed out. Please try again.";
                }
                else if (error.response?.status === 404) {
                    errorMessage = "MCP server not found in marketplace.";
                }
                else if (error.response?.status === 500) {
                    errorMessage = "Internal server error. Please try again later.";
                }
                else if (!error.response && error.request) {
                    errorMessage =
                        "Network error. Please check your internet connection.";
                }
            }
            else if (error instanceof Error) {
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
    async getOpenAiModels(baseUrl, apiKey) {
        try {
            if (!baseUrl) {
                return [];
            }
            if (!URL.canParse(baseUrl)) {
                return [];
            }
            const config = {};
            if (apiKey) {
                config["headers"] = { Authorization: `Bearer ${apiKey}` };
            }
            const response = await axios.get(`${baseUrl}/models`, config);
            const modelsArray = response.data?.data?.map((model) => model.id) || [];
            const models = [...new Set(modelsArray)];
            return models;
        }
        catch (error) {
            return [];
        }
    }
    // OpenRouter
    async handleOpenRouterCallback(code) {
        let apiKey;
        try {
            const response = await axios.post("https://openrouter.ai/api/v1/auth/keys", { code });
            if (response.data && response.data.key) {
                apiKey = response.data.key;
            }
            else {
                throw new Error("Invalid response from OpenRouter API");
            }
        }
        catch (error) {
            console.error("Error exchanging code for API key:", error);
            throw error;
        }
        const openrouter = "openrouter";
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
    async ensureCacheDirectoryExists() {
        const cacheDir = path.join(this.context.globalStorageUri.fsPath, "cache");
        await fs.mkdir(cacheDir, { recursive: true });
        return cacheDir;
    }
    async readOpenRouterModels() {
        const openRouterModelsFilePath = path.join(await this.ensureCacheDirectoryExists(), GlobalFileNames.openRouterModels);
        const fileExists = await fileExistsAtPath(openRouterModelsFilePath);
        if (fileExists) {
            const fileContents = await fs.readFile(openRouterModelsFilePath, "utf8");
            return JSON.parse(fileContents);
        }
        return undefined;
    }
    async refreshOpenRouterModels() {
        const openRouterModelsFilePath = path.join(await this.ensureCacheDirectoryExists(), GlobalFileNames.openRouterModels);
        let models = {};
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
                const parsePrice = (price) => {
                    if (price) {
                        return parseFloat(price) * 1_000_000;
                    }
                    return undefined;
                };
                for (const rawModel of rawModels) {
                    const modelInfo = {
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
            }
            else {
                console.error("Invalid response from OpenRouter API");
            }
            await fs.writeFile(openRouterModelsFilePath, JSON.stringify(models));
            console.log("OpenRouter models fetched and saved", models);
        }
        catch (error) {
            console.error("Error fetching OpenRouter models:", error);
        }
        await this.postMessageToWebview({
            type: "openRouterModels",
            openRouterModels: models,
        });
        return models;
    }
    async refreshRequestyModels() {
        const parsePrice = (price) => {
            if (price) {
                return parseFloat(price) * 1_000_000;
            }
            return undefined;
        };
        let models = {};
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
                    const modelInfo = {
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
            }
            else {
                console.error("Invalid response from Requesty API");
            }
        }
        catch (error) {
            console.error("Error fetching Requesty models:", error);
        }
        await this.postMessageToWebview({
            type: "requestyModels",
            requestyModels: models,
        });
        return models;
    }
    async refreshLLMDetails() {
        let models = {};
        try {
            const { apiConfiguration } = await getAllExtensionState(this.context);
            // If ValkyrAI is not configured, don't attempt to fetch
            if (!apiConfiguration?.valkyraiHost) {
                console.log("ValkyrAI host not configured, skipping LLMDetails fetch");
                await this.postMessageToWebview({
                    type: "llmDetailsUpdated",
                    models: {},
                });
                return {};
            }
            // Fetch LLM details from ValkyrAI
            const valkyraiUrl = apiConfiguration.valkyraiHost.replace(/\/$/, ""); // Remove trailing slash
            const endpoint = `${valkyraiUrl}/v1/llm-details`;
            const headers = {
                "Content-Type": "application/json",
            };
            // Add JWT token if available
            if (apiConfiguration?.valkyraiJwt) {
                headers["Authorization"] = `Bearer ${apiConfiguration.valkyraiJwt}`;
            }
            const response = await axios.get(endpoint, { headers });
            if (Array.isArray(response.data)) {
                // Transform ValkyrAI LLMDetails to ModelInfo format
                for (const llmDetail of response.data) {
                    if (llmDetail.id) {
                        const modelInfo = {
                            maxTokens: llmDetail.maxTokens,
                            contextWindow: llmDetail.contextWindow,
                            supportsImages: llmDetail.supportsImages,
                            supportsPromptCache: llmDetail.supportsPromptCache,
                            inputPrice: llmDetail.inputPrice,
                            outputPrice: llmDetail.outputPrice,
                            description: llmDetail.description || `${llmDetail.provider} ${llmDetail.name}${llmDetail.version ? ` (${llmDetail.version})` : ""}`,
                        };
                        models[llmDetail.id] = modelInfo;
                    }
                }
                console.log("LLMDetails fetched from ValkyrAI", models);
            }
            else {
                console.error("Invalid response from ValkyrAI LLMDetails endpoint");
            }
        }
        catch (error) {
            console.error("Error fetching LLMDetails from ValkyrAI:", error);
        }
        await this.postMessageToWebview({
            type: "llmDetailsUpdated",
            models,
        });
        return models;
    }
    // Context menus and code actions
    getFileMentionFromPath(filePath) {
        const cwd = vscode.workspace.workspaceFolders
            ?.map((folder) => folder.uri.fsPath)
            .at(0);
        if (!cwd) {
            return "@/" + filePath;
        }
        const relativePath = path.relative(cwd, filePath);
        return "@/" + relativePath;
    }
    // 'Add to ValorIDE' context menu in editor and code action
    async addSelectedCodeToChat(code, filePath, languageId, diagnostics) {
        // Ensure the sidebar view is visible
        await vscode.commands.executeCommand("valoride-dev.SidebarProvider.focus");
        await setTimeoutPromise(100);
        // Post message to webview with the selected code
        const fileMention = this.getFileMentionFromPath(filePath);
        let input = `${fileMention}\n\`\`\`\n${code}\n\`\`\``;
        if (diagnostics) {
            const problemsString = this.convertDiagnosticsToProblemsString(diagnostics);
            input += `\nProblems:\n${problemsString}`;
        }
        await this.postMessageToWebview({
            type: "addToInput",
            text: input,
        });
        console.log("addSelectedCodeToChat", code, filePath, languageId);
    }
    // 'Add to ValorIDE' context menu in Terminal
    async addSelectedTerminalOutputToChat(output, terminalName) {
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
    async fixWithValorIDE(code, filePath, languageId, diagnostics) {
        // Ensure the sidebar view is visible
        await vscode.commands.executeCommand("valoride-dev.SidebarProvider.focus");
        await setTimeoutPromise(100);
        const fileMention = this.getFileMentionFromPath(filePath);
        const problemsString = this.convertDiagnosticsToProblemsString(diagnostics);
        await this.initTask(`Fix the following code in ${fileMention}\n\`\`\`\n${code}\n\`\`\`\n\nProblems:\n${problemsString}`);
        console.log("fixWithValorIDE", code, filePath, languageId, diagnostics, problemsString);
    }
    convertDiagnosticsToProblemsString(diagnostics) {
        let problemsString = "";
        for (const diagnostic of diagnostics) {
            let label;
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
    async getTaskWithId(id) {
        const history = (await getGlobalState(this.context, "taskHistory")) || [];
        const historyItem = history.find((item) => item.id === id);
        if (historyItem) {
            const taskDirPath = path.join(this.context.globalStorageUri.fsPath, "tasks", id);
            const apiConversationHistoryFilePath = path.join(taskDirPath, GlobalFileNames.apiConversationHistory);
            const uiMessagesFilePath = path.join(taskDirPath, GlobalFileNames.uiMessages);
            const contextHistoryFilePath = path.join(taskDirPath, GlobalFileNames.contextHistory);
            const taskMetadataFilePath = path.join(taskDirPath, GlobalFileNames.taskMetadata);
            const fileExists = await fileExistsAtPath(apiConversationHistoryFilePath);
            if (fileExists) {
                const apiConversationHistory = JSON.parse(await fs.readFile(apiConversationHistoryFilePath, "utf8"));
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
    async showTaskWithId(id) {
        if (id !== this.task?.taskId) {
            // non-current task
            const { historyItem } = await this.getTaskWithId(id);
            await this.initTask(undefined, undefined, historyItem); // clears existing task
        }
        await this.postMessageToWebview({
            type: "action",
            action: "chatButtonClicked",
        });
    }
    async exportTaskWithId(id) {
        const { historyItem, apiConversationHistory } = await this.getTaskWithId(id);
        await downloadTask(historyItem.ts, apiConversationHistory);
    }
    async deleteAllTaskHistory() {
        await this.clearTask();
        await updateGlobalState(this.context, "taskHistory", []);
        try {
            // Remove all contents of tasks directory
            const taskDirPath = path.join(this.context.globalStorageUri.fsPath, "tasks");
            if (await fileExistsAtPath(taskDirPath)) {
                await fs.rm(taskDirPath, { recursive: true, force: true });
            }
            // Remove checkpoints directory contents
            const checkpointsDirPath = path.join(this.context.globalStorageUri.fsPath, "checkpoints");
            if (await fileExistsAtPath(checkpointsDirPath)) {
                await fs.rm(checkpointsDirPath, { recursive: true, force: true });
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Encountered error while deleting task history, there may be some files left behind. Error: ${error instanceof Error ? error.message : String(error)}`);
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
    async deleteTaskWithId(id) {
        console.info("deleteTaskWithId: ", id);
        try {
            if (id === this.task?.taskId) {
                await this.clearTask();
                console.debug("cleared task");
            }
            const { taskDirPath, apiConversationHistoryFilePath, uiMessagesFilePath, contextHistoryFilePath, taskMetadataFilePath, } = await this.getTaskWithId(id);
            const legacyMessagesFilePath = path.join(taskDirPath, "claude_messages.json");
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
        }
        catch (error) {
            console.debug(`Error deleting task:`, error);
        }
        this.refreshTotalTasksSize();
    }
    async deleteTaskFromState(id) {
        // Remove the task from history
        const taskHistory = (await getGlobalState(this.context, "taskHistory")) || [];
        const updatedTaskHistory = taskHistory.filter((task) => task.id !== id);
        await updateGlobalState(this.context, "taskHistory", updatedTaskHistory);
        // Notify the webview that the task has been deleted
        await this.postStateToWebview();
        return updatedTaskHistory;
    }
    async postStateToWebview() {
        const state = await this.getStateToPostToWebview();
        this.postMessageToWebview({ type: "state", state });
    }
    async getStateToPostToWebview() {
        const { apiConfiguration, lastShownAnnouncementId, customInstructions, taskHistory, autoApprovalSettings, browserSettings, chatSettings, userInfo, mcpMarketplaceEnabled, telemetrySetting, planActSeparateModelsSetting, globalValorIDERulesToggles, authenticatedPrincipal, isLoggedIn, } = await getAllExtensionState(this.context);
        // Build advanced settings from VS Code configuration
        const cfg = vscode.workspace.getConfiguration("valoride");
        const advancedSettings = validateAdvancedSettings({
            fileProcessing: {
                maxFileSize: cfg.get("advanced.fileProcessing.maxFileSize") ??
                    DEFAULT_ADVANCED_SETTINGS.fileProcessing.maxFileSize,
                warnLargeFiles: cfg.get("advanced.fileProcessing.warnLargeFiles") ??
                    DEFAULT_ADVANCED_SETTINGS.fileProcessing.warnLargeFiles,
                largeFileThreshold: cfg.get("advanced.fileProcessing.largeFileThreshold") ??
                    DEFAULT_ADVANCED_SETTINGS.fileProcessing.largeFileThreshold,
                chunkSize: DEFAULT_ADVANCED_SETTINGS.fileProcessing.chunkSize,
                streamingDelay: DEFAULT_ADVANCED_SETTINGS.fileProcessing.streamingDelay,
                enableProgressiveLoading: DEFAULT_ADVANCED_SETTINGS.fileProcessing.enableProgressiveLoading,
            },
            budgetAlerts: {
                depletedThreshold: cfg.get("advanced.budgetAlerts.depletedThreshold") ??
                    DEFAULT_ADVANCED_SETTINGS.budgetAlerts.depletedThreshold,
                criticalThreshold: cfg.get("advanced.budgetAlerts.criticalThreshold") ??
                    DEFAULT_ADVANCED_SETTINGS.budgetAlerts.criticalThreshold,
                lowThreshold: cfg.get("advanced.budgetAlerts.lowThreshold") ??
                    DEFAULT_ADVANCED_SETTINGS.budgetAlerts.lowThreshold,
                alertThreshold: cfg.get("advanced.budgetAlerts.alertThreshold") ??
                    DEFAULT_ADVANCED_SETTINGS.budgetAlerts.alertThreshold,
            },
            debugging: {
                enableVerboseLogging: cfg.get("advanced.debugging.enableVerboseLogging") ??
                    DEFAULT_ADVANCED_SETTINGS.debugging.enableVerboseLogging,
                saveFailedMatches: cfg.get("advanced.debugging.saveFailedMatches") ??
                    DEFAULT_ADVANCED_SETTINGS.debugging.saveFailedMatches,
                enablePerformanceMetrics: cfg.get("advanced.debugging.enablePerformanceMetrics") ??
                    DEFAULT_ADVANCED_SETTINGS.debugging.enablePerformanceMetrics,
                logOutputFiltering: cfg.get("advanced.debugging.logOutputFiltering") ??
                    DEFAULT_ADVANCED_SETTINGS.debugging.logOutputFiltering,
                showPsrResultsReport: cfg.get("advanced.debugging.showPsrResultsReport") ??
                    DEFAULT_ADVANCED_SETTINGS.debugging.showPsrResultsReport,
            },
            thorapi: {
                outputFolder: cfg.get("advanced.thorapi.outputFolder") ??
                    DEFAULT_ADVANCED_SETTINGS.thorapi.outputFolder,
            },
        });
        const thorapiFolderPath = resolveThorapiFolderPath(cwd);
        // Get JWT token from secrets
        const jwtToken = await getSecret(this.context, "jwtToken");
        const localValorIDERulesToggles = (await getWorkspaceState(this.context, "localValorIDERulesToggles")) || {};
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
            shouldShowAnnouncement: lastShownAnnouncementId !== this.latestAnnouncementId,
            platform: process.platform,
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
    async updateTaskHistory(item) {
        const history = (await getGlobalState(this.context, "taskHistory")) ||
            [];
        const existingItemIndex = history.findIndex((h) => h.id === item.id);
        if (existingItemIndex !== -1) {
            history[existingItemIndex] = item;
        }
        else {
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
    async fetchOpenGraphData(url) {
        try {
            // Use the fetchOpenGraphData function from link-preview.ts
            const ogData = await fetchOpenGraphData(url);
            // Send the data back to the webview
            await this.postMessageToWebview({
                type: "openGraphData",
                openGraphData: ogData,
                url: url,
            });
        }
        catch (error) {
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
    async checkIsImageUrl(url) {
        try {
            // Check if the URL is an image
            const isImage = await isImageUrl(url);
            // Send the result back to the webview
            await this.postMessageToWebview({
                type: "isImageUrlResult",
                isImage,
                url,
            });
        }
        catch (error) {
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
    async findReadmeFile(directory) {
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
                    const readmeEntry = subEntries.find((subEntry) => subEntry.isFile() && readmeRegex.test(subEntry.name));
                    if (readmeEntry) {
                        return path.join(subdir, readmeEntry.name);
                    }
                }
                catch (subdirError) {
                    console.warn(`findReadmeFile: unable to scan ${subdir}: ${subdirError instanceof Error
                        ? subdirError.message
                        : String(subdirError)}`);
                }
            }
        }
        catch (error) {
            console.warn(`findReadmeFile: unable to scan ${directory}: ${error instanceof Error ? error.message : String(error)}`);
        }
        return undefined;
    }
    async getThorapiFolderStructure(folderPath) {
        try {
            const exists = await fileExistsAtPath(folderPath);
            if (!exists) {
                return [];
            }
            const entries = await fs.readdir(folderPath, { withFileTypes: true });
            const files = [];
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
                }
                else {
                    files.push({
                        name: entry.name,
                        path: relativePath,
                        type: "file",
                    });
                }
            }
            return files;
        }
        catch (error) {
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
//# sourceMappingURL=index.js.map