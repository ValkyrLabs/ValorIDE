import * as vscode from "vscode";
import CheckpointTracker from "@integrations/checkpoints/CheckpointTracker";
import { DIFF_VIEW_URI_SCHEME } from "@integrations/editor/DiffViewProvider";
import { findLast, findLastIndex } from "@shared/array";
import { getApiMetrics } from "@shared/getApiMetrics";
import { combineApiRequests } from "@shared/combineApiRequests";
import { combineCommandSequences } from "@shared/combineCommandSequences";
export class CheckpointManager {
    taskId;
    context;
    valorideMessages;
    apiConversationHistory;
    conversationHistoryDeletedRange;
    contextManager;
    say;
    postMessageToWebview;
    postStateToWebview;
    updateTaskHistory;
    reinitExistingTaskFromId;
    cancelTask;
    overwriteApiConversationHistory;
    overwriteValorIDEMessages;
    saveValorIDEMessagesAndUpdateHistory;
    ensureTaskDirectoryExists;
    checkpointTracker;
    checkpointTrackerErrorMessage;
    constructor(taskId, context, valorideMessages, apiConversationHistory, conversationHistoryDeletedRange, contextManager, say, postMessageToWebview, postStateToWebview, updateTaskHistory, reinitExistingTaskFromId, cancelTask, overwriteApiConversationHistory, overwriteValorIDEMessages, saveValorIDEMessagesAndUpdateHistory, ensureTaskDirectoryExists) {
        this.taskId = taskId;
        this.context = context;
        this.valorideMessages = valorideMessages;
        this.apiConversationHistory = apiConversationHistory;
        this.conversationHistoryDeletedRange = conversationHistoryDeletedRange;
        this.contextManager = contextManager;
        this.say = say;
        this.postMessageToWebview = postMessageToWebview;
        this.postStateToWebview = postStateToWebview;
        this.updateTaskHistory = updateTaskHistory;
        this.reinitExistingTaskFromId = reinitExistingTaskFromId;
        this.cancelTask = cancelTask;
        this.overwriteApiConversationHistory = overwriteApiConversationHistory;
        this.overwriteValorIDEMessages = overwriteValorIDEMessages;
        this.saveValorIDEMessagesAndUpdateHistory = saveValorIDEMessagesAndUpdateHistory;
        this.ensureTaskDirectoryExists = ensureTaskDirectoryExists;
    }
    async initializeCheckpointTracker() {
        if (!this.checkpointTracker && !this.checkpointTrackerErrorMessage) {
            try {
                this.checkpointTracker = await CheckpointTracker.create(this.taskId, this.context.globalStorageUri.fsPath);
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                console.error("Failed to initialize checkpoint tracker:", errorMessage);
                this.checkpointTrackerErrorMessage = errorMessage;
            }
        }
    }
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
        }
        else {
            // attempt completion requires checkpoint to be sync so that we can present button after attempt_completion
            const commitHash = await this.checkpointTracker?.commit();
            // For attempt_completion, find the last completion_result message and set its checkpoint hash
            const lastCompletionResultMessage = findLast(this.valorideMessages, (m) => m.say === "completion_result" || m.ask === "completion_result");
            if (lastCompletionResultMessage) {
                lastCompletionResultMessage.lastCheckpointHash = commitHash;
                await this.saveValorIDEMessagesAndUpdateHistory();
            }
        }
    }
    async restoreCheckpoint(messageTs, restoreType, offset) {
        const messageIndex = this.valorideMessages.findIndex((m) => m.ts === messageTs) - (offset || 0);
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
                    const newConversationHistory = this.apiConversationHistory.slice(0, (message.conversationHistoryIndex || 0) + 2);
                    await this.overwriteApiConversationHistory(newConversationHistory);
                    // update the context history state
                    await this.contextManager.truncateContextHistory(message.ts, await this.ensureTaskDirectoryExists());
                    // aggregate deleted api reqs info so we don't lose costs/tokens
                    const deletedMessages = this.valorideMessages.slice(messageIndex + 1);
                    const deletedApiReqsMetrics = getApiMetrics(combineApiRequests(combineCommandSequences(deletedMessages)));
                    const newValorIDEMessages = this.valorideMessages.slice(0, messageIndex + 1);
                    await this.overwriteValorIDEMessages(newValorIDEMessages);
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
                const checkpointMessages = this.valorideMessages.filter((m) => m.say === "checkpoint_created");
                const currentMessageIndex = checkpointMessages.findIndex((m) => m.ts === messageTs);
                // Set isCheckpointCheckedOut to false for all checkpoint messages
                checkpointMessages.forEach((m, i) => {
                    m.isCheckpointCheckedOut = i === currentMessageIndex;
                });
            }
            await this.saveValorIDEMessagesAndUpdateHistory();
            await this.postMessageToWebview({ type: "relinquishControl" });
            this.cancelTask();
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
                const lastTaskCompletedMessageCheckpointHash = findLast(this.valorideMessages.slice(0, messageIndex), (m) => m.say === "completion_result")?.lastCheckpointHash;
                const firstCheckpointMessageCheckpointHash = this.valorideMessages.find((m) => m.say === "checkpoint_created")?.lastCheckpointHash;
                const previousCheckpointHash = lastTaskCompletedMessageCheckpointHash || firstCheckpointMessageCheckpointHash;
                if (!previousCheckpointHash) {
                    vscode.window.showErrorMessage("Unexpected error: No checkpoint hash found");
                    relinquishButton();
                    return;
                }
                changedFiles = await this.checkpointTracker?.getDiffSet(previousCheckpointHash, hash);
                if (!changedFiles?.length) {
                    vscode.window.showInformationMessage("No changes found");
                    relinquishButton();
                    return;
                }
            }
            else {
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
        // Open multi-diff editor
        await vscode.commands.executeCommand("vscode.changes", seeNewChangesSinceLastTaskCompletion ? "New changes" : "Changes since snapshot", changedFiles.map((file) => [
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
    async doesLatestTaskCompletionHaveNewChanges() {
        const messageIndex = findLastIndex(this.valorideMessages, (m) => m.say === "completion_result");
        const message = this.valorideMessages[messageIndex];
        if (!message) {
            console.error("Completion message not found");
            return false;
        }
        const hash = message.lastCheckpointHash;
        if (!hash) {
            console.error("No checkpoint hash found");
            return false;
        }
        if (!this.checkpointTracker && !this.checkpointTrackerErrorMessage) {
            try {
                this.checkpointTracker = await CheckpointTracker.create(this.taskId, this.context.globalStorageUri.fsPath);
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                console.error("Failed to initialize checkpoint tracker:", errorMessage);
                return false;
            }
        }
        const lastTaskCompletedMessage = findLast(this.valorideMessages.slice(0, messageIndex), (m) => m.say === "completion_result");
        try {
            const lastTaskCompletedMessageCheckpointHash = lastTaskCompletedMessage?.lastCheckpointHash;
            const firstCheckpointMessageCheckpointHash = this.valorideMessages.find((m) => m.say === "checkpoint_created")?.lastCheckpointHash;
            const previousCheckpointHash = lastTaskCompletedMessageCheckpointHash || firstCheckpointMessageCheckpointHash;
            if (!previousCheckpointHash) {
                return false;
            }
            const changedFilesCount = (await this.checkpointTracker?.getDiffCount(previousCheckpointHash, hash)) || 0;
            if (changedFilesCount > 0) {
                return true;
            }
        }
        catch (error) {
            console.error("Failed to get diff set:", error);
            return false;
        }
        return false;
    }
    getCheckpointTracker() {
        return this.checkpointTracker;
    }
}
//# sourceMappingURL=CheckpointManager.js.map