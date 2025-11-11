import cloneDeep from "clone-deep";
import { execa } from "execa";
import getFolderSize from "get-folder-size";
import { setTimeout as setTimeoutPromise } from "node:timers/promises";
import os from "os";
import pTimeout, { TimeoutError } from "p-timeout";
import pWaitFor from "p-wait-for";
import * as path from "path";
import { serializeError } from "serialize-error";
import * as vscode from "vscode";
import { Logger } from "@services/logging/Logger";
import { buildApiHandler } from "@api/index";
import { AnthropicHandler } from "@api/providers/anthropic";
import { ValorIDEHandler } from "@api/providers/valoride";
import { OpenRouterHandler } from "@api/providers/openrouter";
import CheckpointTracker from "@integrations/checkpoints/CheckpointTracker";
import { DIFF_VIEW_URI_SCHEME, DiffViewProvider, } from "@integrations/editor/DiffViewProvider";
import { formatContentBlockToMarkdown } from "@integrations/misc/export-markdown";
import { extractTextFromFile } from "@integrations/misc/extract-text";
import { showSystemNotification } from "@integrations/notifications";
import { TerminalManager } from "@integrations/terminal/TerminalManager";
import { BrowserSession } from "@services/browser/BrowserSession";
import { UrlContentFetcher } from "@services/browser/UrlContentFetcher";
import { listFiles } from "@services/glob/list-files";
import { regexSearchFiles } from "@services/ripgrep";
import { telemetryService } from "@services/telemetry/TelemetryService";
import { parseSourceCodeForDefinitionsTopLevel } from "@services/tree-sitter";
import { findLast, findLastIndex, parsePartialArrayString, } from "@shared/array";
import { DEFAULT_CHAT_SETTINGS } from "@shared/ChatSettings";
import { combineApiRequests } from "@shared/combineApiRequests";
import { combineCommandSequences, COMMAND_REQ_APP_STRING, } from "@shared/combineCommandSequences";
import { browserActions, COMPLETION_RESULT_CHANGES_FLAG, } from "@shared/ExtensionMessage";
import { getApiMetrics } from "@shared/getApiMetrics";
import { DEFAULT_LANGUAGE_SETTINGS, getLanguageKey, } from "@shared/Languages";
import { calculateApiCostAnthropic } from "@utils/cost";
import { fileExistsAtPath } from "@utils/fs";
import { arePathsEqual, getReadablePath, isLocatedInWorkspace, } from "@utils/path";
import { fixModelHtmlEscaping, removeInvalidChars } from "@utils/string";
import { parseAssistantMessage, } from "@core/assistant-message";
import { constructNewFileContent } from "@core/assistant-message/diff";
import { ValorIDEIgnoreController } from "@core/ignore/ValorIDEIgnoreController";
import { parseMentions } from "@core/mentions";
import { formatResponse } from "@core/prompts/responses";
import { addUserInstructions, SYSTEM_PROMPT } from "@core/prompts/system";
import { getContextWindowInfo } from "@core/context/context-management/context-window-utils";
import { FileContextTracker } from "@core/context/context-tracking/FileContextTracker";
import { ModelContextTracker } from "@core/context/context-tracking/ModelContextTracker";
import { checkIsAnthropicContextWindowError, checkIsOpenRouterContextWindowError, } from "@core/context/context-management/context-error-handling";
import { ContextManager } from "@core/context/context-management/ContextManager";
import { loadMcpDocumentation } from "@core/prompts/loadMcpDocumentation";
import { ensureRulesDirectoryExists, ensureTaskDirectoryExists, getSavedApiConversationHistory, getSavedValorIDEMessages, saveApiConversationHistory, saveValorIDEMessages, } from "@core/storage/disk";
import { getGlobalValorIDERules, getLocalValorIDERules, refreshValorIDERulesToggles, } from "@core/context/instructions/user-instructions/valoride-rules";
import { getGlobalState } from "@core/storage/state";
import { parseSlashCommands } from "@core/slash-commands";
import { isInTestMode } from "../../services/test/TestMode";
import { OutputFilterService } from "@services/output-filter/OutputFilterService";
import { DEFAULT_ADVANCED_SETTINGS } from "@shared/AdvancedSettings";
import { MessageHandler } from "./MessageHandler";
import { StreamingHandler } from "./StreamingHandler";
import { CheckpointHandler } from "./CheckpointHandler";
import { ToolDescriptionHelper } from "./ToolDescriptionHelper";
import { TagProcessingUtils } from "./TagProcessingUtils";
import { ErrorHandlingUtils } from "./ErrorHandlingUtils";
export const cwd = vscode.workspace.workspaceFolders?.map((folder) => folder.uri.fsPath).at(0) ??
    path.join(os.homedir(), "Desktop"); // may or may not exist but fs checking existence would immediately ask for permission which would be bad UX, need to come up with a better solution
export class Task {
    // dependencies
    context;
    mcpHub;
    workspaceTracker;
    updateTaskHistory;
    postStateToWebview;
    postMessageToWebview;
    reinitExistingTaskFromId;
    cancelTask;
    toolRelayService;
    communicationService;
    taskId;
    api;
    terminalManager;
    urlContentFetcher;
    browserSession;
    contextManager;
    didEditFile = false;
    customInstructions;
    thorapi_project;
    autoApprovalSettings;
    browserSettings;
    chatSettings;
    apiConversationHistory = [];
    valorideMessages = [];
    valorideIgnoreController;
    askResponse;
    askResponseText;
    askResponseImages;
    lastMessageTs;
    consecutiveAutoApprovedRequestsCount = 0;
    consecutiveMistakeCount = 0;
    abort = false;
    didFinishAbortingStream = false;
    abandoned = false;
    diffViewProvider;
    checkpointTracker;
    checkpointTrackerErrorMessage;
    conversationHistoryDeletedRange;
    isInitialized = false;
    isAwaitingPlanResponse = false;
    didRespondToPlanAskBySwitchingMode = false;
    // Metadata tracking
    fileContextTracker;
    modelContextTracker;
    // streaming
    isWaitingForFirstChunk = false;
    isStreaming = false;
    currentStreamingContentIndex = 0;
    assistantMessageContent = [];
    userMessageContent = [];
    userMessageContentReady = false;
    didRejectTool = false;
    didAlreadyUseTool = false;
    didCompleteReadingStream = false;
    didAutomaticallyRetryFailedApiRequest = false;
    // Handler instances for better code organization
    messageHandler;
    streamingHandler;
    checkpointHandler;
    /**
     * Relays tool commands to remote ValorIDE instances via websocket mothership.
     * This enables "remote control" functionality where one ValorIDE can control another.
     */
    async relayToolCommandToMothership(toolName, params) {
        try {
            if (!this.toolRelayService || typeof this.toolRelayService.sendToolCommand !== "function") {
                // Tool relay service not available or not connected
                return;
            }
            await this.toolRelayService.sendToolCommand(toolName, params);
        }
        catch (error) {
            // Silently fail for relay - do not break local functionality
            console.warn("Failed to relay tool command to mothership:", error);
        }
    }
    constructor(context, mcpHub, workspaceTracker, updateTaskHistory, postStateToWebview, postMessageToWebview, reinitExistingTaskFromId, cancelTask, apiConfiguration, autoApprovalSettings, browserSettings, chatSettings, customInstructions, task, images, historyItem, communicationService, thorapi_project) {
        this.context = context;
        this.mcpHub = mcpHub;
        this.workspaceTracker = workspaceTracker;
        this.updateTaskHistory = updateTaskHistory;
        this.postStateToWebview = postStateToWebview;
        this.postMessageToWebview = postMessageToWebview;
        this.reinitExistingTaskFromId = reinitExistingTaskFromId;
        this.cancelTask = cancelTask;
        this.valorideIgnoreController = new ValorIDEIgnoreController(cwd);
        this.valorideIgnoreController.initialize().catch((error) => {
            console.error("Failed to initialize ValorIDEIgnoreController:", error);
        });
        this.terminalManager = new TerminalManager();
        this.urlContentFetcher = new UrlContentFetcher(context);
        this.browserSession = new BrowserSession(context, browserSettings);
        this.contextManager = new ContextManager();
        this.diffViewProvider = new DiffViewProvider(cwd, DEFAULT_ADVANCED_SETTINGS.fileProcessing);
        this.customInstructions = customInstructions;
        this.autoApprovalSettings = autoApprovalSettings;
        this.browserSettings = browserSettings;
        this.chatSettings = chatSettings;
        this.communicationService = communicationService;
        this.thorapi_project = thorapi_project;
        // Initialize taskId first
        if (historyItem) {
            this.taskId = historyItem.id;
            this.conversationHistoryDeletedRange =
                historyItem.conversationHistoryDeletedRange;
        }
        else if (task || images) {
            this.taskId = Date.now().toString();
        }
        else {
            throw new Error("Either historyItem or task/images must be provided");
        }
        // Initialize file context tracker
        this.fileContextTracker = new FileContextTracker(context, this.taskId);
        this.modelContextTracker = new ModelContextTracker(context, this.taskId);
        // Now that taskId is initialized, we can build the API handler
        this.api = buildApiHandler({
            ...apiConfiguration,
            taskId: this.taskId,
        });
        // Set taskId on browserSession for telemetry tracking
        this.browserSession.setTaskId(this.taskId);
        // Initialize handlers for better code organization
        this.messageHandler = new MessageHandler(this.saveValorIDEMessagesAndUpdateHistory.bind(this), this.postStateToWebview, this.postMessageToWebview);
        this.streamingHandler = new StreamingHandler(this.messageHandler);
        this.checkpointHandler = new CheckpointHandler(this.taskId, context, this.messageHandler, this.updateTaskHistory, this.postStateToWebview, this.postMessageToWebview, this.reinitExistingTaskFromId, this.cancelTask, this.saveValorIDEMessagesAndUpdateHistory.bind(this));
        // Continue with task initialization
        if (historyItem) {
            this.resumeTaskFromHistory().catch((error) => {
                console.error("Failed to resume task from history:", error);
            });
        }
        else if (task || images) {
            this.startTask(task, images).catch((error) => {
                console.error("Failed to start task:", error);
            });
        }
        // initialize telemetry
        if (historyItem) {
            // Open task from history
            telemetryService.captureTaskRestarted(this.taskId, apiConfiguration.apiProvider);
        }
        else {
            // New task started
            telemetryService.captureTaskCreated(this.taskId, apiConfiguration.apiProvider);
        }
    }
    // While a task is ref'd by a controller, it will always have access to the extension context
    // This error is thrown if the controller derefs the task after e.g., aborting the task
    getContext() {
        const context = this.context;
        if (!context) {
            throw new Error("Unable to access extension context");
        }
        return context;
    }
    // Storing task to disk for history
    async addToApiConversationHistory(message) {
        this.apiConversationHistory.push(message);
        await saveApiConversationHistory(this.getContext(), this.taskId, this.apiConversationHistory);
    }
    async overwriteApiConversationHistory(newHistory) {
        this.apiConversationHistory = newHistory;
        await saveApiConversationHistory(this.getContext(), this.taskId, this.apiConversationHistory);
    }
    async addToValorIDEMessages(message) {
        // these values allow us to reconstruct the conversation history at the time this valoride message was created
        // it's important that apiConversationHistory is initialized before we add valoride messages
        message.conversationHistoryIndex = this.apiConversationHistory.length - 1; // NOTE: this is the index of the last added message which is the user message, and once the valoridemessages have been presented we update the apiconversationhistory with the completed assistant message. This means when resetting to a message, we need to +1 this index to get the correct assistant message that this tool use corresponds to
        message.conversationHistoryDeletedRange =
            this.conversationHistoryDeletedRange;
        this.valorideMessages.push(message);
        await this.saveValorIDEMessagesAndUpdateHistory();
    }
    async overwriteValorIDEMessages(newMessages) {
        this.valorideMessages = newMessages;
        await this.saveValorIDEMessagesAndUpdateHistory();
    }
    async saveValorIDEMessagesAndUpdateHistory() {
        try {
            await saveValorIDEMessages(this.getContext(), this.taskId, this.valorideMessages);
            // combined as they are in ChatView
            const apiMetrics = getApiMetrics(combineApiRequests(combineCommandSequences(this.valorideMessages.slice(1))));
            const taskMessage = this.valorideMessages[0]; // first message is always the task say
            const lastRelevantMessage = this.valorideMessages[findLastIndex(this.valorideMessages, (m) => !(m.ask === "resume_task" || m.ask === "resume_completed_task"))];
            const taskDir = await ensureTaskDirectoryExists(this.getContext(), this.taskId);
            let taskDirSize = 0;
            try {
                // getFolderSize.loose silently ignores errors
                // returns # of bytes, size/1000/1000 = MB
                taskDirSize = await getFolderSize.loose(taskDir);
            }
            catch (error) {
                console.error("Failed to get task directory size:", taskDir, error);
            }
            await this.updateTaskHistory({
                id: this.taskId,
                ts: lastRelevantMessage.ts,
                task: taskMessage.text ?? "",
                tokensIn: apiMetrics.totalTokensIn,
                tokensOut: apiMetrics.totalTokensOut,
                cacheWrites: apiMetrics.totalCacheWrites,
                cacheReads: apiMetrics.totalCacheReads,
                totalCost: apiMetrics.totalCost,
                size: taskDirSize,
                shadowGitConfigWorkTree: await this.checkpointTracker?.getShadowGitConfigWorkTree(),
                conversationHistoryDeletedRange: this.conversationHistoryDeletedRange,
            });
        }
        catch (error) {
            console.error("Failed to save valoride messages:", error);
        }
    }
    async restoreCheckpoint(messageTs, restoreType, offset) {
        const messageIndex = this.valorideMessages.findIndex((m) => m.ts === messageTs) -
            (offset || 0);
        // Find the last message before messageIndex that has a lastCheckpointHash
        const lastHashIndex = findLastIndex(this.valorideMessages.slice(0, messageIndex), (m) => m.lastCheckpointHash !== undefined);
        const message = this.valorideMessages[messageIndex];
        const lastMessageWithHash = this.valorideMessages[lastHashIndex];
        if (!message) {
            console.error("Message not found", this.valorideMessages);
            return;
        }
        let didWorkspaceRestoreFail = false;
        switch (restoreType) {
            case "task":
                break;
            case "taskAndWorkspace":
            case "workspace":
                if (!this.checkpointTracker && !this.checkpointTrackerErrorMessage) {
                    try {
                        this.checkpointTracker = await CheckpointTracker.create(this.taskId, this.context.globalStorageUri.fsPath);
                    }
                    catch (error) {
                        const errorMessage = error instanceof Error ? error.message : "Unknown error";
                        console.error("Failed to initialize checkpoint tracker:", errorMessage);
                        this.checkpointTrackerErrorMessage = errorMessage;
                        await this.postStateToWebview();
                        vscode.window.showErrorMessage(errorMessage);
                        didWorkspaceRestoreFail = true;
                    }
                }
                if (message.lastCheckpointHash && this.checkpointTracker) {
                    try {
                        await this.checkpointTracker.resetHead(message.lastCheckpointHash);
                    }
                    catch (error) {
                        const errorMessage = error instanceof Error ? error.message : "Unknown error";
                        vscode.window.showErrorMessage("Failed to restore checkpoint: " + errorMessage);
                        didWorkspaceRestoreFail = true;
                    }
                }
                else if (offset &&
                    lastMessageWithHash.lastCheckpointHash &&
                    this.checkpointTracker) {
                    try {
                        await this.checkpointTracker.resetHead(lastMessageWithHash.lastCheckpointHash);
                    }
                    catch (error) {
                        const errorMessage = error instanceof Error ? error.message : "Unknown error";
                        vscode.window.showErrorMessage("Failed to restore offsetcheckpoint: " + errorMessage);
                        didWorkspaceRestoreFail = true;
                    }
                }
                break;
        }
        if (!didWorkspaceRestoreFail) {
            switch (restoreType) {
                case "task":
                case "taskAndWorkspace":
                    this.conversationHistoryDeletedRange =
                        message.conversationHistoryDeletedRange;
                    const newConversationHistory = this.apiConversationHistory.slice(0, (message.conversationHistoryIndex || 0) + 2); // +1 since this index corresponds to the last user message, and another +1 since slice end index is exclusive
                    await this.overwriteApiConversationHistory(newConversationHistory);
                    // update the context history state
                    await this.contextManager.truncateContextHistory(message.ts, await ensureTaskDirectoryExists(this.getContext(), this.taskId));
                    // aggregate deleted api reqs info so we don't lose costs/tokens
                    const deletedMessages = this.valorideMessages.slice(messageIndex + 1);
                    const deletedApiReqsMetrics = getApiMetrics(combineApiRequests(combineCommandSequences(deletedMessages)));
                    const newValorIDEMessages = this.valorideMessages.slice(0, messageIndex + 1);
                    await this.overwriteValorIDEMessages(newValorIDEMessages); // calls saveValorIDEMessages which saves historyItem
                    await this.say("deleted_api_reqs", JSON.stringify({
                        tokensIn: deletedApiReqsMetrics.totalTokensIn,
                        tokensOut: deletedApiReqsMetrics.totalTokensOut,
                        cacheWrites: deletedApiReqsMetrics.totalCacheWrites,
                        cacheReads: deletedApiReqsMetrics.totalCacheReads,
                        cost: deletedApiReqsMetrics.totalCost,
                    }));
                    break;
                case "workspace":
                    break;
            }
            switch (restoreType) {
                case "task":
                    vscode.window.showInformationMessage("Task messages have been restored to the checkpoint");
                    break;
                case "workspace":
                    vscode.window.showInformationMessage("Workspace files have been restored to the checkpoint");
                    break;
                case "taskAndWorkspace":
                    vscode.window.showInformationMessage("Task and workspace have been restored to the checkpoint");
                    break;
            }
            if (restoreType !== "task") {
                // Set isCheckpointCheckedOut flag on the message
                // Find all checkpoint messages before this one
                const checkpointMessages = this.valorideMessages.filter((m) => m.say === "checkpoint_created");
                const currentMessageIndex = checkpointMessages.findIndex((m) => m.ts === messageTs);
                // Set isCheckpointCheckedOut to false for all checkpoint messages
                checkpointMessages.forEach((m, i) => {
                    m.isCheckpointCheckedOut = i === currentMessageIndex;
                });
            }
            await this.saveValorIDEMessagesAndUpdateHistory();
            await this.postMessageToWebview({ type: "relinquishControl" });
            this.cancelTask(); // the task is already cancelled by the provider beforehand, but we need to re-init to get the updated messages
        }
        else {
            await this.postMessageToWebview({ type: "relinquishControl" });
        }
    }
    async presentMultifileDiff(messageTs, seeNewChangesSinceLastTaskCompletion) {
        const relinquishButton = () => {
            this.postMessageToWebview({ type: "relinquishControl" });
        };
        console.log("presentMultifileDiff", messageTs);
        const messageIndex = this.valorideMessages.findIndex((m) => m.ts === messageTs);
        const message = this.valorideMessages[messageIndex];
        if (!message) {
            console.error("Message not found");
            relinquishButton();
            return;
        }
        const hash = message.lastCheckpointHash;
        if (!hash) {
            console.error("No checkpoint hash found");
            relinquishButton();
            return;
        }
        // TODO: handle if this is called from outside original workspace, in which case we need to show user error message we can't show diff outside of workspace?
        if (!this.checkpointTracker && !this.checkpointTrackerErrorMessage) {
            try {
                this.checkpointTracker = await CheckpointTracker.create(this.taskId, this.context.globalStorageUri.fsPath);
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                console.error("Failed to initialize checkpoint tracker:", errorMessage);
                this.checkpointTrackerErrorMessage = errorMessage;
                await this.postStateToWebview();
                vscode.window.showErrorMessage(errorMessage);
                relinquishButton();
                return;
            }
        }
        let changedFiles;
        try {
            if (seeNewChangesSinceLastTaskCompletion) {
                // Get last task completed
                const lastTaskCompletedMessageCheckpointHash = findLast(this.valorideMessages.slice(0, messageIndex), (m) => m.say === "completion_result")?.lastCheckpointHash; // ask is only used to relinquish control, its the last say we care about
                // if undefined, then we get diff from beginning of git
                // if (!lastTaskCompletedMessage) {
                // 	console.error("No previous task completion message found")
                // 	return
                // }
                // This value *should* always exist
                const firstCheckpointMessageCheckpointHash = this.valorideMessages.find((m) => m.say === "checkpoint_created")?.lastCheckpointHash;
                const previousCheckpointHash = lastTaskCompletedMessageCheckpointHash ||
                    firstCheckpointMessageCheckpointHash; // either use the diff between the first checkpoint and the task completion, or the diff between the latest two task completions
                if (!previousCheckpointHash) {
                    vscode.window.showErrorMessage("Unexpected error: No checkpoint hash found");
                    relinquishButton();
                    return;
                }
                // Get changed files between current state and commit
                changedFiles = await this.checkpointTracker?.getDiffSet(previousCheckpointHash, hash);
                if (!changedFiles?.length) {
                    vscode.window.showInformationMessage("No changes found");
                    relinquishButton();
                    return;
                }
            }
            else {
                // Get changed files between current state and commit
                changedFiles = await this.checkpointTracker?.getDiffSet(hash);
                if (!changedFiles?.length) {
                    vscode.window.showInformationMessage("No changes found");
                    relinquishButton();
                    return;
                }
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            vscode.window.showErrorMessage("Failed to retrieve diff set: " + errorMessage);
            relinquishButton();
            return;
        }
        // Check if multi-diff editor is enabled in VS Code settings
        // const config = vscode.workspace.getConfiguration()
        // const isMultiDiffEnabled = config.get("multiDiffEditor.experimental.enabled")
        // if (!isMultiDiffEnabled) {
        // 	vscode.window.showErrorMessage(
        // 		"Please enable 'multiDiffEditor.experimental.enabled' in your VS Code settings to use this feature.",
        // 	)
        // 	relinquishButton()
        // 	return
        // }
        // Open multi-diff editor
        await vscode.commands.executeCommand("vscode.changes", seeNewChangesSinceLastTaskCompletion
            ? "New changes"
            : "Changes since snapshot", changedFiles.map((file) => [
            vscode.Uri.file(file.absolutePath),
            vscode.Uri.parse(`${DIFF_VIEW_URI_SCHEME}:${file.relativePath}`).with({
                query: Buffer.from(file.before ?? "").toString("base64"),
            }),
            vscode.Uri.parse(`${DIFF_VIEW_URI_SCHEME}:${file.relativePath}`).with({
                query: Buffer.from(file.after ?? "").toString("base64"),
            }),
        ]));
        relinquishButton();
    }
    async presentFileDiff(messageTs, relativePath, seeNewChangesSinceLastTaskCompletion) {
        const relinquishButton = () => {
            this.postMessageToWebview({ type: "relinquishControl" });
        };
        const messageIndex = this.valorideMessages.findIndex((m) => m.ts === messageTs);
        const message = this.valorideMessages[messageIndex];
        if (!message) {
            console.error("Message not found");
            relinquishButton();
            return;
        }
        const hash = message.lastCheckpointHash;
        if (!hash) {
            console.error("No checkpoint hash found");
            relinquishButton();
            return;
        }
        if (!this.checkpointTracker && !this.checkpointTrackerErrorMessage) {
            try {
                this.checkpointTracker = await CheckpointTracker.create(this.taskId, this.context.globalStorageUri.fsPath);
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                console.error("Failed to initialize checkpoint tracker:", errorMessage);
                this.checkpointTrackerErrorMessage = errorMessage;
                await this.postStateToWebview();
                vscode.window.showErrorMessage(errorMessage);
                relinquishButton();
                return;
            }
        }
        if (!this.checkpointTracker) {
            relinquishButton();
            return;
        }
        let changedFiles;
        try {
            if (seeNewChangesSinceLastTaskCompletion) {
                const lastTaskCompletedMessageCheckpointHash = findLast(this.valorideMessages.slice(0, messageIndex), (m) => m.say === "completion_result")?.lastCheckpointHash;
                const firstCheckpointMessageCheckpointHash = this.valorideMessages.find((m) => m.say === "checkpoint_created")?.lastCheckpointHash;
                const previousCheckpointHash = lastTaskCompletedMessageCheckpointHash ||
                    firstCheckpointMessageCheckpointHash;
                if (!previousCheckpointHash) {
                    vscode.window.showErrorMessage("Unexpected error: No checkpoint hash found");
                    relinquishButton();
                    return;
                }
                changedFiles = await this.checkpointTracker.getDiffSet(previousCheckpointHash, hash);
            }
            else {
                changedFiles = await this.checkpointTracker.getDiffSet(hash);
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            vscode.window.showErrorMessage("Failed to retrieve diff set: " + errorMessage);
            relinquishButton();
            return;
        }
        if (!changedFiles?.length) {
            vscode.window.showInformationMessage("No changes found");
            relinquishButton();
            return;
        }
        const normalize = (value) => value.replace(/\\/g, "/");
        const targetFile = changedFiles.find((file) => {
            const target = normalize(relativePath);
            return (normalize(file.relativePath) === target ||
                (file.previousRelativePath &&
                    normalize(file.previousRelativePath) === target));
        });
        if (!targetFile) {
            vscode.window.showInformationMessage(`No diff available for ${relativePath}`);
            relinquishButton();
            return;
        }
        if (targetFile.isBinary) {
            vscode.window.showWarningMessage(`Binary file diffs are not supported for ${targetFile.relativePath}`);
            relinquishButton();
            return;
        }
        const originalUri = vscode.Uri.parse(`${DIFF_VIEW_URI_SCHEME}:${targetFile.relativePath}`).with({
            query: Buffer.from(targetFile.before ?? "").toString("base64"),
        });
        let modifiedUri;
        if (await fileExistsAtPath(targetFile.absolutePath)) {
            modifiedUri = vscode.Uri.file(targetFile.absolutePath);
        }
        else {
            modifiedUri = vscode.Uri.parse(`${DIFF_VIEW_URI_SCHEME}:${targetFile.relativePath}`).with({
                query: Buffer.from(targetFile.after ?? "").toString("base64"),
                fragment: "after",
            });
        }
        await vscode.commands.executeCommand("vscode.diff", originalUri, modifiedUri, `${targetFile.relativePath} (ValorIDE changes)`);
        relinquishButton();
    }
    async getLatestTaskCompletionChangesSummary() {
        const messageIndex = findLastIndex(this.valorideMessages, (m) => m.say === "completion_result");
        const message = this.valorideMessages[messageIndex];
        if (!message) {
            console.error("Completion message not found");
            return undefined;
        }
        const hash = message.lastCheckpointHash;
        if (!hash) {
            console.error("No checkpoint hash found");
            return undefined;
        }
        if (!this.checkpointTracker && !this.checkpointTrackerErrorMessage) {
            try {
                this.checkpointTracker = await CheckpointTracker.create(this.taskId, this.context.globalStorageUri.fsPath);
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                console.error("Failed to initialize checkpoint tracker:", errorMessage);
                return undefined;
            }
        }
        // Get last task completed
        const lastTaskCompletedMessage = findLast(this.valorideMessages.slice(0, messageIndex), (m) => m.say === "completion_result");
        try {
            // Get last task completed
            const lastTaskCompletedMessageCheckpointHash = lastTaskCompletedMessage?.lastCheckpointHash; // ask is only used to relinquish control, its the last say we care about
            // if undefined, then we get diff from beginning of git
            // if (!lastTaskCompletedMessage) {
            // 	console.error("No previous task completion message found")
            // 	return
            // }
            // This value *should* always exist
            const firstCheckpointMessageCheckpointHash = this.valorideMessages.find((m) => m.say === "checkpoint_created")?.lastCheckpointHash;
            const previousCheckpointHash = lastTaskCompletedMessageCheckpointHash ||
                firstCheckpointMessageCheckpointHash; // either use the diff between the first checkpoint and the task completion, or the diff between the latest two task completions
            if (!previousCheckpointHash) {
                return undefined;
            }
            const summary = await this.checkpointTracker?.getDiffSummary(previousCheckpointHash, hash);
            if (summary && summary.totalFiles > 0) {
                return summary;
            }
        }
        catch (error) {
            console.error("Failed to get diff summary:", error);
            return undefined;
        }
        return undefined;
    }
    async doesLatestTaskCompletionHaveNewChanges() {
        const summary = await this.getLatestTaskCompletionChangesSummary();
        return !!summary && summary.totalFiles > 0;
    }
    // Communicate with webview
    // partial has three valid states true (partial message), false (completion of partial message), undefined (individual complete message)
    async ask(type, text, partial, options) {
        // If this ValorIDE instance was aborted by the provider, then the only thing keeping us alive is a promise still running in the background, in which case we don't want to send its result to the webview as it is attached to a new instance of ValorIDE now. So we can safely ignore the result of any active promises, and this class will be deallocated. (Although we set ValorIDE = undefined in provider, that simply removes the reference to this instance, but the instance is still alive until this promise resolves or rejects.)
        if (this.abort) {
            throw new Error("ValorIDE instance aborted");
        }
        const changesSummary = options?.changesSummary;
        const shouldUpdateChangesSummary = options
            ? Object.prototype.hasOwnProperty.call(options, "changesSummary")
            : false;
        let askTs;
        if (partial !== undefined) {
            const lastMessage = this.valorideMessages.at(-1);
            const isUpdatingPreviousPartial = lastMessage &&
                lastMessage.partial &&
                lastMessage.type === "ask" &&
                lastMessage.ask === type;
            if (partial) {
                if (isUpdatingPreviousPartial) {
                    // existing partial message, so update it
                    lastMessage.text = text;
                    lastMessage.partial = partial;
                    if (shouldUpdateChangesSummary) {
                        lastMessage.changesSummary = changesSummary;
                    }
                    // todo be more efficient about saving and posting only new data or one whole message at a time so ignore partial for saves, and only post parts of partial message instead of whole array in new listener
                    // await this.saveValorIDEMessagesAndUpdateHistory()
                    // await this.postStateToWebview()
                    await this.postMessageToWebview({
                        type: "partialMessage",
                        partialMessage: lastMessage,
                    });
                    throw new Error("Current ask promise was ignored 1");
                }
                else {
                    // this is a new partial message, so add it with partial state
                    // this.askResponse = undefined
                    // this.askResponseText = undefined
                    // this.askResponseImages = undefined
                    askTs = Date.now();
                    this.lastMessageTs = askTs;
                    const messageToAdd = {
                        ts: askTs,
                        type: "ask",
                        ask: type,
                        text,
                        partial,
                    };
                    if (shouldUpdateChangesSummary) {
                        messageToAdd.changesSummary = changesSummary;
                    }
                    await this.addToValorIDEMessages(messageToAdd);
                    await this.postStateToWebview();
                    throw new Error("Current ask promise was ignored 2");
                }
            }
            else {
                // partial=false means its a complete version of a previously partial message
                if (isUpdatingPreviousPartial) {
                    // this is the complete version of a previously partial message, so replace the partial with the complete version
                    this.askResponse = undefined;
                    this.askResponseText = undefined;
                    this.askResponseImages = undefined;
                    /*
                    Bug for the history books:
                    In the webview we use the ts as the chatrow key for the virtuoso list. Since we would update this ts right at the end of streaming, it would cause the view to flicker. The key prop has to be stable otherwise react has trouble reconciling items between renders, causing unmounting and remounting of components (flickering).
                    The lesson here is if you see flickering when rendering lists, it's likely because the key prop is not stable.
                    So in this case we must make sure that the message ts is never altered after first setting it.
                    */
                    askTs = lastMessage.ts;
                    this.lastMessageTs = askTs;
                    // lastMessage.ts = askTs
                    lastMessage.text = text;
                    lastMessage.partial = false;
                    if (shouldUpdateChangesSummary) {
                        lastMessage.changesSummary = changesSummary;
                    }
                    await this.saveValorIDEMessagesAndUpdateHistory();
                    // await this.postStateToWebview()
                    await this.postMessageToWebview({
                        type: "partialMessage",
                        partialMessage: lastMessage,
                    });
                }
                else {
                    // this is a new partial=false message, so add it like normal
                    this.askResponse = undefined;
                    this.askResponseText = undefined;
                    this.askResponseImages = undefined;
                    askTs = Date.now();
                    this.lastMessageTs = askTs;
                    const messageToAdd = {
                        ts: askTs,
                        type: "ask",
                        ask: type,
                        text,
                    };
                    if (shouldUpdateChangesSummary) {
                        messageToAdd.changesSummary = changesSummary;
                    }
                    await this.addToValorIDEMessages(messageToAdd);
                    await this.postStateToWebview();
                }
            }
        }
        else {
            // this is a new non-partial message, so add it like normal
            // const lastMessage = this.valorideMessages.at(-1)
            this.askResponse = undefined;
            this.askResponseText = undefined;
            this.askResponseImages = undefined;
            askTs = Date.now();
            this.lastMessageTs = askTs;
            const messageToAdd = {
                ts: askTs,
                type: "ask",
                ask: type,
                text,
            };
            if (shouldUpdateChangesSummary) {
                messageToAdd.changesSummary = changesSummary;
            }
            await this.addToValorIDEMessages(messageToAdd);
            await this.postStateToWebview();
        }
        await pWaitFor(() => this.askResponse !== undefined || this.lastMessageTs !== askTs, { interval: 100 });
        if (this.lastMessageTs !== askTs) {
            throw new Error("Current ask promise was ignored"); // could happen if we send multiple asks in a row i.e. with command_output. It's important that when we know an ask could fail, it is handled gracefully
        }
        const result = {
            response: this.askResponse,
            text: this.askResponseText,
            images: this.askResponseImages,
        };
        this.askResponse = undefined;
        this.askResponseText = undefined;
        this.askResponseImages = undefined;
        return result;
    }
    async handleWebviewAskResponse(askResponse, text, images) {
        this.askResponse = askResponse;
        this.askResponseText = text;
        this.askResponseImages = images;
    }
    async say(type, text, images, partial) {
        if (this.abort) {
            throw new Error("ValorIDE instance aborted");
        }
        if (partial !== undefined) {
            const lastMessage = this.valorideMessages.at(-1);
            const isUpdatingPreviousPartial = lastMessage &&
                lastMessage.partial &&
                lastMessage.type === "say" &&
                lastMessage.say === type;
            if (partial) {
                if (isUpdatingPreviousPartial) {
                    // existing partial message, so update it
                    lastMessage.text = text;
                    lastMessage.images = images;
                    lastMessage.partial = partial;
                    await this.postMessageToWebview({
                        type: "partialMessage",
                        partialMessage: lastMessage,
                    });
                }
                else {
                    // this is a new partial message, so add it with partial state
                    const sayTs = Date.now();
                    this.lastMessageTs = sayTs;
                    await this.addToValorIDEMessages({
                        ts: sayTs,
                        type: "say",
                        say: type,
                        text,
                        images,
                        partial,
                    });
                    await this.postStateToWebview();
                }
            }
            else {
                // partial=false means its a complete version of a previously partial message
                if (isUpdatingPreviousPartial) {
                    // this is the complete version of a previously partial message, so replace the partial with the complete version
                    this.lastMessageTs = lastMessage.ts;
                    // lastMessage.ts = sayTs
                    lastMessage.text = text;
                    lastMessage.images = images;
                    lastMessage.partial = false;
                    // instead of streaming partialMessage events, we do a save and post like normal to persist to disk
                    await this.saveValorIDEMessagesAndUpdateHistory();
                    // await this.postStateToWebview()
                    await this.postMessageToWebview({
                        type: "partialMessage",
                        partialMessage: lastMessage,
                    }); // more performant than an entire postStateToWebview
                }
                else {
                    // this is a new partial=false message, so add it like normal
                    const sayTs = Date.now();
                    this.lastMessageTs = sayTs;
                    await this.addToValorIDEMessages({
                        ts: sayTs,
                        type: "say",
                        say: type,
                        text,
                        images,
                    });
                    await this.postStateToWebview();
                }
            }
        }
        else {
            // this is a new non-partial message, so add it like normal
            const sayTs = Date.now();
            this.lastMessageTs = sayTs;
            await this.addToValorIDEMessages({
                ts: sayTs,
                type: "say",
                say: type,
                text,
                images,
            });
            await this.postStateToWebview();
        }
    }
    async sayAndCreateMissingParamError(toolName, paramName, relPath) {
        await this.say("error", `ValorIDE tried to use ${toolName}${relPath ? ` for '${relPath.toPosix()}'` : ""} without value for required parameter '${paramName}'. Retrying...`);
        return formatResponse.toolError(formatResponse.missingToolParameterError(paramName));
    }
    async removeLastPartialMessageIfExistsWithType(type, askOrSay) {
        const lastMessage = this.valorideMessages.at(-1);
        if (lastMessage?.partial &&
            lastMessage.type === type &&
            (lastMessage.ask === askOrSay || lastMessage.say === askOrSay)) {
            this.valorideMessages.pop();
            await this.saveValorIDEMessagesAndUpdateHistory();
            await this.postStateToWebview();
        }
    }
    // Task lifecycle
    async startTask(task, images) {
        // conversationHistory (for API) and valorideMessages (for webview) need to be in sync
        // if the extension process were killed, then on restart the valorideMessages might not be empty, so we need to set it to [] when we create a new ValorIDE client (otherwise webview would show stale messages from previous session)
        this.valorideMessages = [];
        this.apiConversationHistory = [];
        await this.postStateToWebview();
        await this.say("text", task, images);
        this.isInitialized = true;
        let imageBlocks = formatResponse.imageBlocks(images);
        await this.initiateTaskLoop([
            {
                type: "text",
                text: `<task>\n${task}\n</task>`,
            },
            ...imageBlocks,
        ]);
    }
    async resumeTaskFromHistory() {
        // UPDATE: we don't need this anymore since most tasks are now created with checkpoints enabled
        // right now we let users init checkpoints for old tasks, assuming they're continuing them from the same workspace (which we never tied to tasks, so no way for us to know if it's opened in the right workspace)
        // const doesShadowGitExist = await CheckpointTracker.doesShadowGitExist(this.taskId, this.controllerRef.deref())
        // if (!doesShadowGitExist) {
        // 	this.checkpointTrackerErrorMessage = "Checkpoints are only available for new tasks"
        // }
        const modifiedValorIDEMessages = await getSavedValorIDEMessages(this.getContext(), this.taskId);
        // Remove any resume messages that may have been added before
        const lastRelevantMessageIndex = findLastIndex(modifiedValorIDEMessages, (m) => !(m.ask === "resume_task" || m.ask === "resume_completed_task"));
        if (lastRelevantMessageIndex !== -1) {
            modifiedValorIDEMessages.splice(lastRelevantMessageIndex + 1);
        }
        // since we don't use api_req_finished anymore, we need to check if the last api_req_started has a cost value, if it doesn't and no cancellation reason to present, then we remove it since it indicates an api request without any partial content streamed
        const lastApiReqStartedIndex = findLastIndex(modifiedValorIDEMessages, (m) => m.type === "say" && m.say === "api_req_started");
        if (lastApiReqStartedIndex !== -1) {
            const lastApiReqStarted = modifiedValorIDEMessages[lastApiReqStartedIndex];
            const { cost, cancelReason } = JSON.parse(lastApiReqStarted.text || "{}");
            if (cost === undefined && cancelReason === undefined) {
                modifiedValorIDEMessages.splice(lastApiReqStartedIndex, 1);
            }
        }
        await this.overwriteValorIDEMessages(modifiedValorIDEMessages);
        this.valorideMessages = await getSavedValorIDEMessages(this.getContext(), this.taskId);
        // Now present the valoride messages to the user and ask if they want to resume (NOTE: we ran into a bug before where the apiconversationhistory wouldn't be initialized when opening a old task, and it was because we were waiting for resume)
        // This is important in case the user deletes messages without resuming the task first
        this.apiConversationHistory = await getSavedApiConversationHistory(this.getContext(), this.taskId);
        // load the context history state
        await this.contextManager.initializeContextHistory(await ensureTaskDirectoryExists(this.getContext(), this.taskId));
        const lastValorIDEMessage = this.valorideMessages
            .slice()
            .reverse()
            .find((m) => !(m.ask === "resume_task" || m.ask === "resume_completed_task")); // could be multiple resume tasks
        let askType;
        if (lastValorIDEMessage?.ask === "completion_result") {
            askType = "resume_completed_task";
        }
        else {
            askType = "resume_task";
        }
        this.isInitialized = true;
        const { response, text, images } = await this.ask(askType); // calls poststatetowebview
        let responseText;
        let responseImages;
        if (response === "messageResponse") {
            await this.say("user_feedback", text, images);
            responseText = text;
            responseImages = images;
        }
        // need to make sure that the api conversation history can be resumed by the api, even if it goes out of sync with valoride messages
        const existingApiConversationHistory = await getSavedApiConversationHistory(this.getContext(), this.taskId);
        // Remove the last user message so we can update it with the resume message
        let modifiedOldUserContent; // either the last message if its user message, or the user message before the last (assistant) message
        let modifiedApiConversationHistory; // need to remove the last user message to replace with new modified user message
        if (existingApiConversationHistory.length > 0) {
            const lastMessage = existingApiConversationHistory[existingApiConversationHistory.length - 1];
            if (lastMessage.role === "assistant") {
                modifiedApiConversationHistory = [...existingApiConversationHistory];
                modifiedOldUserContent = [];
            }
            else if (lastMessage.role === "user") {
                const existingUserContent = Array.isArray(lastMessage.content)
                    ? lastMessage.content
                    : [{ type: "text", text: lastMessage.content }];
                modifiedApiConversationHistory = existingApiConversationHistory.slice(0, -1);
                modifiedOldUserContent = [...existingUserContent];
            }
            else {
                throw new Error("Unexpected: Last message is not a user or assistant message");
            }
        }
        else {
            throw new Error("Unexpected: No existing API conversation history");
        }
        let newUserContent = [...modifiedOldUserContent];
        const agoText = (() => {
            const timestamp = lastValorIDEMessage?.ts ?? Date.now();
            const now = Date.now();
            const diff = now - timestamp;
            const minutes = Math.floor(diff / 60000);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);
            if (days > 0) {
                return `${days} day${days > 1 ? "s" : ""} ago`;
            }
            if (hours > 0) {
                return `${hours} hour${hours > 1 ? "s" : ""} ago`;
            }
            if (minutes > 0) {
                return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
            }
            return "just now";
        })();
        const wasRecent = lastValorIDEMessage?.ts && Date.now() - lastValorIDEMessage.ts < 30_000;
        const [taskResumptionMessage, userResponseMessage] = formatResponse.taskResumption(this.chatSettings?.mode === "plan" ? "plan" : "act", agoText, cwd, wasRecent, responseText);
        if (taskResumptionMessage !== "") {
            newUserContent.push({
                type: "text",
                text: taskResumptionMessage,
            });
        }
        if (userResponseMessage !== "") {
            newUserContent.push({
                type: "text",
                text: userResponseMessage,
            });
        }
        if (responseImages && responseImages.length > 0) {
            newUserContent.push(...formatResponse.imageBlocks(responseImages));
        }
        await this.overwriteApiConversationHistory(modifiedApiConversationHistory);
        await this.initiateTaskLoop(newUserContent);
    }
    async initiateTaskLoop(userContent) {
        let nextUserContent = userContent;
        let includeFileDetails = true;
        while (!this.abort) {
            const didEndLoop = await this.recursivelyMakeValorIDERequests(nextUserContent, includeFileDetails);
            includeFileDetails = false; // we only need file details the first time
            //  The way this agentic loop works is that valoride will be given a task that he then calls tools to complete. unless there's an attempt_completion call, we keep responding back to him with his tool's responses until he either attempt_completion or does not use anymore tools. If he does not use anymore tools, we ask him to consider if he's completed the task and then call attempt_completion, otherwise proceed with completing the task.
            // There is a MAX_REQUESTS_PER_TASK limit to prevent infinite requests, but ValorIDE is prompted to finish the task as efficiently as he can.
            //const totalCost = this.calculateApiCost(totalInputTokens, totalOutputTokens)
            if (didEndLoop) {
                // For now a task never 'completes'. This will only happen if the user hits max requests and denies resetting the count.
                //this.say("task_completed", `Task completed. Total API usage cost: ${totalCost}`)
                break;
            }
            else {
                // this.say(
                // 	"tool",
                // 	"ValorIDE responded with only text blocks but has not called attempt_completion yet. Forcing him to continue with task..."
                // )
                nextUserContent = [
                    {
                        type: "text",
                        text: formatResponse.noToolsUsed(),
                    },
                ];
                this.consecutiveMistakeCount++;
            }
        }
    }
    async abortTask() {
        this.abort = true; // will stop any autonomously running promises
        this.terminalManager.disposeAll();
        this.urlContentFetcher.closeBrowser();
        await this.browserSession.dispose();
        this.valorideIgnoreController.dispose();
        this.fileContextTracker.dispose();
        await this.diffViewProvider.revertChanges(); // need to await for when we want to make sure directories/files are reverted before re-starting the task from a checkpoint
    }
    // Checkpoints
    async saveCheckpoint(isAttemptCompletionMessage = false) {
        // Set isCheckpointCheckedOut to false for all checkpoint_created messages
        this.valorideMessages.forEach((message) => {
            if (message.say === "checkpoint_created") {
                message.isCheckpointCheckedOut = false;
            }
        });
        if (!isAttemptCompletionMessage) {
            // ensure we aren't creating a duplicate checkpoint
            const lastMessage = this.valorideMessages.at(-1);
            if (lastMessage?.say === "checkpoint_created") {
                return;
            }
            // For non-attempt completion we just say checkpoints
            await this.say("checkpoint_created");
            this.checkpointTracker?.commit().then(async (commitHash) => {
                const lastCheckpointMessage = findLast(this.valorideMessages, (m) => m.say === "checkpoint_created");
                if (lastCheckpointMessage) {
                    lastCheckpointMessage.lastCheckpointHash = commitHash;
                    await this.saveValorIDEMessagesAndUpdateHistory();
                }
            }); // silently fails for now
            //
        }
        else {
            // attempt completion requires checkpoint to be sync so that we can present button after attempt_completion
            const commitHash = await this.checkpointTracker?.commit();
            // For attempt_completion, find the last completion_result message and set its checkpoint hash. This will be used to present the 'see new changes' button
            const lastCompletionResultMessage = findLast(this.valorideMessages, (m) => m.say === "completion_result" || m.ask === "completion_result");
            if (lastCompletionResultMessage) {
                lastCompletionResultMessage.lastCheckpointHash = commitHash;
                await this.saveValorIDEMessagesAndUpdateHistory();
            }
        }
        // if (commitHash) {
        // Previously we checkpointed every message, but this is excessive and unnecessary.
        // // Start from the end and work backwards until we find a tool use or another message with a hash
        // for (let i = this.valorideMessages.length - 1; i >= 0; i--) {
        // 	const message = this.valorideMessages[i]
        // 	if (message.lastCheckpointHash) {
        // 		// Found a message with a hash, so we can stop
        // 		break
        // 	}
        // 	// Update this message with a hash
        // 	message.lastCheckpointHash = commitHash
        // 	// We only care about adding the hash to the last tool use (we don't want to add this hash to every prior message ie for tasks pre-checkpoint)
        // 	const isToolUse =
        // 		message.say === "tool" ||
        // 		message.ask === "tool" ||
        // 		message.say === "command" ||
        // 		message.ask === "command" ||
        // 		message.say === "completion_result" ||
        // 		message.ask === "completion_result" ||
        // 		message.ask === "followup" ||
        // 		message.say === "use_mcp_server" ||
        // 		message.ask === "use_mcp_server" ||
        // 		message.say === "browser_action" ||
        // 		message.say === "browser_action_launch" ||
        // 		message.ask === "browser_action_launch"
        // 	if (isToolUse) {
        // 		break
        // 	}
        // }
        // // Save the updated messages
        // await this.saveValorIDEMessagesAndUpdateHistory()
        // }
    }
    // Tools
    /**
     * Executes a command directly in Node.js using execa
     * This is used in test mode to capture the full output without using the VS Code terminal
     * Commands are automatically terminated after 30 seconds using Promise.race
     */
    async executeCommandInNode(command) {
        try {
            // Create a child process
            const childProcess = execa(command, {
                shell: true,
                cwd,
                reject: false,
                all: true, // Merge stdout and stderr
            });
            // Set up variables to collect output
            let output = "";
            // Collect output in real-time
            if (childProcess.all) {
                childProcess.all.on("data", (data) => {
                    output += data.toString();
                });
            }
            // Create a timeout promise that rejects after 30 seconds
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => {
                    if (childProcess.pid) {
                        childProcess.kill("SIGKILL"); // Use SIGKILL for more forceful termination
                    }
                    reject(new Error("Command timeout after 30s"));
                }, 60000);
            });
            // Race between command completion and timeout
            const result = await Promise.race([childProcess, timeoutPromise]).catch((error) => {
                // If we get here due to timeout, return a partial result with timeout flag
                Logger.info(`Command timed out after 30s: ${command}`);
                return {
                    stdout: "",
                    stderr: "",
                    exitCode: 124, // Standard timeout exit code
                    timedOut: true,
                };
            });
            // Check if timeout occurred
            const wasTerminated = result.timedOut === true;
            // Use collected output or result output
            if (!output) {
                output = result.stdout || result.stderr || "";
            }
            // Add termination message if the command was terminated
            if (wasTerminated) {
                output +=
                    "\nCommand was taking a while to run so it was auto terminated after 30s";
            }
            // Filter the output to reduce verbosity
            const filteredOutput = OutputFilterService.filterCommandOutput(output, command);
            Logger.info(`Command executed in Node: ${command}\nOutput:\n${filteredOutput}`);
            // Format the result similar to terminal output
            return [
                false,
                `Command executed${wasTerminated ? " (terminated after 30s)" : ""} with exit code ${result.exitCode}.${filteredOutput.length > 0 ? `\nOutput:\n${filteredOutput}` : ""}`,
            ];
        }
        catch (error) {
            // Handle any errors that might occur
            const errorMessage = error instanceof Error ? error.message : String(error);
            return [false, `Error executing command: ${errorMessage}`];
        }
    }
    async executeCommandTool(command) {
        Logger.info("IS_TEST: " + isInTestMode());
        const trimmedCommand = command.trim();
        if (!trimmedCommand) {
            return [
                false,
                formatResponse.toolError("Command was empty. Provide a command to run."),
            ];
        }
        if (isInTestMode()) {
            Logger.info("Executing command in Node: " + command);
            return this.executeCommandInNode(command);
        }
        Logger.info("Executing command in VS code terminal: " + command);
        const terminalInfo = await this.terminalManager.getOrCreateTerminal(cwd);
        terminalInfo.terminal.show();
        const process = this.terminalManager.runCommand(terminalInfo, command);
        process.startedAt = Date.now();
        let userFeedback;
        let didContinue = false;
        let completed = false;
        let processError;
        const CHUNK_LINE_LIMIT = 20;
        const CHUNK_BYTE_LIMIT = 2048;
        const CHUNK_DEBOUNCE_MS = 100;
        let bufferedLines = [];
        let bufferedBytes = 0;
        let chunkTimer;
        let pendingFlush = null;
        const cancelFlushTimer = () => {
            if (chunkTimer) {
                clearTimeout(chunkTimer);
                chunkTimer = undefined;
            }
        };
        const streamLine = (line) => {
            this.say("command_output", line)
                .catch((error) => {
                Logger.warn(`Failed to stream command output line: ${error instanceof Error ? error.message : String(error)}`);
            });
        };
        const flushBufferedOutput = async (force = false) => {
            if (pendingFlush) {
                if (!force) {
                    return;
                }
                await pendingFlush;
            }
            if (bufferedLines.length === 0) {
                return;
            }
            const chunk = bufferedLines.join("\n");
            bufferedLines = [];
            bufferedBytes = 0;
            pendingFlush = (async () => {
                cancelFlushTimer();
                try {
                    // Use a timeout to prevent indefinite blocking on long-running commands
                    const askPromise = this.ask("command_output", chunk);
                    const timeoutPromise = new Promise((resolve) => {
                        setTimeout(() => {
                            // Auto-approve if user doesn't respond within 2s
                            resolve({ response: "yesButtonClicked", text: "", images: [] });
                        }, 2000);
                    });
                    const { response, text, images } = await Promise.race([askPromise, timeoutPromise]);
                    if (response !== "yesButtonClicked") {
                        userFeedback = { text, images };
                    }
                    if (!didContinue) {
                        didContinue = true;
                        process.continue();
                        if (bufferedLines.length > 0) {
                            const backlog = bufferedLines.splice(0);
                            bufferedBytes = 0;
                            for (const pendingLine of backlog) {
                                streamLine(pendingLine);
                            }
                        }
                    }
                }
                catch (error) {
                    Logger.warn(`Failed to deliver command output chunk: ${error instanceof Error ? error.message : String(error)}`);
                }
                finally {
                    pendingFlush = null;
                }
            })();
            await pendingFlush;
        };
        const safeFlush = (force = false) => void flushBufferedOutput(force).catch((error) => {
            Logger.warn(`Command output flush failed: ${error instanceof Error ? error.message : String(error)}`);
        });
        const scheduleFlush = () => {
            cancelFlushTimer();
            chunkTimer = setTimeout(() => safeFlush(), CHUNK_DEBOUNCE_MS);
        };
        let fullOutput = "";
        let lastProgressReport = Date.now();
        const PROGRESS_REPORT_INTERVAL = 5000;
        process.on("line", (line) => {
            const safeLine = line ?? "";
            fullOutput += safeLine + "\n";
            if (!didContinue) {
                bufferedLines.push(safeLine);
                bufferedBytes += Buffer.byteLength(safeLine, "utf8");
                if (bufferedLines.length >= CHUNK_LINE_LIMIT ||
                    bufferedBytes >= CHUNK_BYTE_LIMIT) {
                    safeFlush();
                }
                else {
                    scheduleFlush();
                }
            }
            else {
                streamLine(safeLine);
            }
            const now = Date.now();
            if (now - lastProgressReport > PROGRESS_REPORT_INTERVAL) {
                lastProgressReport = now;
                const elapsed = Math.round((now - process.startedAt) / 1000);
                void this.say("command_output", `[Still running for ${elapsed}s...]`)
                    .catch(() => { });
            }
        });
        process.once("completed", () => {
            completed = true;
            cancelFlushTimer();
            if (!didContinue) {
                safeFlush(true);
            }
        });
        process.once("no_shell_integration", async () => {
            await this.say("shell_integration_warning");
        });
        process.once("error", (error) => {
            processError = error instanceof Error ? error : new Error(String(error));
        });
        try {
            await process;
        }
        catch (error) {
            processError =
                processError ?? (error instanceof Error ? error : new Error(String(error)));
        }
        await flushBufferedOutput(true);
        cancelFlushTimer();
        await setTimeoutPromise(50);
        const filteredOutput = OutputFilterService.filterCommandOutput(fullOutput, command);
        if (processError) {
            return [
                false,
                formatResponse.toolError(`Command failed to execute.\nError: ${processError.message}${filteredOutput.length > 0
                    ? `\n\nPartial output:\n${filteredOutput}`
                    : ""}`),
            ];
        }
        if (userFeedback) {
            await this.say("user_feedback", userFeedback.text, userFeedback.images);
            return [
                true,
                formatResponse.toolResult(`Command is still running in the user's terminal.${filteredOutput.length > 0
                    ? `\nHere's the output so far:\n${filteredOutput}`
                    : ""}\n\nThe user provided the following feedback:\n<feedback>\n${userFeedback.text ?? ""}\n</feedback>`, userFeedback.images),
            ];
        }
        if (completed) {
            return [
                false,
                `Command executed.${filteredOutput.length > 0 ? `\nOutput:\n${filteredOutput}` : ""}`,
            ];
        }
        return [
            false,
            `Command is still running in the user's terminal.${filteredOutput.length > 0
                ? `\nHere's the output so far:\n${filteredOutput}`
                : ""}\n\nYou will be updated on the terminal status and new output in the future.`,
        ];
    }
    // Check if the tool should be auto-approved based on the settings
    // Returns bool for most tools, and tuple for tools with nested settings
    shouldAutoApproveTool(toolName) {
        if (this.autoApprovalSettings.enabled) {
            switch (toolName) {
                case "read_file":
                case "list_files":
                case "list_code_definition_names":
                case "search_files":
                    return [
                        this.autoApprovalSettings.actions.readFiles,
                        this.autoApprovalSettings.actions.readFilesExternally ?? false,
                    ];
                case "write_to_file":
                case "replace_in_file":
                    return [
                        this.autoApprovalSettings.actions.editFiles,
                        this.autoApprovalSettings.actions.editFilesExternally ?? false,
                    ];
                case "execute_command":
                    return [
                        this.autoApprovalSettings.actions.executeSafeCommands ?? false,
                        this.autoApprovalSettings.actions.executeAllCommands ?? false,
                    ];
                case "browser_action":
                    return this.autoApprovalSettings.actions.useBrowser;
                case "access_mcp_resource":
                case "use_mcp_tool":
                    return this.autoApprovalSettings.actions.useMcp;
            }
        }
        return false;
    }
    // Check if the tool should be auto-approved based on the settings
    // and the path of the action. Returns true if the tool should be auto-approved
    // based on the user's settings and the path of the action.
    shouldAutoApproveToolWithPath(blockname, autoApproveActionpath) {
        let isLocalRead = false;
        if (autoApproveActionpath) {
            const absolutePath = path.resolve(cwd, autoApproveActionpath);
            isLocalRead = absolutePath.startsWith(cwd);
        }
        else {
            // If we do not get a path for some reason, default to a (safer) false return
            isLocalRead = false;
        }
        // Get auto-approve settings for local and external edits
        const autoApproveResult = this.shouldAutoApproveTool(blockname);
        const [autoApproveLocal, autoApproveExternal] = Array.isArray(autoApproveResult)
            ? autoApproveResult
            : [autoApproveResult, false];
        if ((isLocalRead && autoApproveLocal) ||
            (!isLocalRead && autoApproveLocal && autoApproveExternal)) {
            return true;
        }
        else {
            return false;
        }
    }
    formatErrorWithStatusCode(error) {
        return ErrorHandlingUtils.formatErrorWithStatusCode(error);
    }
    async resetStreamingState() {
        this.currentStreamingContentIndex = 0;
        this.assistantMessageContent = [];
        this.didCompleteReadingStream = false;
        this.userMessageContent = [];
        this.userMessageContentReady = false;
        this.didRejectTool = false;
        this.didAlreadyUseTool = false;
        this.didAutomaticallyRetryFailedApiRequest = false;
        await this.diffViewProvider.reset();
    }
    async *attemptApiRequest(previousApiReqIndex) {
        const waitForMcpConnection = async () => {
            await pWaitFor(() => this.mcpHub.isConnecting !== true, {
                timeout: 10_000,
            }).catch(() => {
                console.error("MCP servers failed to connect in time");
            });
        };
        while (true) {
            await waitForMcpConnection();
            const disableBrowserTool = vscode.workspace
                .getConfiguration("valoride")
                .get("disableBrowserTool") ?? false;
            const modelSupportsBrowserUse = this.api.getModel().info.supportsImages ?? false;
            const supportsBrowserUse = modelSupportsBrowserUse && !disableBrowserTool;
            let systemPrompt = await SYSTEM_PROMPT(cwd, supportsBrowserUse, this.mcpHub, this.thorapi_project, this.browserSettings);
            const settingsCustomInstructions = this.customInstructions?.trim();
            const preferredLanguage = getLanguageKey(vscode.workspace
                .getConfiguration("valoride")
                .get("preferredLanguage"));
            const preferredLanguageInstructions = preferredLanguage && preferredLanguage !== DEFAULT_LANGUAGE_SETTINGS
                ? `# Preferred Language\n\nSpeak in ${preferredLanguage}.`
                : "";
            const { globalToggles, localToggles } = await refreshValorIDERulesToggles(this.getContext(), cwd);
            const globalValorIDERulesFilePath = await ensureRulesDirectoryExists();
            const globalValorIDERulesFileInstructions = await getGlobalValorIDERules(globalValorIDERulesFilePath, globalToggles);
            const localValorIDERulesFileInstructions = await getLocalValorIDERules(cwd, localToggles);
            const valorideIgnoreContent = this.valorideIgnoreController.valorideIgnoreContent;
            let valorideIgnoreInstructions;
            if (valorideIgnoreContent) {
                valorideIgnoreInstructions =
                    formatResponse.valorideIgnoreInstructions(valorideIgnoreContent);
            }
            if (settingsCustomInstructions ||
                globalValorIDERulesFileInstructions ||
                localValorIDERulesFileInstructions ||
                valorideIgnoreInstructions ||
                preferredLanguageInstructions) {
                systemPrompt += addUserInstructions(settingsCustomInstructions, globalValorIDERulesFileInstructions, localValorIDERulesFileInstructions, valorideIgnoreInstructions, preferredLanguageInstructions);
            }
            const contextManagementMetadata = await this.contextManager.getNewContextMessagesAndMetadata(this.apiConversationHistory, this.valorideMessages, this.api, this.conversationHistoryDeletedRange, previousApiReqIndex, await ensureTaskDirectoryExists(this.getContext(), this.taskId));
            if (contextManagementMetadata.updatedConversationHistoryDeletedRange) {
                this.conversationHistoryDeletedRange =
                    contextManagementMetadata.conversationHistoryDeletedRange;
                await this.saveValorIDEMessagesAndUpdateHistory();
            }
            const stream = this.api.createMessage(systemPrompt, contextManagementMetadata.truncatedConversationHistory);
            const iterator = stream[Symbol.asyncIterator]();
            const defaultFirstChunkTimeout = DEFAULT_CHAT_SETTINGS.apiFirstChunkTimeoutMs ?? 45_000;
            const configuredFirstChunkTimeout = typeof this.chatSettings?.apiFirstChunkTimeoutMs === "number" &&
                this.chatSettings.apiFirstChunkTimeoutMs > 0
                ? this.chatSettings.apiFirstChunkTimeoutMs
                : undefined;
            const firstChunkTimeoutMs = configuredFirstChunkTimeout ?? defaultFirstChunkTimeout;
            const handleFirstChunkFailure = async (error) => {
                const isOpenRouter = this.api instanceof OpenRouterHandler ||
                    this.api instanceof ValorIDEHandler;
                const isAnthropic = this.api instanceof AnthropicHandler;
                const isOpenRouterContextWindowError = checkIsOpenRouterContextWindowError(error) && isOpenRouter;
                const isAnthropicContextWindowError = checkIsAnthropicContextWindowError(error) && isAnthropic;
                if (isAnthropic &&
                    isAnthropicContextWindowError &&
                    !this.didAutomaticallyRetryFailedApiRequest) {
                    this.conversationHistoryDeletedRange =
                        this.contextManager.getNextTruncationRange(this.apiConversationHistory, this.conversationHistoryDeletedRange, "quarter");
                    await this.saveValorIDEMessagesAndUpdateHistory();
                    this.didAutomaticallyRetryFailedApiRequest = true;
                    return true;
                }
                if (isOpenRouter && !this.didAutomaticallyRetryFailedApiRequest) {
                    if (isOpenRouterContextWindowError) {
                        this.conversationHistoryDeletedRange =
                            this.contextManager.getNextTruncationRange(this.apiConversationHistory, this.conversationHistoryDeletedRange, "quarter");
                        await this.saveValorIDEMessagesAndUpdateHistory();
                    }
                    console.log("first chunk failed, waiting 1 second before retrying");
                    await setTimeoutPromise(1000);
                    this.didAutomaticallyRetryFailedApiRequest = true;
                    return true;
                }
                if (isOpenRouterContextWindowError || isAnthropicContextWindowError) {
                    let normalizedError = error;
                    const truncatedConversationHistory = this.contextManager.getTruncatedMessages(this.apiConversationHistory, this.conversationHistoryDeletedRange);
                    if (truncatedConversationHistory.length > 3) {
                        normalizedError = new Error("Context window exceeded. Click retry to truncate the conversation and try again.");
                        this.didAutomaticallyRetryFailedApiRequest = false;
                    }
                    const errorMessage = this.formatErrorWithStatusCode(normalizedError);
                    const { response } = await this.ask("api_req_failed", errorMessage);
                    if (response !== "yesButtonClicked") {
                        return false;
                    }
                    await this.say("api_req_retried");
                    return true;
                }
                const errorMessage = this.formatErrorWithStatusCode(error);
                const { response } = await this.ask("api_req_failed", errorMessage);
                if (response !== "yesButtonClicked") {
                    return false;
                }
                await this.say("api_req_retried");
                return true;
            };
            this.isWaitingForFirstChunk = true;
            let firstChunkResult;
            try {
                firstChunkResult = await pTimeout(iterator.next(), {
                    milliseconds: firstChunkTimeoutMs,
                    message: "API request timed out before the model started streaming a response.",
                });
            }
            catch (rawError) {
                this.isWaitingForFirstChunk = false;
                const normalizedError = rawError instanceof TimeoutError
                    ? new Error(`Timed out waiting ${Math.round(firstChunkTimeoutMs / 1000)}s for the model to respond.`)
                    : rawError instanceof Error
                        ? rawError
                        : new Error(String(rawError));
                const shouldRetry = await handleFirstChunkFailure(normalizedError);
                if (shouldRetry) {
                    continue;
                }
                throw new Error("API request failed");
            }
            this.isWaitingForFirstChunk = false;
            if (firstChunkResult && !firstChunkResult.done) {
                yield firstChunkResult.value;
            }
            for await (const chunk of iterator) {
                yield chunk;
            }
            return;
        }
    }
    async processAssistantBlocks() {
        if (this.abort) {
            throw new Error("ValorIDE instance aborted");
        }
        if (this.currentStreamingContentIndex >= this.assistantMessageContent.length) {
            // this may happen if the last content block was completed before streaming could finish. if streaming is finished, and we're out of bounds then this means we already presented/executed the last content block and are ready to continue to next request
            if (this.didCompleteReadingStream) {
                this.userMessageContentReady = true;
            }
            // console.log("no more content blocks to stream! this shouldn't happen?")
            return;
            //throw new Error("No more content blocks to stream! This shouldn't happen...") // remove and just return after testing
        }
        const block = cloneDeep(this.assistantMessageContent[this.currentStreamingContentIndex]); // need to create copy bc while stream is updating the array, it could be updating the reference block properties too
        switch (block.type) {
            case "text": {
                if (this.didRejectTool || this.didAlreadyUseTool) {
                    break;
                }
                let content = block.content;
                if (content) {
                    // (have to do this for partial and complete since sending content in thinking tags to markdown renderer will automatically be removed)
                    // Remove end substrings of <thinking or </thinking (below xml parsing is only for opening tags)
                    // (this is done with the xml parsing below now, but keeping here for reference)
                    // content = content.replace(/<\/?t(?:h(?:i(?:n(?:k(?:i(?:n(?:g)?)?)?)?)?)?)?$/, "")
                    // Remove all instances of <thinking> (with optional line break after) and </thinking> (with optional line break before)
                    // - Needs to be separate since we dont want to remove the line break before the first tag
                    // - Needs to happen before the xml parsing below
                    content = content.replace(/<thinking>\s?/g, "");
                    content = content.replace(/\s?<\/thinking>/g, "");
                    // Remove partial XML tag at the very end of the content (for tool use and thinking tags)
                    // (prevents scrollview from jumping when tags are automatically removed)
                    const lastOpenBracketIndex = content.lastIndexOf("<");
                    if (lastOpenBracketIndex !== -1) {
                        const possibleTag = content.slice(lastOpenBracketIndex);
                        // Check if there's a '>' after the last '<' (i.e., if the tag is complete) (complete thinking and tool tags will have been removed by now)
                        const hasCloseBracket = possibleTag.includes(">");
                        if (!hasCloseBracket) {
                            // Extract the potential tag name
                            let tagContent;
                            if (possibleTag.startsWith("</")) {
                                tagContent = possibleTag.slice(2).trim();
                            }
                            else {
                                tagContent = possibleTag.slice(1).trim();
                            }
                            // Check if tagContent is likely an incomplete tag name (letters and underscores only)
                            const isLikelyTagName = /^[a-zA-Z_]+$/.test(tagContent);
                            // Preemptively remove < or </ to keep from these artifacts showing up in chat (also handles closing thinking tags)
                            const isOpeningOrClosing = possibleTag === "<" || possibleTag === "</";
                            // If the tag is incomplete and at the end, remove it from the content
                            if (isOpeningOrClosing || isLikelyTagName) {
                                content = content.slice(0, lastOpenBracketIndex).trim();
                            }
                        }
                    }
                }
                if (!block.partial) {
                    // Some models add code block artifacts (around the tool calls) which show up at the end of text content
                    // matches ``` with at least one char after the last backtick, at the end of the string
                    const match = content?.trimEnd().match(/```[a-zA-Z0-9_-]+$/);
                    if (match) {
                        const matchLength = match[0].length;
                        content = content.trimEnd().slice(0, -matchLength);
                    }
                }
                await this.say("text", content, undefined, block.partial);
                break;
            }
            case "tool_use":
                const toolDescription = () => ToolDescriptionHelper.getToolDescription(block.name, block.params);
                if (this.didRejectTool) {
                    // ignore any tool content after user has rejected tool once
                    if (!block.partial) {
                        this.userMessageContent.push({
                            type: "text",
                            text: `Skipping tool ${toolDescription()} due to user rejecting a previous tool.`,
                        });
                    }
                    else {
                        // partial tool after user rejected a previous tool
                        this.userMessageContent.push({
                            type: "text",
                            text: `Tool ${toolDescription()} was interrupted and not executed due to user rejecting a previous tool.`,
                        });
                    }
                    break;
                }
                if (this.didAlreadyUseTool) {
                    // ignore any content after a tool has already been used
                    this.userMessageContent.push({
                        type: "text",
                        text: formatResponse.toolAlreadyUsed(block.name),
                    });
                    break;
                }
                const pushToolResult = (content) => {
                    this.userMessageContent.push({
                        type: "text",
                        text: `${toolDescription()} Result:`,
                    });
                    if (typeof content === "string") {
                        this.userMessageContent.push({
                            type: "text",
                            text: content || "(tool did not return anything)",
                        });
                    }
                    else {
                        this.userMessageContent.push(...content);
                    }
                    // once a tool result has been collected, ignore all other tool uses since we should only ever present one tool result per message
                    this.didAlreadyUseTool = true;
                };
                // The user can approve, reject, or provide feedback (rejection). However the user may also send a message along with an approval, in which case we add a separate user message with this feedback.
                const pushAdditionalToolFeedback = (feedback, images) => {
                    if (!feedback && !images) {
                        return;
                    }
                    const content = formatResponse.toolResult(`The user provided the following feedback:\n<feedback>\n${feedback}\n</feedback>`, images);
                    if (typeof content === "string") {
                        this.userMessageContent.push({
                            type: "text",
                            text: content,
                        });
                    }
                    else {
                        this.userMessageContent.push(...content);
                    }
                };
                const handleToolFeedback = async (feedback) => {
                    if (!feedback) {
                        return;
                    }
                    const { text, images } = feedback;
                    if (!text && (!images || images.length === 0)) {
                        return;
                    }
                    pushAdditionalToolFeedback(text, images);
                    await this.say("user_feedback", text, images);
                };
                const askApproval = async (type, partialMessage) => {
                    const { response, text, images } = await this.ask(type, partialMessage, false);
                    if (response !== "yesButtonClicked") {
                        // User pressed reject button or responded with a message, which we treat as a rejection
                        pushToolResult(formatResponse.toolDenied());
                        if (text || images?.length) {
                            pushAdditionalToolFeedback(text, images);
                            await this.say("user_feedback", text, images);
                        }
                        this.didRejectTool = true; // Prevent further tool uses in this message
                        return false;
                    }
                    else {
                        // User hit the approve button, and may have provided feedback
                        if (text || images?.length) {
                            pushAdditionalToolFeedback(text, images);
                            await this.say("user_feedback", text, images);
                        }
                        return true;
                    }
                };
                const showNotificationForApprovalIfAutoApprovalEnabled = (message) => {
                    if (this.autoApprovalSettings.enabled &&
                        this.autoApprovalSettings.enableNotifications) {
                        showSystemNotification({
                            subtitle: "Approval Required",
                            message,
                        });
                    }
                };
                const handleError = async (action, error) => {
                    if (this.abandoned) {
                        console.log("Ignoring error since task was abandoned (i.e. from task cancellation after resetting)");
                        return;
                    }
                    const errorString = `Error ${action}: ${JSON.stringify(serializeError(error))}`;
                    await this.say("error", `Error ${action}:\n${error.message ?? JSON.stringify(serializeError(error), null, 2)}`);
                    // this.toolResults.push({
                    // 	type: "tool_result",
                    // 	tool_use_id: toolUseId,
                    // 	content: await this.formatToolError(errorString),
                    // })
                    pushToolResult(formatResponse.toolError(errorString));
                };
                // If block is partial, remove partial closing tag so its not presented to user
                const removeClosingTag = (tag, text) => TagProcessingUtils.removeClosingTag(tag, text, block.partial);
                if (block.name !== "browser_action") {
                    await this.browserSession.closeBrowser();
                }
                // Use the ToolExecutionEngine for consistent tool handling (delegates to legacy implementations)
                const toolEngine = new (await import('./ToolExecutionEngine')).ToolExecutionEngine(this, cwd);
                const engineResult = await toolEngine.executeToolBlock(block, toolDescription, this.userMessageContent, this.didRejectTool, this.didAlreadyUseTool, removeClosingTag, handleToolFeedback);
                this.didRejectTool = engineResult.didRejectTool;
                this.didAlreadyUseTool = engineResult.didAlreadyUseTool;
                if (engineResult.handled) {
                    if (!engineResult.shouldContinue) {
                        break;
                    }
                    break;
                }
                if (!engineResult.shouldContinue) {
                    break;
                }
                // Legacy tool implementations (ToolExecutionEngine delegates to these for now)
                switch (block.name) {
                    case "write_to_file":
                    case "replace_in_file": {
                        const relPath = block.params.path;
                        let content = block.params.content; // for write_to_file
                        let diff = block.params.diff; // for replace_in_file
                        if (!relPath || (!content && !diff)) {
                            // checking for content/diff ensures relPath is complete
                            // wait so we can determine if it's a new file or editing an existing file
                            break;
                        }
                        const accessAllowed = this.valorideIgnoreController.validateAccess(relPath);
                        if (!accessAllowed) {
                            await this.say("valorideignore_error", relPath);
                            pushToolResult(formatResponse.toolError(formatResponse.valorideIgnoreError(relPath)));
                            break;
                        }
                        // Check if file exists using cached map or fs.access
                        let fileExists;
                        if (this.diffViewProvider.editType !== undefined) {
                            fileExists = this.diffViewProvider.editType === "modify";
                        }
                        else {
                            const absolutePath = path.resolve(cwd, relPath);
                            fileExists = await fileExistsAtPath(absolutePath);
                            this.diffViewProvider.editType = fileExists ? "modify" : "create";
                        }
                        try {
                            // Construct newContent from diff
                            let newContent;
                            if (diff) {
                                if (!this.api.getModel().id.includes("valoride")) {
                                    // deepseek models tend to use unescaped html entities in diffs
                                    diff = fixModelHtmlEscaping(diff);
                                    diff = removeInvalidChars(diff);
                                }
                                // open the editor if not done already.  This is to fix diff error when model provides correct search-replace text but ValorIDE throws error
                                // because file is not open.
                                if (!this.diffViewProvider.isEditing) {
                                    await this.diffViewProvider.open(relPath);
                                }
                                try {
                                    newContent = await constructNewFileContent(diff, this.diffViewProvider.originalContent || "", !block.partial);
                                }
                                catch (error) {
                                    await this.say("diff_error", relPath);
                                    // Extract error type from error message if possible, or use a generic type
                                    const errorType = error instanceof Error &&
                                        error.message.includes("does not match anything")
                                        ? "search_not_found"
                                        : "other_diff_error";
                                    // Add telemetry for diff edit failure
                                    telemetryService.captureDiffEditFailure(this.taskId, errorType);
                                    pushToolResult(formatResponse.toolError(`${error?.message}\n\n` +
                                        formatResponse.diffError(relPath, this.diffViewProvider.originalContent)));
                                    await this.diffViewProvider.revertChanges();
                                    await this.diffViewProvider.reset();
                                    break;
                                }
                            }
                            else if (content) {
                                newContent = content;
                                // pre-processing newContent for cases where weaker models might add artifacts like markdown codeblock markers (deepseek/llama) or extra escape characters (gemini)
                                if (newContent.startsWith("```")) {
                                    // this handles cases where it includes language specifiers like ```python ```js
                                    newContent = newContent
                                        .split("\n")
                                        .slice(1)
                                        .join("\n")
                                        .trim();
                                }
                                if (newContent.endsWith("```")) {
                                    newContent = newContent
                                        .split("\n")
                                        .slice(0, -1)
                                        .join("\n")
                                        .trim();
                                }
                                if (!this.api.getModel().id.includes("valoride")) {
                                    // it seems not just llama models are doing this, but also gemini and potentially others
                                    newContent = fixModelHtmlEscaping(newContent);
                                    newContent = removeInvalidChars(newContent);
                                }
                            }
                            else {
                                // can't happen, since we already checked for content/diff above. but need to do this for type error
                                break;
                            }
                            newContent = newContent.trimEnd(); // remove any trailing newlines, since it's automatically inserted by the editor
                            const sharedMessageProps = {
                                tool: fileExists ? "editedExistingFile" : "newFileCreated",
                                path: getReadablePath(cwd, removeClosingTag("path", relPath)),
                                content: diff || content,
                                operationIsLocatedInWorkspace: isLocatedInWorkspace(relPath),
                            };
                            if (block.partial) {
                                // update gui message
                                const partialMessage = JSON.stringify(sharedMessageProps);
                                if (this.shouldAutoApproveToolWithPath(block.name, relPath)) {
                                    this.removeLastPartialMessageIfExistsWithType("ask", "tool"); // in case the user changes auto-approval settings mid stream
                                    await this.say("tool", partialMessage, undefined, block.partial);
                                }
                                else {
                                    this.removeLastPartialMessageIfExistsWithType("say", "tool");
                                    await this.ask("tool", partialMessage, block.partial).catch(() => { });
                                }
                                // update editor
                                if (!this.diffViewProvider.isEditing) {
                                    // open the editor and prepare to stream content in
                                    await this.diffViewProvider.open(relPath);
                                }
                                // editor is open, stream content in
                                await this.diffViewProvider.update(newContent, false);
                                break;
                            }
                            else {
                                if (!relPath) {
                                    this.consecutiveMistakeCount++;
                                    pushToolResult(await this.sayAndCreateMissingParamError(block.name, "path"));
                                    await this.diffViewProvider.reset();
                                    break;
                                }
                                if (block.name === "replace_in_file" && !diff) {
                                    this.consecutiveMistakeCount++;
                                    pushToolResult(await this.sayAndCreateMissingParamError("replace_in_file", "diff"));
                                    await this.diffViewProvider.reset();
                                    break;
                                }
                                if (block.name === "write_to_file" && !content) {
                                    this.consecutiveMistakeCount++;
                                    pushToolResult(await this.sayAndCreateMissingParamError("write_to_file", "content"));
                                    await this.diffViewProvider.reset();
                                    break;
                                }
                                this.consecutiveMistakeCount = 0;
                                // if isEditingFile false, that means we have the full contents of the file already.
                                // it's important to note how this function works, you can't make the assumption that the block.partial conditional will always be called since it may immediately get complete, non-partial data. So this part of the logic will always be called.
                                // in other words, you must always repeat the block.partial logic here
                                if (!this.diffViewProvider.isEditing) {
                                    // show gui message before showing edit animation
                                    const partialMessage = JSON.stringify(sharedMessageProps);
                                    await this.ask("tool", partialMessage, true).catch(() => { }); // sending true for partial even though it's not a partial, this shows the edit row before the content is streamed into the editor
                                    await this.diffViewProvider.open(relPath);
                                }
                                await this.diffViewProvider.update(newContent, true);
                                await setTimeoutPromise(300); // wait for diff view to update
                                this.diffViewProvider.scrollToFirstDiff();
                                // showOmissionWarning(this.diffViewProvider.originalContent || "", newContent)
                                const completeMessage = JSON.stringify({
                                    ...sharedMessageProps,
                                    content: diff || content,
                                    operationIsLocatedInWorkspace: isLocatedInWorkspace(relPath),
                                    // ? formatResponse.createPrettyPatch(
                                    // 		relPath,
                                    // 		this.diffViewProvider.originalContent,
                                    // 		newContent,
                                    // 	)
                                    // : undefined,
                                });
                                if (this.shouldAutoApproveToolWithPath(block.name, relPath)) {
                                    this.removeLastPartialMessageIfExistsWithType("ask", "tool");
                                    await this.say("tool", completeMessage, undefined, false);
                                    this.consecutiveAutoApprovedRequestsCount++;
                                    telemetryService.captureToolUsage(this.taskId, block.name, true, true);
                                    // we need an artificial delay to let the diagnostics catch up to the changes
                                    await setTimeoutPromise(3_500);
                                }
                                else {
                                    // If auto-approval is enabled but this tool wasn't auto-approved, send notification
                                    showNotificationForApprovalIfAutoApprovalEnabled(`${fileExists ? "Editing" : "Creating"}: ${path.basename(relPath)}`);
                                    this.removeLastPartialMessageIfExistsWithType("say", "tool");
                                    // Need a more customized tool response for file edits to highlight the fact that the file was not updated (particularly important for deepseek)
                                    let didApprove = true;
                                    const { response, text, images } = await this.ask("tool", completeMessage, false);
                                    if (response !== "yesButtonClicked") {
                                        // User either sent a message or pressed reject button
                                        // TODO: add similar context for other tool denial responses, to emphasize ie that a command was not run
                                        const fileDeniedNote = fileExists
                                            ? "The file was not updated, and maintains its original contents."
                                            : "The file was not created.";
                                        pushToolResult(`The user denied this operation. ${fileDeniedNote}`);
                                        if (text || images?.length) {
                                            pushAdditionalToolFeedback(text, images);
                                            await this.say("user_feedback", text, images);
                                        }
                                        this.didRejectTool = true;
                                        didApprove = false;
                                        telemetryService.captureToolUsage(this.taskId, block.name, false, false);
                                    }
                                    else {
                                        // User hit the approve button, and may have provided feedback
                                        if (text || images?.length) {
                                            pushAdditionalToolFeedback(text, images);
                                            await this.say("user_feedback", text, images);
                                        }
                                        telemetryService.captureToolUsage(this.taskId, block.name, false, true);
                                    }
                                    if (!didApprove) {
                                        await this.diffViewProvider.revertChanges();
                                        break;
                                    }
                                }
                                // Mark the file as edited by ValorIDE to prevent false "recently modified" warnings
                                this.fileContextTracker.markFileAsEditedByValorIDE(relPath);
                                const { newProblemsMessage, userEdits, autoFormattingEdits, finalContent, } = await this.diffViewProvider.saveChanges();
                                this.didEditFile = true; // used to determine if we should wait for busy terminal to update before sending api request
                                // Track file edit operation
                                await this.fileContextTracker.trackFileContext(relPath, "valoride_edited");
                                if (userEdits) {
                                    // Track file edit operation
                                    await this.fileContextTracker.trackFileContext(relPath, "user_edited");
                                    await this.say("user_feedback_diff", JSON.stringify({
                                        tool: fileExists
                                            ? "editedExistingFile"
                                            : "newFileCreated",
                                        path: getReadablePath(cwd, relPath),
                                        diff: userEdits,
                                    }));
                                    pushToolResult(formatResponse.fileEditWithUserChanges(relPath, userEdits, autoFormattingEdits, finalContent, newProblemsMessage));
                                }
                                else {
                                    pushToolResult(formatResponse.fileEditWithoutUserChanges(relPath, autoFormattingEdits, finalContent, newProblemsMessage));
                                }
                                if (!fileExists) {
                                    this.workspaceTracker.populateFilePaths();
                                }
                                await this.diffViewProvider.reset();
                                await this.saveCheckpoint();
                                break;
                            }
                        }
                        catch (error) {
                            await handleError("writing file", error);
                            await this.diffViewProvider.revertChanges();
                            await this.diffViewProvider.reset();
                            break;
                        }
                    }
                    case "read_file": {
                        const relPath = block.params.path;
                        const sharedMessageProps = {
                            tool: "readFile",
                            path: getReadablePath(cwd, removeClosingTag("path", relPath)),
                        };
                        try {
                            if (block.partial) {
                                const partialMessage = JSON.stringify({
                                    ...sharedMessageProps,
                                    content: undefined,
                                    operationIsLocatedInWorkspace: isLocatedInWorkspace(relPath),
                                });
                                if (this.shouldAutoApproveToolWithPath(block.name, block.params.path)) {
                                    this.removeLastPartialMessageIfExistsWithType("ask", "tool");
                                    await this.say("tool", partialMessage, undefined, block.partial);
                                }
                                else {
                                    this.removeLastPartialMessageIfExistsWithType("say", "tool");
                                    await this.ask("tool", partialMessage, block.partial).catch(() => { });
                                }
                                break;
                            }
                            else {
                                if (!relPath) {
                                    this.consecutiveMistakeCount++;
                                    pushToolResult(await this.sayAndCreateMissingParamError("read_file", "path"));
                                    break;
                                }
                                const accessAllowed = this.valorideIgnoreController.validateAccess(relPath);
                                if (!accessAllowed) {
                                    await this.say("valorideignore_error", relPath);
                                    pushToolResult(formatResponse.toolError(formatResponse.valorideIgnoreError(relPath)));
                                    break;
                                }
                                this.consecutiveMistakeCount = 0;
                                const absolutePath = path.resolve(cwd, relPath);
                                const completeMessage = JSON.stringify({
                                    ...sharedMessageProps,
                                    content: absolutePath,
                                    operationIsLocatedInWorkspace: isLocatedInWorkspace(relPath),
                                });
                                if (this.shouldAutoApproveToolWithPath(block.name, block.params.path)) {
                                    this.removeLastPartialMessageIfExistsWithType("ask", "tool");
                                    await this.say("tool", completeMessage, undefined, false); // need to be sending partialValue bool, since undefined has its own purpose in that the message is treated neither as a partial or completion of a partial, but as a single complete message
                                    this.consecutiveAutoApprovedRequestsCount++;
                                    telemetryService.captureToolUsage(this.taskId, block.name, true, true);
                                }
                                else {
                                    showNotificationForApprovalIfAutoApprovalEnabled(`Reading: ${path.basename(absolutePath)}`);
                                    this.removeLastPartialMessageIfExistsWithType("say", "tool");
                                    const didApprove = await askApproval("tool", completeMessage);
                                    if (!didApprove) {
                                        telemetryService.captureToolUsage(this.taskId, block.name, false, false);
                                        break;
                                    }
                                    telemetryService.captureToolUsage(this.taskId, block.name, false, true);
                                }
                                // now execute the tool like normal
                                const content = await extractTextFromFile(absolutePath);
                                // Track file read operation
                                await this.fileContextTracker.trackFileContext(relPath, "read_tool");
                                pushToolResult(content);
                                break;
                            }
                        }
                        catch (error) {
                            await handleError("reading file", error);
                            break;
                        }
                    }
                    case "list_files": {
                        const relDirPath = block.params.path;
                        const recursiveRaw = block.params.recursive;
                        const recursive = recursiveRaw?.toLowerCase() === "true";
                        const sharedMessageProps = {
                            tool: !recursive ? "listFilesTopLevel" : "listFilesRecursive",
                            path: getReadablePath(cwd, removeClosingTag("path", relDirPath)),
                        };
                        try {
                            if (block.partial) {
                                const partialMessage = JSON.stringify({
                                    ...sharedMessageProps,
                                    content: "",
                                    operationIsLocatedInWorkspace: isLocatedInWorkspace(block.params.path),
                                });
                                if (this.shouldAutoApproveToolWithPath(block.name, block.params.path)) {
                                    this.removeLastPartialMessageIfExistsWithType("ask", "tool");
                                    await this.say("tool", partialMessage, undefined, block.partial);
                                }
                                else {
                                    this.removeLastPartialMessageIfExistsWithType("say", "tool");
                                    await this.ask("tool", partialMessage, block.partial).catch(() => { });
                                }
                                break;
                            }
                            else {
                                if (!relDirPath) {
                                    this.consecutiveMistakeCount++;
                                    pushToolResult(await this.sayAndCreateMissingParamError("list_files", "path"));
                                    break;
                                }
                                this.consecutiveMistakeCount = 0;
                                const absolutePath = path.resolve(cwd, relDirPath);
                                const [files, didHitLimit] = await listFiles(absolutePath, recursive, 200);
                                const result = formatResponse.formatFilesList(absolutePath, files, didHitLimit, this.valorideIgnoreController);
                                const completeMessage = JSON.stringify({
                                    ...sharedMessageProps,
                                    content: result,
                                    operationIsLocatedInWorkspace: isLocatedInWorkspace(block.params.path),
                                });
                                if (this.shouldAutoApproveToolWithPath(block.name, block.params.path)) {
                                    this.removeLastPartialMessageIfExistsWithType("ask", "tool");
                                    await this.say("tool", completeMessage, undefined, false);
                                    this.consecutiveAutoApprovedRequestsCount++;
                                    telemetryService.captureToolUsage(this.taskId, block.name, true, true);
                                }
                                else {
                                    showNotificationForApprovalIfAutoApprovalEnabled(`Browsing: ${path.basename(absolutePath)}/`);
                                    this.removeLastPartialMessageIfExistsWithType("say", "tool");
                                    const didApprove = await askApproval("tool", completeMessage);
                                    if (!didApprove) {
                                        telemetryService.captureToolUsage(this.taskId, block.name, false, false);
                                        break;
                                    }
                                    telemetryService.captureToolUsage(this.taskId, block.name, false, true);
                                }
                                pushToolResult(result);
                                break;
                            }
                        }
                        catch (error) {
                            await handleError("listing files", error);
                            break;
                        }
                    }
                    case "list_code_definition_names": {
                        const relDirPath = block.params.path;
                        const sharedMessageProps = {
                            tool: "listCodeDefinitionNames",
                            path: getReadablePath(cwd, removeClosingTag("path", relDirPath)),
                        };
                        try {
                            if (block.partial) {
                                const partialMessage = JSON.stringify({
                                    ...sharedMessageProps,
                                    content: "",
                                    operationIsLocatedInWorkspace: isLocatedInWorkspace(block.params.path),
                                });
                                if (this.shouldAutoApproveToolWithPath(block.name, block.params.path)) {
                                    this.removeLastPartialMessageIfExistsWithType("ask", "tool");
                                    await this.say("tool", partialMessage, undefined, block.partial);
                                }
                                else {
                                    this.removeLastPartialMessageIfExistsWithType("say", "tool");
                                    await this.ask("tool", partialMessage, block.partial).catch(() => { });
                                }
                                break;
                            }
                            else {
                                if (!relDirPath) {
                                    this.consecutiveMistakeCount++;
                                    pushToolResult(await this.sayAndCreateMissingParamError("list_code_definition_names", "path"));
                                    break;
                                }
                                this.consecutiveMistakeCount = 0;
                                const absolutePath = path.resolve(cwd, relDirPath);
                                const result = await parseSourceCodeForDefinitionsTopLevel(absolutePath, this.valorideIgnoreController);
                                const completeMessage = JSON.stringify({
                                    ...sharedMessageProps,
                                    content: result,
                                    operationIsLocatedInWorkspace: isLocatedInWorkspace(block.params.path),
                                });
                                if (this.shouldAutoApproveToolWithPath(block.name, block.params.path)) {
                                    this.removeLastPartialMessageIfExistsWithType("ask", "tool");
                                    await this.say("tool", completeMessage, undefined, false);
                                    this.consecutiveAutoApprovedRequestsCount++;
                                    telemetryService.captureToolUsage(this.taskId, block.name, true, true);
                                }
                                else {
                                    showNotificationForApprovalIfAutoApprovalEnabled(`Analyzing: ${path.basename(absolutePath)}/`);
                                    this.removeLastPartialMessageIfExistsWithType("say", "tool");
                                    const didApprove = await askApproval("tool", completeMessage);
                                    if (!didApprove) {
                                        telemetryService.captureToolUsage(this.taskId, block.name, false, false);
                                        break;
                                    }
                                    telemetryService.captureToolUsage(this.taskId, block.name, false, true);
                                }
                                pushToolResult(result);
                                break;
                            }
                        }
                        catch (error) {
                            await handleError("parsing source code definitions", error);
                            break;
                        }
                    }
                    case "search_files": {
                        const relDirPath = block.params.path;
                        const regex = block.params.regex;
                        const filePattern = block.params.file_pattern;
                        const sharedMessageProps = {
                            tool: "searchFiles",
                            path: getReadablePath(cwd, removeClosingTag("path", relDirPath)),
                            regex: removeClosingTag("regex", regex),
                            filePattern: removeClosingTag("file_pattern", filePattern),
                        };
                        try {
                            if (block.partial) {
                                const partialMessage = JSON.stringify({
                                    ...sharedMessageProps,
                                    content: "",
                                    operationIsLocatedInWorkspace: isLocatedInWorkspace(block.params.path),
                                });
                                if (this.shouldAutoApproveToolWithPath(block.name, block.params.path)) {
                                    this.removeLastPartialMessageIfExistsWithType("ask", "tool");
                                    await this.say("tool", partialMessage, undefined, block.partial);
                                }
                                else {
                                    this.removeLastPartialMessageIfExistsWithType("say", "tool");
                                    await this.ask("tool", partialMessage, block.partial).catch(() => { });
                                }
                                break;
                            }
                            else {
                                if (!relDirPath) {
                                    this.consecutiveMistakeCount++;
                                    pushToolResult(await this.sayAndCreateMissingParamError("search_files", "path"));
                                    break;
                                }
                                if (!regex) {
                                    this.consecutiveMistakeCount++;
                                    pushToolResult(await this.sayAndCreateMissingParamError("search_files", "regex"));
                                    break;
                                }
                                this.consecutiveMistakeCount = 0;
                                const absolutePath = path.resolve(cwd, relDirPath);
                                const results = await regexSearchFiles(cwd, absolutePath, regex, filePattern, this.valorideIgnoreController);
                                const completeMessage = JSON.stringify({
                                    ...sharedMessageProps,
                                    content: results,
                                    operationIsLocatedInWorkspace: isLocatedInWorkspace(block.params.path),
                                });
                                if (this.shouldAutoApproveToolWithPath(block.name, block.params.path)) {
                                    this.removeLastPartialMessageIfExistsWithType("ask", "tool");
                                    await this.say("tool", completeMessage, undefined, false);
                                    this.consecutiveAutoApprovedRequestsCount++;
                                    telemetryService.captureToolUsage(this.taskId, block.name, true, true);
                                }
                                else {
                                    showNotificationForApprovalIfAutoApprovalEnabled(`Searching: ${path.basename(absolutePath)}/`);
                                    this.removeLastPartialMessageIfExistsWithType("say", "tool");
                                    const didApprove = await askApproval("tool", completeMessage);
                                    if (!didApprove) {
                                        telemetryService.captureToolUsage(this.taskId, block.name, false, false);
                                        break;
                                    }
                                    telemetryService.captureToolUsage(this.taskId, block.name, false, true);
                                }
                                pushToolResult(results);
                                break;
                            }
                        }
                        catch (error) {
                            await handleError("searching files", error);
                            break;
                        }
                    }
                    case "browser_action": {
                        const action = block.params
                            .action;
                        const url = block.params.url;
                        const coordinate = block.params.coordinate;
                        const text = block.params.text;
                        if (!action || !browserActions.includes(action)) {
                            // checking for action to ensure it is complete and valid
                            if (!block.partial) {
                                // if the block is complete and we don't have a valid action this is a mistake
                                this.consecutiveMistakeCount++;
                                pushToolResult(await this.sayAndCreateMissingParamError("browser_action", "action"));
                                await this.browserSession.closeBrowser();
                            }
                            break;
                        }
                        try {
                            if (block.partial) {
                                if (action === "launch") {
                                    if (this.shouldAutoApproveTool(block.name)) {
                                        this.removeLastPartialMessageIfExistsWithType("ask", "browser_action_launch");
                                        await this.say("browser_action_launch", removeClosingTag("url", url), undefined, block.partial);
                                    }
                                    else {
                                        this.removeLastPartialMessageIfExistsWithType("say", "browser_action_launch");
                                        await this.ask("browser_action_launch", removeClosingTag("url", url), block.partial).catch(() => { });
                                    }
                                }
                                else {
                                    await this.say("browser_action", JSON.stringify({
                                        action: action,
                                        coordinate: removeClosingTag("coordinate", coordinate),
                                        text: removeClosingTag("text", text),
                                    }), undefined, block.partial);
                                }
                                break;
                            }
                            else {
                                let browserActionResult;
                                if (action === "launch") {
                                    if (!url) {
                                        this.consecutiveMistakeCount++;
                                        pushToolResult(await this.sayAndCreateMissingParamError("browser_action", "url"));
                                        await this.browserSession.closeBrowser();
                                        break;
                                    }
                                    this.consecutiveMistakeCount = 0;
                                    if (this.shouldAutoApproveTool(block.name)) {
                                        this.removeLastPartialMessageIfExistsWithType("ask", "browser_action_launch");
                                        await this.say("browser_action_launch", url, undefined, false);
                                        this.consecutiveAutoApprovedRequestsCount++;
                                    }
                                    else {
                                        showNotificationForApprovalIfAutoApprovalEnabled(`Launching browser: ${url}`);
                                        this.removeLastPartialMessageIfExistsWithType("say", "browser_action_launch");
                                        const didApprove = await askApproval("browser_action_launch", url);
                                        if (!didApprove) {
                                            break;
                                        }
                                    }
                                    // NOTE: it's okay that we call this message since the partial inspect_site is finished streaming. The only scenario we have to avoid is sending messages WHILE a partial message exists at the end of the messages array. For example the api_req_finished message would interfere with the partial message, so we needed to remove that.
                                    // await this.say("inspect_site_result", "") // no result, starts the loading spinner waiting for result
                                    await this.say("browser_action_result", ""); // starts loading spinner
                                    // Re-make browserSession to make sure latest settings apply
                                    if (this.context) {
                                        await this.browserSession.dispose();
                                        this.browserSession = new BrowserSession(this.context, this.browserSettings);
                                    }
                                    else {
                                        console.warn("no controller context available for browserSession");
                                    }
                                    await this.browserSession.launchBrowser();
                                    browserActionResult =
                                        await this.browserSession.navigateToUrl(url);
                                }
                                else {
                                    if (action === "click") {
                                        if (!coordinate) {
                                            this.consecutiveMistakeCount++;
                                            pushToolResult(await this.sayAndCreateMissingParamError("browser_action", "coordinate"));
                                            await this.browserSession.closeBrowser();
                                            break; // can't be within an inner switch
                                        }
                                    }
                                    if (action === "type") {
                                        if (!text) {
                                            this.consecutiveMistakeCount++;
                                            pushToolResult(await this.sayAndCreateMissingParamError("browser_action", "text"));
                                            await this.browserSession.closeBrowser();
                                            break;
                                        }
                                    }
                                    this.consecutiveMistakeCount = 0;
                                    await this.say("browser_action", JSON.stringify({
                                        action: action,
                                        coordinate,
                                        text,
                                    }), undefined, false);
                                    switch (action) {
                                        case "click":
                                            browserActionResult = await this.browserSession.click(coordinate);
                                            break;
                                        case "type":
                                            browserActionResult = await this.browserSession.type(text);
                                            break;
                                        case "scroll_down":
                                            browserActionResult =
                                                await this.browserSession.scrollDown();
                                            break;
                                        case "scroll_up":
                                            browserActionResult =
                                                await this.browserSession.scrollUp();
                                            break;
                                        case "close":
                                            browserActionResult =
                                                await this.browserSession.closeBrowser();
                                            break;
                                    }
                                }
                                switch (action) {
                                    case "launch":
                                    case "click":
                                    case "type":
                                    case "scroll_down":
                                    case "scroll_up":
                                        await this.say("browser_action_result", JSON.stringify(browserActionResult));
                                        pushToolResult(formatResponse.toolResult(`The browser action has been executed. The console logs and screenshot have been captured for your analysis.\n\nConsole logs:\n${browserActionResult.logs || "(No new logs)"}\n\n(REMEMBER: if you need to proceed to using non-\`browser_action\` tools or launch a new browser, you MUST first close this browser. For example, if after analyzing the logs and screenshot you need to edit a file, you must first close the browser before you can use the write_to_file tool.)`, browserActionResult.screenshot
                                            ? [browserActionResult.screenshot]
                                            : []));
                                        break;
                                    case "close":
                                        pushToolResult(formatResponse.toolResult(`The browser has been closed. You may now proceed to using other tools.`));
                                        break;
                                }
                                break;
                            }
                        }
                        catch (error) {
                            await this.browserSession.closeBrowser(); // if any error occurs, the browser session is terminated
                            await handleError("executing browser action", error);
                            break;
                        }
                    }
                    case "execute_command": {
                        let command = block.params.command;
                        const requiresApprovalRaw = block.params.requires_approval;
                        const requiresApprovalPerLLM = requiresApprovalRaw?.toLowerCase() === "true";
                        try {
                            if (block.partial) {
                                if (this.shouldAutoApproveTool(block.name)) {
                                    // since depending on an upcoming parameter, requiresApproval this may become an ask - we can't partially stream a say prematurely. So in this particular case we have to wait for the requiresApproval parameter to be completed before presenting it.
                                    // await this.say(
                                    // 	"command",
                                    // 	removeClosingTag("command", command),
                                    // 	undefined,
                                    // 	block.partial,
                                    // ).catch(() => {})
                                }
                                else {
                                    // don't need to remove last partial since we couldn't have streamed a say
                                    await this.ask("command", removeClosingTag("command", command), block.partial).catch(() => { });
                                }
                                break;
                            }
                            else {
                                if (!command) {
                                    this.consecutiveMistakeCount++;
                                    pushToolResult(await this.sayAndCreateMissingParamError("execute_command", "command"));
                                    break;
                                }
                                if (!requiresApprovalRaw) {
                                    this.consecutiveMistakeCount++;
                                    pushToolResult(await this.sayAndCreateMissingParamError("execute_command", "requires_approval"));
                                    break;
                                }
                                this.consecutiveMistakeCount = 0;
                                // gemini models tend to use unescaped html entities in commands
                                if (this.api.getModel().id.includes("gemini")) {
                                    command = fixModelHtmlEscaping(command);
                                }
                                const ignoredFileAttemptedToAccess = this.valorideIgnoreController.validateCommand(command);
                                if (ignoredFileAttemptedToAccess) {
                                    await this.say("valorideignore_error", ignoredFileAttemptedToAccess);
                                    pushToolResult(formatResponse.toolError(formatResponse.valorideIgnoreError(ignoredFileAttemptedToAccess)));
                                    break;
                                }
                                let didAutoApprove = false;
                                // If the model says this command is safe and auto approval for safe commands is true, execute the command
                                // If the model says the command is risky, but *BOTH* auto approve settings are true, execute the command
                                const autoApproveResult = this.shouldAutoApproveTool(block.name);
                                const [autoApproveSafe, autoApproveAll] = Array.isArray(autoApproveResult)
                                    ? autoApproveResult
                                    : [autoApproveResult, false];
                                if ((!requiresApprovalPerLLM && autoApproveSafe) ||
                                    (requiresApprovalPerLLM && autoApproveSafe && autoApproveAll)) {
                                    this.removeLastPartialMessageIfExistsWithType("ask", "command");
                                    await this.say("command", command, undefined, false);
                                    this.consecutiveAutoApprovedRequestsCount++;
                                    didAutoApprove = true;
                                }
                                else {
                                    showNotificationForApprovalIfAutoApprovalEnabled(`$ ${command}`);
                                    // this.removeLastPartialMessageIfExistsWithType("say", "command")
                                    const didApprove = await askApproval("command", command +
                                        `${this.shouldAutoApproveTool(block.name) && requiresApprovalPerLLM ? COMMAND_REQ_APP_STRING : ""}`);
                                    if (!didApprove) {
                                        break;
                                    }
                                }
                                let timeoutId;
                                if (didAutoApprove &&
                                    this.autoApprovalSettings.enableNotifications) {
                                    // if the command was auto-approved, and it's long running we need to notify the user after some time has passed without proceeding
                                    timeoutId = setTimeout(() => {
                                        showSystemNotification({
                                            subtitle: "Command is still running",
                                            message: "An auto-approved command has been running for 30s, and may need your attention.",
                                        });
                                    }, 30_000);
                                }
                                const [userRejected, result] = await this.executeCommandTool(command);
                                if (timeoutId) {
                                    clearTimeout(timeoutId);
                                }
                                if (userRejected) {
                                    this.didRejectTool = true;
                                }
                                // Re-populate file paths in case the command modified the workspace (vscode listeners do not trigger unless the user manually creates/deletes files)
                                this.workspaceTracker.populateFilePaths();
                                pushToolResult(result);
                                await this.saveCheckpoint();
                                break;
                            }
                        }
                        catch (error) {
                            await handleError("executing command", error);
                            break;
                        }
                    }
                    case "use_mcp_tool": {
                        const server_name = block.params.server_name;
                        const tool_name = block.params.tool_name;
                        const mcp_arguments = block.params.arguments;
                        try {
                            if (block.partial) {
                                const partialMessage = JSON.stringify({
                                    type: "use_mcp_tool",
                                    serverName: removeClosingTag("server_name", server_name),
                                    toolName: removeClosingTag("tool_name", tool_name),
                                    arguments: removeClosingTag("arguments", mcp_arguments),
                                });
                                if (this.shouldAutoApproveTool(block.name)) {
                                    this.removeLastPartialMessageIfExistsWithType("ask", "use_mcp_server");
                                    await this.say("use_mcp_server", partialMessage, undefined, block.partial);
                                }
                                else {
                                    this.removeLastPartialMessageIfExistsWithType("say", "use_mcp_server");
                                    await this.ask("use_mcp_server", partialMessage, block.partial).catch(() => { });
                                }
                                break;
                            }
                            else {
                                if (!server_name) {
                                    this.consecutiveMistakeCount++;
                                    pushToolResult(await this.sayAndCreateMissingParamError("use_mcp_tool", "server_name"));
                                    break;
                                }
                                if (!tool_name) {
                                    this.consecutiveMistakeCount++;
                                    pushToolResult(await this.sayAndCreateMissingParamError("use_mcp_tool", "tool_name"));
                                    break;
                                }
                                // arguments are optional, but if they are provided they must be valid JSON
                                // if (!mcp_arguments) {
                                // 	this.consecutiveMistakeCount++
                                // 	pushToolResult(await this.sayAndCreateMissingParamError("use_mcp_tool", "arguments"))
                                // 	break
                                // }
                                let parsedArguments;
                                if (mcp_arguments) {
                                    try {
                                        parsedArguments = JSON.parse(mcp_arguments);
                                    }
                                    catch (error) {
                                        this.consecutiveMistakeCount++;
                                        await this.say("error", `ValorIDE tried to use ${tool_name} with an invalid JSON argument. Retrying...`);
                                        pushToolResult(formatResponse.toolError(formatResponse.invalidMcpToolArgumentError(server_name, tool_name)));
                                        break;
                                    }
                                }
                                this.consecutiveMistakeCount = 0;
                                const completeMessage = JSON.stringify({
                                    type: "use_mcp_tool",
                                    serverName: server_name,
                                    toolName: tool_name,
                                    arguments: mcp_arguments,
                                });
                                const isToolAutoApproved = this.mcpHub.connections
                                    ?.find((conn) => conn.server.name === server_name)
                                    ?.server.tools?.find((tool) => tool.name === tool_name)?.autoApprove;
                                if (this.shouldAutoApproveTool(block.name) &&
                                    isToolAutoApproved) {
                                    this.removeLastPartialMessageIfExistsWithType("ask", "use_mcp_server");
                                    await this.say("use_mcp_server", completeMessage, undefined, false);
                                    this.consecutiveAutoApprovedRequestsCount++;
                                }
                                else {
                                    showNotificationForApprovalIfAutoApprovalEnabled(`MCP: ${tool_name} (${server_name})`);
                                    this.removeLastPartialMessageIfExistsWithType("say", "use_mcp_server");
                                    const didApprove = await askApproval("use_mcp_server", completeMessage);
                                    if (!didApprove) {
                                        break;
                                    }
                                }
                                // now execute the tool
                                await this.say("mcp_server_request_started"); // same as browser_action_result
                                const toolResult = await this.mcpHub.callTool(server_name, tool_name, parsedArguments);
                                // TODO: add progress indicator
                                const toolResultImages = toolResult?.content
                                    .filter((item) => item.type === "image")
                                    .map((item) => `data:${item.mimeType};base64,${item.data}`) || [];
                                let toolResultText = (toolResult?.isError ? "Error:\n" : "") +
                                    toolResult?.content
                                        .map((item) => {
                                        if (item.type === "text") {
                                            return item.text;
                                        }
                                        if (item.type === "resource") {
                                            const { blob, ...rest } = item.resource;
                                            return JSON.stringify(rest, null, 2);
                                        }
                                        return "";
                                    })
                                        .filter(Boolean)
                                        .join("\n\n") || "(No response)";
                                // webview extracts images from the text response to display in the UI
                                const toolResultToDisplay = toolResultText +
                                    toolResultImages?.map((image) => `\n\n${image}`).join("");
                                await this.say("mcp_server_response", toolResultToDisplay);
                                // MCP's might return images to display to the user, but the model may not support them
                                const supportsImages = this.api.getModel().info.supportsImages ?? false;
                                if (toolResultImages.length > 0 && !supportsImages) {
                                    toolResultText += `\n\n[${toolResultImages.length} images were provided in the response, and while they are displayed to the user, you do not have the ability to view them.]`;
                                }
                                // only passes in images if model supports them
                                pushToolResult(formatResponse.toolResult(toolResultText, supportsImages ? toolResultImages : undefined));
                                await this.saveCheckpoint();
                                break;
                            }
                        }
                        catch (error) {
                            await handleError("executing MCP tool", error);
                            break;
                        }
                    }
                    case "access_mcp_resource": {
                        const server_name = block.params.server_name;
                        const uri = block.params.uri;
                        try {
                            if (block.partial) {
                                const partialMessage = JSON.stringify({
                                    type: "access_mcp_resource",
                                    serverName: removeClosingTag("server_name", server_name),
                                    uri: removeClosingTag("uri", uri),
                                });
                                if (this.shouldAutoApproveTool(block.name)) {
                                    this.removeLastPartialMessageIfExistsWithType("ask", "use_mcp_server");
                                    await this.say("use_mcp_server", partialMessage, undefined, block.partial);
                                }
                                else {
                                    this.removeLastPartialMessageIfExistsWithType("say", "use_mcp_server");
                                    await this.ask("use_mcp_server", partialMessage, block.partial).catch(() => { });
                                }
                                break;
                            }
                            else {
                                if (!server_name) {
                                    this.consecutiveMistakeCount++;
                                    pushToolResult(await this.sayAndCreateMissingParamError("access_mcp_resource", "server_name"));
                                    break;
                                }
                                if (!uri) {
                                    this.consecutiveMistakeCount++;
                                    pushToolResult(await this.sayAndCreateMissingParamError("access_mcp_resource", "uri"));
                                    break;
                                }
                                this.consecutiveMistakeCount = 0;
                                const completeMessage = JSON.stringify({
                                    type: "access_mcp_resource",
                                    serverName: server_name,
                                    uri,
                                });
                                if (this.shouldAutoApproveTool(block.name)) {
                                    this.removeLastPartialMessageIfExistsWithType("ask", "use_mcp_server");
                                    await this.say("use_mcp_server", completeMessage, undefined, false);
                                    this.consecutiveAutoApprovedRequestsCount++;
                                }
                                else {
                                    showNotificationForApprovalIfAutoApprovalEnabled(`Accessing: ${uri} (${server_name})`);
                                    this.removeLastPartialMessageIfExistsWithType("say", "use_mcp_server");
                                    const didApprove = await askApproval("use_mcp_server", completeMessage);
                                    if (!didApprove) {
                                        break;
                                    }
                                }
                                // now execute the tool
                                await this.say("mcp_server_request_started");
                                const resourceResult = await this.mcpHub.readResource(server_name, uri);
                                const resourceResultPretty = resourceResult?.contents
                                    .map((item) => {
                                    if (item.text) {
                                        return item.text;
                                    }
                                    return "";
                                })
                                    .filter(Boolean)
                                    .join("\n\n") || "(Empty response)";
                                await this.say("mcp_server_response", resourceResultPretty);
                                pushToolResult(formatResponse.toolResult(resourceResultPretty));
                                break;
                            }
                        }
                        catch (error) {
                            await handleError("accessing MCP resource", error);
                            break;
                        }
                    }
                    case "ask_followup_question": {
                        const question = block.params.question;
                        const optionsRaw = block.params.options;
                        const sharedMessage = {
                            question: removeClosingTag("question", question),
                            options: parsePartialArrayString(removeClosingTag("options", optionsRaw)),
                        };
                        try {
                            if (block.partial) {
                                await this.ask("followup", JSON.stringify(sharedMessage), block.partial).catch(() => { });
                                break;
                            }
                            else {
                                if (!question) {
                                    this.consecutiveMistakeCount++;
                                    pushToolResult(await this.sayAndCreateMissingParamError("ask_followup_question", "question"));
                                    break;
                                }
                                this.consecutiveMistakeCount = 0;
                                if (this.autoApprovalSettings.enableNotifications) {
                                    showSystemNotification({
                                        subtitle: "ValorIDE has a question...",
                                        message: question.replace(/\n/g, " "),
                                    });
                                }
                                // Store the number of options for telemetry
                                const options = parsePartialArrayString(optionsRaw || "[]");
                                const { text, images } = await this.ask("followup", JSON.stringify(sharedMessage), false);
                                // Check if options contains the text response
                                if (optionsRaw &&
                                    text &&
                                    parsePartialArrayString(optionsRaw).includes(text)) {
                                    // Valid option selected, don't show user message in UI
                                    // Update last followup message with selected option
                                    const lastFollowupMessage = findLast(this.valorideMessages, (m) => m.ask === "followup");
                                    if (lastFollowupMessage) {
                                        lastFollowupMessage.text = JSON.stringify({
                                            ...sharedMessage,
                                            selected: text,
                                        });
                                        await this.saveValorIDEMessagesAndUpdateHistory();
                                        telemetryService.captureOptionSelected(this.taskId, options.length, "act");
                                    }
                                }
                                else {
                                    // Option not selected, send user feedback
                                    telemetryService.captureOptionsIgnored(this.taskId, options.length, "act");
                                    await this.say("user_feedback", text ?? "", images);
                                }
                                pushToolResult(formatResponse.toolResult(`<answer>\n${text}\n</answer>`, images));
                                break;
                            }
                        }
                        catch (error) {
                            await handleError("asking question", error);
                            break;
                        }
                    }
                    case "new_task": {
                        const context = block.params.context;
                        try {
                            if (block.partial) {
                                await this.ask("new_task", removeClosingTag("context", context), block.partial).catch(() => { });
                                break;
                            }
                            else {
                                if (!context) {
                                    this.consecutiveMistakeCount++;
                                    pushToolResult(await this.sayAndCreateMissingParamError("new_task", "context"));
                                    break;
                                }
                                this.consecutiveMistakeCount = 0;
                                if (this.autoApprovalSettings.enabled &&
                                    this.autoApprovalSettings.enableNotifications) {
                                    showSystemNotification({
                                        subtitle: "Starting new task...",
                                        message: `New task: ${context}`,
                                    });
                                }
                                const { text, images } = await this.ask("new_task", context, false);
                                // If the user provided a response, treat it as feedback
                                if (text || images?.length) {
                                    await this.say("user_feedback", text ?? "", images);
                                    pushToolResult(formatResponse.toolResult(`The user provided feedback instead of creating a new task:\n<feedback>\n${text}\n</feedback>`, images));
                                }
                                else {
                                    // If no response, the user clicked the "Create New Task" button
                                    pushToolResult(formatResponse.toolResult(`The user has created a new task with the provided context.`));
                                }
                                break;
                            }
                        }
                        catch (error) {
                            await handleError("creating new task", error);
                            break;
                        }
                    }
                    case "condense": {
                        const context = block.params.context;
                        try {
                            if (block.partial) {
                                await this.ask("condense", removeClosingTag("context", context), block.partial).catch(() => { });
                                break;
                            }
                            else {
                                if (!context) {
                                    this.consecutiveMistakeCount++;
                                    pushToolResult(await this.sayAndCreateMissingParamError("condense", "context"));
                                    break;
                                }
                                this.consecutiveMistakeCount = 0;
                                if (this.autoApprovalSettings.enabled &&
                                    this.autoApprovalSettings.enableNotifications) {
                                    showSystemNotification({
                                        subtitle: "Condensing conversation...",
                                        message: `Condense: ${context}`,
                                    });
                                }
                                const { text, images } = await this.ask("condense", context, false);
                                // If the user provided a response, treat it as feedback
                                if (text || images?.length) {
                                    await this.say("user_feedback", text ?? "", images);
                                    pushToolResult(formatResponse.toolResult(`The user provided feedback on the condensed conversation summary:\n<feedback>\n${text}\n</feedback>`, images));
                                }
                                else {
                                    // If no response, the user accepted the condensed version
                                    pushToolResult(formatResponse.toolResult(formatResponse.condense()));
                                    const lastMessage = this.apiConversationHistory[this.apiConversationHistory.length - 1];
                                    const summaryAlreadyAppended = lastMessage && lastMessage.role === "assistant";
                                    const keepStrategy = summaryAlreadyAppended
                                        ? "lastTwo"
                                        : "none";
                                    // clear the context history at this point in time
                                    this.conversationHistoryDeletedRange =
                                        this.contextManager.getNextTruncationRange(this.apiConversationHistory, this.conversationHistoryDeletedRange, keepStrategy);
                                    await this.saveValorIDEMessagesAndUpdateHistory();
                                    await this.contextManager.triggerApplyStandardContextTruncationNoticeChange(Date.now(), await ensureTaskDirectoryExists(this.getContext(), this.taskId));
                                }
                                break;
                            }
                        }
                        catch (error) {
                            await handleError("condensing context window", error);
                            break;
                        }
                    }
                    case "plan_mode_respond": {
                        const response = block.params.response;
                        const optionsRaw = block.params.options;
                        const sharedMessage = {
                            response: removeClosingTag("response", response),
                            options: parsePartialArrayString(removeClosingTag("options", optionsRaw)),
                        };
                        try {
                            if (block.partial) {
                                await this.ask("plan_mode_respond", JSON.stringify(sharedMessage), block.partial).catch(() => { });
                                break;
                            }
                            else {
                                if (!response) {
                                    this.consecutiveMistakeCount++;
                                    pushToolResult(await this.sayAndCreateMissingParamError("plan_mode_respond", "response"));
                                    //
                                    break;
                                }
                                this.consecutiveMistakeCount = 0;
                                // if (this.autoApprovalSettings.enabled && this.autoApprovalSettings.enableNotifications) {
                                // 	showSystemNotification({
                                // 		subtitle: "ValorIDE has a response...",
                                // 		message: response.replace(/\n/g, " "),
                                // 	})
                                // }
                                // Store the number of options for telemetry
                                const options = parsePartialArrayString(optionsRaw || "[]");
                                this.isAwaitingPlanResponse = true;
                                let { text, images } = await this.ask("plan_mode_respond", JSON.stringify(sharedMessage), false);
                                this.isAwaitingPlanResponse = false;
                                // webview invoke sendMessage will send this marker in order to put webview into the proper state (responding to an ask) and as a flag to extension that the user switched to ACT mode.
                                if (text === "PLAN_MODE_TOGGLE_RESPONSE") {
                                    text = "";
                                }
                                // Check if options contains the text response
                                if (optionsRaw &&
                                    text &&
                                    parsePartialArrayString(optionsRaw).includes(text)) {
                                    // Valid option selected, don't show user message in UI
                                    // Update last followup message with selected option
                                    const lastPlanMessage = findLast(this.valorideMessages, (m) => m.ask === "plan_mode_respond");
                                    if (lastPlanMessage) {
                                        lastPlanMessage.text = JSON.stringify({
                                            ...sharedMessage,
                                            selected: text,
                                        });
                                        await this.saveValorIDEMessagesAndUpdateHistory();
                                        telemetryService.captureOptionSelected(this.taskId, options.length, "plan");
                                    }
                                }
                                else {
                                    // Option not selected, send user feedback
                                    if (text || images?.length) {
                                        telemetryService.captureOptionsIgnored(this.taskId, options.length, "plan");
                                        await this.say("user_feedback", text ?? "", images);
                                    }
                                }
                                if (this.didRespondToPlanAskBySwitchingMode) {
                                    pushToolResult(formatResponse.toolResult(`[The user has switched to ACT MODE, so you may now proceed with the task.]` +
                                        (text
                                            ? `\n\nThe user also provided the following message when switching to ACT MODE:\n<user_message>\n${text}\n</user_message>`
                                            : ""), images));
                                }
                                else {
                                    // if we didn't switch to ACT MODE, then we can just send the user_feedback message
                                    pushToolResult(formatResponse.toolResult(`<user_message>\n${text}\n</user_message>`, images));
                                }
                                //
                                break;
                            }
                        }
                        catch (error) {
                            await handleError("responding to inquiry", error);
                            //
                            break;
                        }
                    }
                    case "load_mcp_documentation": {
                        try {
                            if (block.partial) {
                                // shouldn't happen
                                break;
                            }
                            else {
                                await this.say("load_mcp_documentation", "", undefined, false);
                                pushToolResult(await loadMcpDocumentation(this.mcpHub));
                                break;
                            }
                        }
                        catch (error) {
                            await handleError("loading MCP documentation", error);
                            break;
                        }
                    }
                    case "attempt_completion": {
                        /*
                        this.consecutiveMistakeCount = 0
                        let resultToSend = result
                        if (command) {
                          await this.say("completion_result", resultToSend)
                          // TODO: currently we don't handle if this command fails, it could be useful to let valoride know and retry
                          const [didUserReject, commandResult] = await this.executeCommand(command, true)
                          // if we received non-empty string, the command was rejected or failed
                          if (commandResult) {
                            return [didUserReject, commandResult]
                          }
                          resultToSend = ""
                        }
                        const { response, text, images } = await this.ask("completion_result", resultToSend) // this prompts webview to show 'new task' button, and enable text input (which would be the 'text' here)
                        if (response === "yesButtonClicked") {
                          return [false, ""] // signals to recursive loop to stop (for now this never happens since yesButtonClicked will trigger a new task)
                        }
                        await this.say("user_feedback", text ?? "", images)
                        return [
                        */
                        const result = block.params.result;
                        const command = block.params.command;
                        let lastCompletionChangesSummary;
                        const addNewChangesFlagToLastCompletionResultMessage = async () => {
                            const summary = await this.getLatestTaskCompletionChangesSummary();
                            const lastCompletionResultMessage = findLast(this.valorideMessages, (m) => m.say === "completion_result");
                            if (!lastCompletionResultMessage) {
                                lastCompletionChangesSummary = summary;
                                return summary;
                            }
                            let didUpdate = false;
                            const existingText = lastCompletionResultMessage.text ?? "";
                            const hasFlag = existingText.endsWith(COMPLETION_RESULT_CHANGES_FLAG);
                            if (summary && summary.totalFiles > 0) {
                                if (!hasFlag) {
                                    lastCompletionResultMessage.text =
                                        existingText + COMPLETION_RESULT_CHANGES_FLAG;
                                    didUpdate = true;
                                }
                                if (lastCompletionResultMessage.changesSummary?.totalFiles !==
                                    summary.totalFiles ||
                                    lastCompletionResultMessage.changesSummary
                                        ?.totalInsertions !== summary.totalInsertions ||
                                    lastCompletionResultMessage.changesSummary
                                        ?.totalDeletions !== summary.totalDeletions) {
                                    lastCompletionResultMessage.changesSummary = summary;
                                    didUpdate = true;
                                }
                            }
                            else {
                                if (hasFlag) {
                                    lastCompletionResultMessage.text = existingText.slice(0, -COMPLETION_RESULT_CHANGES_FLAG.length);
                                    didUpdate = true;
                                }
                                if (lastCompletionResultMessage.changesSummary) {
                                    lastCompletionResultMessage.changesSummary = undefined;
                                    didUpdate = true;
                                }
                            }
                            if (didUpdate) {
                                await this.saveValorIDEMessagesAndUpdateHistory();
                            }
                            lastCompletionChangesSummary = summary;
                            return summary;
                        };
                        try {
                            const lastMessage = this.valorideMessages.at(-1);
                            if (block.partial) {
                                if (command) {
                                    // the attempt_completion text is done, now we're getting command
                                    // remove the previous partial attempt_completion ask, replace with say, post state to webview, then stream command
                                    // const secondLastMessage = this.valorideMessages.at(-2)
                                    // NOTE: we do not want to auto approve a command run as part of the attempt_completion tool
                                    if (lastMessage && lastMessage.ask === "command") {
                                        // update command
                                        await this.ask("command", removeClosingTag("command", command), block.partial).catch(() => { });
                                    }
                                    else {
                                        // last message is completion_result
                                        // we have command string, which means we have the result as well, so finish it (doesn't have to exist yet)
                                        await this.say("completion_result", removeClosingTag("result", result), undefined, false);
                                        await this.saveCheckpoint(true);
                                        lastCompletionChangesSummary =
                                            await addNewChangesFlagToLastCompletionResultMessage();
                                        await this.ask("command", removeClosingTag("command", command), block.partial).catch(() => { });
                                    }
                                }
                                else {
                                    // no command, still outputting partial result
                                    await this.say("completion_result", removeClosingTag("result", result), undefined, block.partial);
                                }
                                break;
                            }
                            else {
                                if (!result) {
                                    this.consecutiveMistakeCount++;
                                    pushToolResult(await this.sayAndCreateMissingParamError("attempt_completion", "result"));
                                    break;
                                }
                                this.consecutiveMistakeCount = 0;
                                if (this.autoApprovalSettings.enableNotifications) {
                                    showSystemNotification({
                                        subtitle: "Task Completed",
                                        message: result.replace(/\n/g, " "),
                                    });
                                }
                                let commandResult;
                                if (command) {
                                    if (lastMessage && lastMessage.ask !== "command") {
                                        // haven't sent a command message yet so first send completion_result then command
                                        await this.say("completion_result", result, undefined, false);
                                        await this.saveCheckpoint(true);
                                        lastCompletionChangesSummary =
                                            await addNewChangesFlagToLastCompletionResultMessage();
                                        telemetryService.captureTaskCompleted(this.taskId);
                                    }
                                    else {
                                        // we already sent a command message, meaning the complete completion message has also been sent
                                        await this.saveCheckpoint(true);
                                        lastCompletionChangesSummary =
                                            await addNewChangesFlagToLastCompletionResultMessage();
                                    }
                                    // complete command message
                                    const didApprove = await askApproval("command", command);
                                    if (!didApprove) {
                                        break;
                                    }
                                    const [userRejected, execCommandResult] = await this.executeCommandTool(command);
                                    if (userRejected) {
                                        this.didRejectTool = true;
                                        pushToolResult(execCommandResult);
                                        break;
                                    }
                                    // user didn't reject, but the command may have output
                                    commandResult = execCommandResult;
                                }
                                else {
                                    await this.say("completion_result", result, undefined, false);
                                    await this.saveCheckpoint(true);
                                    lastCompletionChangesSummary =
                                        await addNewChangesFlagToLastCompletionResultMessage();
                                    telemetryService.captureTaskCompleted(this.taskId);
                                }
                                // we already sent completion_result says, an empty string asks relinquishes control over button and field
                                const { response, text, images } = await this.ask("completion_result", "", false, { changesSummary: lastCompletionChangesSummary });
                                if (response === "yesButtonClicked") {
                                    pushToolResult(""); // signals to recursive loop to stop (for now this never happens since yesButtonClicked will trigger a new task)
                                    break;
                                }
                                await this.say("user_feedback", text ?? "", images);
                                const toolResults = [];
                                if (commandResult) {
                                    if (typeof commandResult === "string") {
                                        toolResults.push({
                                            type: "text",
                                            text: commandResult,
                                        });
                                    }
                                    else if (Array.isArray(commandResult)) {
                                        toolResults.push(...commandResult);
                                    }
                                }
                                toolResults.push({
                                    type: "text",
                                    text: `The user has provided feedback on the results. Consider their input to continue the task, and then attempt completion again.\n<feedback>\n${text}\n</feedback>`,
                                });
                                toolResults.push(...formatResponse.imageBlocks(images));
                                this.userMessageContent.push({
                                    type: "text",
                                    text: `${toolDescription()} Result:`,
                                });
                                this.userMessageContent.push(...toolResults);
                                //
                                break;
                            }
                        }
                        catch (error) {
                            await handleError("attempting completion", error);
                            break;
                        }
                    }
                }
                break;
        }
        /*
        Seeing out of bounds is fine, it means that the next too call is being built up and ready to add to assistantMessageContent to present.
        When you see the UI inactive during this, it means that a tool is breaking without presenting any UI. For example the write_to_file tool was breaking when relpath was undefined, and for invalid relpath it never presented UI.
        */
        // NOTE: when tool is rejected, iterator stream is interrupted and it waits for userMessageContentReady to be true. Future calls to present will skip execution since didRejectTool and iterate until contentIndex is set to message length and it sets userMessageContentReady to true itself (instead of preemptively doing it in iterator)
        if (!block.partial || this.didRejectTool || this.didAlreadyUseTool) {
            // block is finished streaming and executing
            if (this.currentStreamingContentIndex ===
                this.assistantMessageContent.length - 1) {
                // its okay that we increment if !didCompleteReadingStream, it'll just return bc out of bounds and as streaming continues it will call processAssistantBlocks if a new block is ready. if streaming is finished then we set userMessageContentReady to true when out of bounds. This gracefully allows the stream to continue on and all potential content blocks be presented.
                // last block is complete and it is finished executing
                this.userMessageContentReady = true; // will allow pwaitfor to continue
            }
            // call next block if it exists (if not then read stream will call it when its ready)
            this.currentStreamingContentIndex++; // need to increment regardless, so when read stream calls this function again it will be streaming the next block
            if (this.currentStreamingContentIndex < this.assistantMessageContent.length) {
                // there are already more content blocks to stream, so we'll call this function ourselves
                // await this.presentAssistantContent()
                await this.processAssistantBlocks();
                return;
            }
        }
        // block is partial, but the read stream may have finished
    }
    async recursivelyMakeValorIDERequests(userContent, includeFileDetails = false) {
        if (this.abort) {
            throw new Error("ValorIDE instance aborted");
        }
        // Used to know what models were used in the task if user wants to export metadata for error reporting purposes
        const currentProviderId = (await getGlobalState(this.getContext(), "apiProvider"));
        if (currentProviderId && this.api.getModel().id) {
            try {
                await this.modelContextTracker.recordModelUsage(currentProviderId, this.api.getModel().id, this.chatSettings.mode);
            }
            catch { }
        }
        if (this.consecutiveMistakeCount >= 3) {
            if (this.autoApprovalSettings.enabled &&
                this.autoApprovalSettings.enableNotifications) {
                showSystemNotification({
                    subtitle: "Error",
                    message: "ValorIDE is having trouble. Would you like to continue the task?",
                });
            }
            const { response, text, images } = await this.ask("mistake_limit_reached", this.api.getModel().id.includes("valoride")
                ? `This may indicate a failure in his thought process or inability to use a tool properly, which can be mitigated with some user guidance (e.g. "Try breaking down the task into smaller steps").`
                : "ValorIDE uses complex prompts and iterative task execution that may be challenging for less capable models. For best results, it's recommended to use Claude 3.7 Sonnet for its advanced agentic coding capabilities.");
            if (response === "messageResponse") {
                userContent.push(...[
                    {
                        type: "text",
                        text: formatResponse.tooManyMistakes(text),
                    },
                    ...formatResponse.imageBlocks(images),
                ]);
            }
            this.consecutiveMistakeCount = 0;
        }
        if (this.autoApprovalSettings.enabled &&
            this.consecutiveAutoApprovedRequestsCount >=
                this.autoApprovalSettings.maxRequests) {
            if (this.autoApprovalSettings.enableNotifications) {
                showSystemNotification({
                    subtitle: "Max Requests Reached",
                    message: `ValorIDE has auto-approved ${this.autoApprovalSettings.maxRequests.toString()} API requests.`,
                });
            }
            await this.ask("auto_approval_max_req_reached", `ValorIDE has auto-approved ${this.autoApprovalSettings.maxRequests.toString()} API requests. Would you like to reset the count and proceed with the task?`);
            // if we get past the promise it means the user approved and did not start a new task
            this.consecutiveAutoApprovedRequestsCount = 0;
        }
        // get previous api req's index to check token usage and determine if we need to truncate conversation history
        const previousApiReqIndex = findLastIndex(this.valorideMessages, (m) => m.say === "api_req_started");
        // Optional: Pause if budget limit reached
        try {
            const limit = this.chatSettings?.budgetLimit;
            if (typeof limit === "number" && limit >= 0) {
                const apiMetrics = getApiMetrics(combineApiRequests(combineCommandSequences(this.valorideMessages)));
                if (apiMetrics.totalCost >= limit) {
                    vscode.window.showWarningMessage(`Budget limit reached ($${limit.toFixed(2)}). Task paused. Increase the budget to continue.`);
                    return true; // end loop without sending a new API call
                }
            }
        }
        catch (e) {
            // Non-fatal: budget check issues shouldn't break the task
            console.error("Budget check failed:", e);
        }
        // Optional: throttle between API calls
        const delay = this.chatSettings?.apiThrottleMs;
        if (typeof delay === "number" && delay > 0) {
            await new Promise((r) => setTimeout(r, delay));
        }
        // Save checkpoint if this is the first API request
        const isFirstRequest = this.valorideMessages.filter((m) => m.say === "api_req_started")
            .length === 0;
        if (isFirstRequest) {
            await this.say("checkpoint_created"); // no hash since we need to wait for CheckpointTracker to be initialized
        }
        // getting verbose details is an expensive operation, it uses globby to top-down build file structure of project which for large projects can take a few seconds
        // for the best UX we show a placeholder api_req_started message with a loading spinner as this happens
        await this.say("api_req_started", JSON.stringify({
            request: userContent
                .map((block) => formatContentBlockToMarkdown(block))
                .join("\n\n") + "\n\nLoading...",
        }));
        // use this opportunity to initialize the checkpoint tracker (can be expensive to initialize in the constructor)
        // FIXME: right now we're letting users init checkpoints for old tasks, but this could be a problem if opening a task in the wrong workspace
        // isNewTask &&
        if (!this.checkpointTracker && !this.checkpointTrackerErrorMessage) {
            try {
                this.checkpointTracker = await pTimeout(CheckpointTracker.create(this.taskId, this.context.globalStorageUri.fsPath), {
                    milliseconds: 15_000,
                    message: "Checkpoints taking too long to initialize. Consider re-opening ValorIDE in a project that uses git, or disabling checkpoints.",
                });
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                console.error("Failed to initialize checkpoint tracker:", errorMessage);
                this.checkpointTrackerErrorMessage = errorMessage; // will be displayed right away since we saveValorIDEMessages next which posts state to webview
            }
        }
        // Now that checkpoint tracker is initialized, update the dummy checkpoint_created message with the commit hash. (This is necessary since we use the API request loading as an opportunity to initialize the checkpoint tracker, which can take some time)
        if (isFirstRequest) {
            const commitHash = await this.checkpointTracker?.commit();
            const lastCheckpointMessage = findLast(this.valorideMessages, (m) => m.say === "checkpoint_created");
            if (lastCheckpointMessage) {
                lastCheckpointMessage.lastCheckpointHash = commitHash;
                await this.saveValorIDEMessagesAndUpdateHistory();
            }
        }
        const [parsedUserContent, environmentDetails] = await this.loadContext(userContent, includeFileDetails);
        userContent = parsedUserContent;
        // add environment details as its own text block, separate from tool results
        userContent.push({ type: "text", text: environmentDetails });
        await this.addToApiConversationHistory({
            role: "user",
            content: userContent,
        });
        telemetryService.captureConversationTurnEvent(this.taskId, currentProviderId, this.api.getModel().id, "user");
        // since we sent off a placeholder api_req_started message to update the webview while waiting to actually start the API request (to load potential details for example), we need to update the text of that message
        const lastApiReqIndex = findLastIndex(this.valorideMessages, (m) => m.say === "api_req_started");
        this.valorideMessages[lastApiReqIndex].text = JSON.stringify({
            request: userContent
                .map((block) => formatContentBlockToMarkdown(block))
                .join("\n\n"),
        });
        await this.saveValorIDEMessagesAndUpdateHistory();
        await this.postStateToWebview();
        try {
            let cacheWriteTokens = 0;
            let cacheReadTokens = 0;
            let inputTokens = 0;
            let outputTokens = 0;
            let totalCost;
            // update api_req_started. we can't use api_req_finished anymore since it's a unique case where it could come after a streaming message (ie in the middle of being updated or executed)
            // fortunately api_req_finished was always parsed out for the gui anyways, so it remains solely for legacy purposes to keep track of prices in tasks from history
            // (it's worth removing a few months from now)
            const updateApiReqMsg = (cancelReason, streamingFailedMessage) => {
                this.valorideMessages[lastApiReqIndex].text = JSON.stringify({
                    ...JSON.parse(this.valorideMessages[lastApiReqIndex].text || "{}"),
                    tokensIn: inputTokens,
                    tokensOut: outputTokens,
                    cacheWrites: cacheWriteTokens,
                    cacheReads: cacheReadTokens,
                    cost: totalCost ??
                        calculateApiCostAnthropic(this.api.getModel().info, inputTokens, outputTokens, cacheWriteTokens, cacheReadTokens),
                    cancelReason,
                    streamingFailedMessage,
                });
            };
            const abortStream = async (cancelReason, streamingFailedMessage) => {
                if (this.diffViewProvider.isEditing) {
                    await this.diffViewProvider.revertChanges(); // closes diff view
                }
                // if last message is a partial we need to update and save it
                const lastMessage = this.valorideMessages.at(-1);
                if (lastMessage && lastMessage.partial) {
                    // lastMessage.ts = Date.now() DO NOT update ts since it is used as a key for virtuoso list
                    lastMessage.partial = false;
                    // instead of streaming partialMessage events, we do a save and post like normal to persist to disk
                    console.log("updating partial message", lastMessage);
                    // await this.saveValorIDEMessagesAndUpdateHistory()
                }
                // Let assistant know their response was interrupted for when task is resumed
                await this.addToApiConversationHistory({
                    role: "assistant",
                    content: [
                        {
                            type: "text",
                            text: assistantMessage +
                                `\n\n[${cancelReason === "streaming_failed"
                                    ? "Response interrupted by API Error"
                                    : "Response interrupted by user"}]`,
                        },
                    ],
                });
                // update api_req_started to have cancelled and cost, so that we can display the cost of the partial stream
                updateApiReqMsg(cancelReason, streamingFailedMessage);
                await this.saveValorIDEMessagesAndUpdateHistory();
                telemetryService.captureConversationTurnEvent(this.taskId, currentProviderId, this.api.getModel().id, "assistant");
                // signals to provider that it can retrieve the saved messages from disk, as abortTask can not be awaited on in nature
                this.didFinishAbortingStream = true;
            };
            // reset streaming state
            await this.resetStreamingState();
            const stream = this.attemptApiRequest(previousApiReqIndex); // yields only if the first chunk is successful, otherwise will allow the user to retry the request (most likely due to rate limit error, which gets thrown on the first chunk)
            let assistantMessage = "";
            let reasoningMessage = "";
            this.isStreaming = true;
            let didReceiveUsageChunk = false;
            try {
                for await (const chunk of stream) {
                    if (!chunk) {
                        continue;
                    }
                    switch (chunk.type) {
                        case "usage":
                            didReceiveUsageChunk = true;
                            inputTokens += chunk.inputTokens;
                            outputTokens += chunk.outputTokens;
                            cacheWriteTokens += chunk.cacheWriteTokens ?? 0;
                            cacheReadTokens += chunk.cacheReadTokens ?? 0;
                            totalCost = chunk.totalCost;
                            break;
                        case "reasoning":
                            // reasoning will always come before assistant message
                            reasoningMessage += chunk.reasoning;
                            // fixes bug where cancelling task > aborts task > for loop may be in middle of streaming reasoning > say function throws error before we get a chance to properly clean up and cancel the task.
                            if (!this.abort) {
                                await this.say("reasoning", reasoningMessage, undefined, true);
                            }
                            break;
                        case "text":
                            if (reasoningMessage && assistantMessage.length === 0) {
                                // complete reasoning message
                                await this.say("reasoning", reasoningMessage, undefined, false);
                            }
                            assistantMessage += chunk.text;
                            // parse raw assistant message into content blocks
                            const prevLength = this.assistantMessageContent.length;
                            this.assistantMessageContent =
                                parseAssistantMessage(assistantMessage);
                            if (this.assistantMessageContent.length > prevLength) {
                                this.userMessageContentReady = false; // new content we need to present, reset to false in case previous content set this to true
                            }
                            // present content to user
                            await this.processAssistantBlocks();
                            break;
                    }
                    if (this.abort) {
                        console.log("aborting stream...");
                        if (!this.abandoned) {
                            // only need to gracefully abort if this instance isn't abandoned (sometimes openrouter stream hangs, in which case this would affect future instances of valoride)
                            await abortStream("user_cancelled");
                        }
                        break; // aborts the stream
                    }
                    if (this.didRejectTool) {
                        // userContent has a tool rejection, so interrupt the assistant's response to present the user's feedback
                        assistantMessage += "\n\n[Response interrupted by user feedback]";
                        // this.userMessageContentReady = true // instead of setting this preemptively, we allow the present iterator to finish and set userMessageContentReady when its ready
                        break;
                    }
                    // PREV: we need to let the request finish for openrouter to get generation details
                    // UPDATE: it's better UX to interrupt the request at the cost of the api cost not being retrieved
                    if (this.didAlreadyUseTool) {
                        assistantMessage +=
                            "\n\n[Response interrupted by a tool use result. Only one tool may be used at a time and should be placed at the end of the message.]";
                        break;
                    }
                }
            }
            catch (error) {
                // abandoned happens when extension is no longer waiting for the valoride instance to finish aborting (error is thrown here when any function in the for loop throws due to this.abort)
                if (!this.abandoned) {
                    this.abortTask(); // if the stream failed, there's various states the task could be in (i.e. could have streamed some tools the user may have executed), so we just resort to replicating a cancel task
                    const errorMessage = this.formatErrorWithStatusCode(error);
                    await abortStream("streaming_failed", errorMessage);
                    await this.reinitExistingTaskFromId(this.taskId);
                }
            }
            finally {
                this.isStreaming = false;
            }
            // OpenRouter/ValorIDE may not return token usage as part of the stream (since it may abort early), so we fetch after the stream is finished
            // (updateApiReq below will update the api_req_started message with the usage details. we do this async so it updates the api_req_started message in the background)
            if (!didReceiveUsageChunk) {
                this.api.getApiStreamUsage?.().then(async (apiStreamUsage) => {
                    if (apiStreamUsage) {
                        inputTokens += apiStreamUsage.inputTokens;
                        outputTokens += apiStreamUsage.outputTokens;
                        cacheWriteTokens += apiStreamUsage.cacheWriteTokens ?? 0;
                        cacheReadTokens += apiStreamUsage.cacheReadTokens ?? 0;
                        totalCost = apiStreamUsage.totalCost;
                    }
                    updateApiReqMsg();
                    await this.saveValorIDEMessagesAndUpdateHistory();
                    await this.postStateToWebview();
                    // Track usage and update balance on server via webview
                    try {
                        const { trackApiUsageWithPricing } = await import("../../api/usage-tracking");
                        await trackApiUsageWithPricing(currentProviderId, this.api.getModel().id, inputTokens, outputTokens);
                    }
                    catch (err) {
                        console.error("Failed to track usage after stream (fetch path):", err);
                    }
                    try {
                        const { WebviewProvider } = await import("../webview/index");
                        WebviewProvider.getVisibleInstance()?.getUsageTrackingService().requestBalance();
                    }
                    catch { }
                });
            }
            // need to call here in case the stream was aborted
            if (this.abort) {
                throw new Error("ValorIDE instance aborted");
            }
            this.didCompleteReadingStream = true;
            // set any blocks to be complete to allow processAssistantBlocks to finish and set userMessageContentReady to true
            // (could be a text block that had no subsequent tool uses, or a text block at the very end, or an invalid tool use, etc. whatever the case, processAssistantBlocks relies on these blocks either to be completed or the user to reject a block in order to proceed and eventually set userMessageContentReady to true)
            const partialBlocks = this.assistantMessageContent.filter((block) => block.partial);
            partialBlocks.forEach((block) => {
                block.partial = false;
            });
            // this.assistantMessageContent.forEach((e) => (e.partial = false)) // can't just do this bc a tool could be in the middle of executing ()
            if (partialBlocks.length > 0) {
                await this.processAssistantBlocks(); // if there is content to update then it will complete and update this.userMessageContentReady to true, which we pwaitfor before making the next request. all this is really doing is presenting the last partial message that we just set to complete
            }
            updateApiReqMsg();
            await this.saveValorIDEMessagesAndUpdateHistory();
            await this.postStateToWebview();
            // Track usage and update balance on server via webview
            try {
                const { trackApiUsageWithPricing } = await import("../../api/usage-tracking");
                await trackApiUsageWithPricing(currentProviderId, this.api.getModel().id, inputTokens, outputTokens);
            }
            catch (err) {
                console.error("Failed to track usage after stream:", err);
            }
            try {
                const { WebviewProvider } = await import("../webview/index");
                WebviewProvider.getVisibleInstance()?.getUsageTrackingService().requestBalance();
            }
            catch { }
            // now add to apiconversationhistory
            // need to save assistant responses to file before proceeding to tool use since user can exit at any moment and we wouldn't be able to save the assistant's response
            let didEndLoop = false;
            if (assistantMessage.length > 0) {
                telemetryService.captureConversationTurnEvent(this.taskId, currentProviderId, this.api.getModel().id, "assistant");
                await this.addToApiConversationHistory({
                    role: "assistant",
                    content: [{ type: "text", text: assistantMessage }],
                });
                // Send websocket message after every API response if communicationService is available
                if (this.communicationService) {
                    try {
                        this.communicationService.sendMessage("api_action", {
                            taskId: this.taskId,
                            message: assistantMessage,
                            timestamp: Date.now(),
                        });
                    }
                    catch (err) {
                        // Log but do not throw
                        console.warn("Failed to send websocket message for API action:", err);
                    }
                }
                // NOTE: this comment is here for future reference - this was a workaround for userMessageContent not getting set to true. It was due to it not recursively calling for partial blocks when didRejectTool, so it would get stuck waiting for a partial block to complete before it could continue.
                // in case the content blocks finished
                // it may be the api stream finished after the last parsed content block was executed, so  we are able to detect out of bounds and set userMessageContentReady to true (note you should not call processAssistantBlocks since if the last block is completed it will be presented again)
                // const completeBlocks = this.assistantMessageContent.filter((block) => !block.partial) // if there are any partial blocks after the stream ended we can consider them invalid
                // if (this.currentStreamingContentIndex >= completeBlocks.length) {
                // 	this.userMessageContentReady = true
                // }
                await pWaitFor(() => this.userMessageContentReady);
                // if the model did not tool use, then we need to tell it to either use a tool or attempt_completion
                const didToolUse = this.assistantMessageContent.some((block) => block.type === "tool_use");
                if (!didToolUse) {
                    // normal request where tool use is required
                    this.userMessageContent.push({
                        type: "text",
                        text: formatResponse.noToolsUsed(),
                    });
                    this.consecutiveMistakeCount++;
                }
                const recDidEndLoop = await this.recursivelyMakeValorIDERequests(this.userMessageContent);
                didEndLoop = recDidEndLoop;
            }
            else {
                // if there's no assistant_responses, that means we got no text or tool_use content blocks from API which we should assume is an error
                await this.say("error", "Unexpected API Response: The language model did not provide any assistant messages. This may indicate an issue with the API or the model's output.");
                await this.addToApiConversationHistory({
                    role: "assistant",
                    content: [
                        {
                            type: "text",
                            text: "Failure: I did not provide a response.",
                        },
                    ],
                });
            }
            return didEndLoop; // will always be false for now
        }
        catch (error) {
            // this should never happen since the only thing that can throw an error is the attemptApiRequest, which is wrapped in a try catch that sends an ask where if noButtonClicked, will clear current task and destroy this instance. However to avoid unhandled promise rejection, we will end this loop which will end execution of this instance (see startTask)
            return true; // needs to be true so parent loop knows to end task
        }
    }
    async loadContext(userContent, includeFileDetails = false) {
        return await Promise.all([
            // This is a temporary solution to dynamically load context mentions from tool results. It checks for the presence of tags that indicate that the tool was rejected and feedback was provided (see formatToolDeniedFeedback, attemptCompletion, executeCommand, and consecutiveMistakeCount >= 3) or "<answer>" (see askFollowupQuestion), we place all user generated content in these tags so they can effectively be used as markers for when we should parse mentions). However if we allow multiple tools responses in the future, we will need to parse mentions specifically within the user content tags.
            // (Note: this caused the @/ import alias bug where file contents were being parsed as well, since v2 converted tool results to text blocks)
            Promise.all(userContent.map(async (block) => {
                if (block.type === "text") {
                    // We need to ensure any user generated content is wrapped in one of these tags so that we know to parse mentions
                    // FIXME: Only parse text in between these tags instead of the entire text block which may contain other tool results. This is part of a larger issue where we shouldn't be using regex to parse mentions in the first place (ie for cases where file paths have spaces)
                    if (block.text.includes("<feedback>") ||
                        block.text.includes("<answer>") ||
                        block.text.includes("<task>") ||
                        block.text.includes("<user_message>")) {
                        let parsedText = await parseMentions(block.text, cwd, this.urlContentFetcher, this.fileContextTracker);
                        // when parsing slash commands, we still want to allow the user to provide their desired context
                        parsedText = parseSlashCommands(parsedText);
                        return {
                            ...block,
                            text: parsedText,
                        };
                    }
                }
                return block;
            })),
            this.getEnvironmentDetails(includeFileDetails),
        ]);
    }
    async getEnvironmentDetails(includeFileDetails = false) {
        let details = "";
        // It could be useful for valoride to know if the user went from one or no file to another between messages, so we always include this context
        details += "\n\n# VSCode Visible Files";
        const visibleFilePaths = vscode.window.visibleTextEditors
            ?.map((editor) => editor.document?.uri?.fsPath)
            .filter(Boolean)
            .map((absolutePath) => path.relative(cwd, absolutePath));
        // Filter paths through valorideIgnoreController
        const allowedVisibleFiles = this.valorideIgnoreController
            .filterPaths(visibleFilePaths)
            .map((p) => p.toPosix())
            .join("\n");
        if (allowedVisibleFiles) {
            details += `\n${allowedVisibleFiles}`;
        }
        else {
            details += "\n(No visible files)";
        }
        details += "\n\n# VSCode Open Tabs";
        const openTabPaths = vscode.window.tabGroups.all
            .flatMap((group) => group.tabs)
            .map((tab) => tab.input?.uri?.fsPath)
            .filter(Boolean)
            .map((absolutePath) => path.relative(cwd, absolutePath));
        // Filter paths through valorideIgnoreController
        const allowedOpenTabs = this.valorideIgnoreController
            .filterPaths(openTabPaths)
            .map((p) => p.toPosix())
            .join("\n");
        if (allowedOpenTabs) {
            details += `\n${allowedOpenTabs}`;
        }
        else {
            details += "\n(No open tabs)";
        }
        const busyTerminals = this.terminalManager.getTerminals(true);
        const inactiveTerminals = this.terminalManager.getTerminals(false);
        // const allTerminals = [...busyTerminals, ...inactiveTerminals]
        if (busyTerminals.length > 0 && this.didEditFile) {
            //  || this.didEditFile
            await setTimeoutPromise(300); // delay after saving file to let terminals catch up
        }
        // let terminalWasBusy = false
        if (busyTerminals.length > 0) {
            // wait for terminals to cool down
            // terminalWasBusy = allTerminals.some((t) => this.terminalManager.isProcessHot(t.id))
            await pWaitFor(() => busyTerminals.every((t) => !this.terminalManager.isProcessHot(t.id)), {
                interval: 100,
                timeout: 15_000,
            }).catch(() => { });
        }
        // we want to get diagnostics AFTER terminal cools down for a few reasons: terminal could be scaffolding a project, dev servers (compilers like webpack) will first re-compile and then send diagnostics, etc
        /*
        let diagnosticsDetails = ""
        const diagnostics = await this.diagnosticsMonitor.getCurrentDiagnostics(this.didEditFile || terminalWasBusy) // if valoride ran a command (ie npm install) or edited the workspace then wait a bit for updated diagnostics
        for (const [uri, fileDiagnostics] of diagnostics) {
          const problems = fileDiagnostics.filter((d) => d.severity === vscode.DiagnosticSeverity.Error)
          if (problems.length > 0) {
            diagnosticsDetails += `\n## ${path.relative(cwd, uri.fsPath)}`
            for (const diagnostic of problems) {
              // let severity = diagnostic.severity === vscode.DiagnosticSeverity.Error ? "Error" : "Warning"
              const line = diagnostic.range.start.line + 1 // VSCode lines are 0-indexed
              const source = diagnostic.source ? `[${diagnostic.source}] ` : ""
              diagnosticsDetails += `\n- ${source}Line ${line}: ${diagnostic.message}`
            }
          }
        }
        */
        this.didEditFile = false; // reset, this lets us know when to wait for saved files to update terminals
        // waiting for updated diagnostics lets terminal output be the most up-to-date possible
        let terminalDetails = "";
        if (busyTerminals.length > 0) {
            // terminals are cool, let's retrieve their output
            terminalDetails += "\n\n# Actively Running Terminals";
            for (const busyTerminal of busyTerminals) {
                terminalDetails += `\n## Original command: \`${busyTerminal.lastCommand}\``;
                const newOutput = this.terminalManager.getUnretrievedOutput(busyTerminal.id);
                if (newOutput) {
                    terminalDetails += `\n### New Output\n${newOutput}`;
                }
                else {
                    // details += `\n(Still running, no new output)` // don't want to show this right after running the command
                }
            }
        }
        // only show inactive terminals if there's output to show
        if (inactiveTerminals.length > 0) {
            const inactiveTerminalOutputs = new Map();
            for (const inactiveTerminal of inactiveTerminals) {
                const newOutput = this.terminalManager.getUnretrievedOutput(inactiveTerminal.id);
                if (newOutput) {
                    inactiveTerminalOutputs.set(inactiveTerminal.id, newOutput);
                }
            }
            if (inactiveTerminalOutputs.size > 0) {
                terminalDetails += "\n\n# Inactive Terminals";
                for (const [terminalId, newOutput] of inactiveTerminalOutputs) {
                    const inactiveTerminal = inactiveTerminals.find((t) => t.id === terminalId);
                    if (inactiveTerminal) {
                        terminalDetails += `\n## ${inactiveTerminal.lastCommand}`;
                        terminalDetails += `\n### New Output\n${newOutput}`;
                    }
                }
            }
        }
        // details += "\n\n# VSCode Workspace Errors"
        // if (diagnosticsDetails) {
        // 	details += diagnosticsDetails
        // } else {
        // 	details += "\n(No errors detected)"
        // }
        if (terminalDetails) {
            details += terminalDetails;
        }
        // Add recently modified files section
        const recentlyModifiedFiles = this.fileContextTracker.getAndClearRecentlyModifiedFiles();
        if (recentlyModifiedFiles.length > 0) {
            details +=
                "\n\n# Recently Modified Files\nThese files have been modified since you last accessed them (file was just edited so you may need to re-read it before editing):";
            for (const filePath of recentlyModifiedFiles) {
                details += `\n${filePath}`;
            }
        }
        // Add current time information with timezone
        const now = new Date();
        const formatter = new Intl.DateTimeFormat(undefined, {
            year: "numeric",
            month: "numeric",
            day: "numeric",
            hour: "numeric",
            minute: "numeric",
            second: "numeric",
            hour12: true,
        });
        const timeZone = formatter.resolvedOptions().timeZone;
        const timeZoneOffset = -now.getTimezoneOffset() / 60; // Convert to hours and invert sign to match conventional notation
        const timeZoneOffsetStr = `${timeZoneOffset >= 0 ? "+" : ""}${timeZoneOffset}:00`;
        details += `\n\n# Current Time\n${formatter.format(now)} (${timeZone}, UTC${timeZoneOffsetStr})`;
        if (includeFileDetails) {
            details += `\n\n# Current Working Directory (${cwd.toPosix()}) Files\n`;
            const isDesktop = arePathsEqual(cwd, path.join(os.homedir(), "Desktop"));
            if (isDesktop) {
                // don't want to immediately access desktop since it would show permission popup
                details +=
                    "(Desktop files not shown automatically. Use list_files to explore if needed.)";
            }
            else {
                const [files, didHitLimit] = await listFiles(cwd, true, 200);
                const result = formatResponse.formatFilesList(cwd, files, didHitLimit, this.valorideIgnoreController);
                details += result;
            }
        }
        // Add context window usage information
        const { contextWindow, maxAllowedSize } = getContextWindowInfo(this.api);
        // Get the token count from the most recent API request to accurately reflect context management
        const getTotalTokensFromApiReqMessage = (msg) => {
            if (!msg.text) {
                return 0;
            }
            try {
                const { tokensIn, tokensOut, cacheWrites, cacheReads } = JSON.parse(msg.text);
                return ((tokensIn || 0) +
                    (tokensOut || 0) +
                    (cacheWrites || 0) +
                    (cacheReads || 0));
            }
            catch (e) {
                return 0;
            }
        };
        const modifiedMessages = combineApiRequests(combineCommandSequences(this.valorideMessages.slice(1)));
        const lastApiReqMessage = findLast(modifiedMessages, (msg) => {
            if (msg.say !== "api_req_started") {
                return false;
            }
            return getTotalTokensFromApiReqMessage(msg) > 0;
        });
        const lastApiReqTotalTokens = lastApiReqMessage
            ? getTotalTokensFromApiReqMessage(lastApiReqMessage)
            : 0;
        const usagePercentage = Math.round((lastApiReqTotalTokens / contextWindow) * 100);
        details += "\n\n# Context Window Usage";
        details += `\n${lastApiReqTotalTokens.toLocaleString()} / ${(contextWindow / 1000).toLocaleString()}K tokens used (${usagePercentage}%)`;
        details += "\n\n# Current Mode";
        if (this.chatSettings.mode === "plan") {
            details += "\nPLAN MODE\n" + formatResponse.planModeInstructions();
        }
        else {
            details += "\nACT MODE";
        }
        return `<environment_details>\n${details.trim()}\n</environment_details>`;
    }
}
//# sourceMappingURL=index.js.map