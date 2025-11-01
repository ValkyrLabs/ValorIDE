import * as vscode from "vscode";
import CheckpointTracker from "@integrations/checkpoints/CheckpointTracker";
import { DIFF_VIEW_URI_SCHEME } from "@integrations/editor/DiffViewProvider";
import { ValorIDECheckpointRestore } from "@shared/WebviewMessage";
import { findLast, findLastIndex } from "@shared/array";
import { MessageHandler } from "./MessageHandler";

/**
 * Handles checkpoint creation, restoration, and diff operations
 */
export class CheckpointHandler {
  private checkpointTracker?: CheckpointTracker;
  checkpointTrackerErrorMessage?: string;
  
  constructor(
    private taskId: string,
    private context: vscode.ExtensionContext,
    private messageHandler: MessageHandler,
    private updateTaskHistory: (historyItem: any) => Promise<any[]>,
    private postStateToWebview: () => Promise<void>,
    private postMessageToWebview: (message: any) => Promise<void>,
    private reinitExistingTaskFromId: (taskId: string) => Promise<void>,
    private cancelTask: () => Promise<void>,
    private saveValorIDEMessagesAndUpdateHistory: () => Promise<void>
  ) {}

  getCheckpointTracker(): CheckpointTracker | undefined {
    return this.checkpointTracker;
  }

  setCheckpointTracker(tracker: CheckpointTracker | undefined): void {
    this.checkpointTracker = tracker;
  }

  getCheckpointTrackerErrorMessage(): string | undefined {
    return this.checkpointTrackerErrorMessage;
  }

  setCheckpointTrackerErrorMessage(message: string | undefined): void {
    this.checkpointTrackerErrorMessage = message;
  }

  async initializeCheckpointTracker(): Promise<void> {
    if (!this.checkpointTracker && !this.checkpointTrackerErrorMessage) {
      try {
        this.checkpointTracker = await CheckpointTracker.create(
          this.taskId,
          this.context.globalStorageUri.fsPath,
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error("Failed to initialize checkpoint tracker:", errorMessage);
        this.checkpointTrackerErrorMessage = errorMessage;
        await this.postStateToWebview();
        vscode.window.showErrorMessage(errorMessage);
      }
    }
  }

  async saveCheckpoint(isAttemptCompletionMessage: boolean = false): Promise<void> {
    const valorideMessages = this.messageHandler.getValorIDEMessages();
    
    // Set isCheckpointCheckedOut to false for all checkpoint_created messages
    valorideMessages.forEach((message) => {
      if (message.say === "checkpoint_created") {
        message.isCheckpointCheckedOut = false;
      }
    });

    if (!isAttemptCompletionMessage) {
      // ensure we aren't creating a duplicate checkpoint
      const lastMessage = valorideMessages.at(-1);
      if (lastMessage?.say === "checkpoint_created") {
        return;
      }

      // For non-attempt completion we just say checkpoints
      await this.messageHandler.say("checkpoint_created");
      this.checkpointTracker?.commit().then(async (commitHash) => {
        const lastCheckpointMessage = findLast(
          valorideMessages,
          (m) => m.say === "checkpoint_created",
        );
        if (lastCheckpointMessage) {
          lastCheckpointMessage.lastCheckpointHash = commitHash;
          await this.saveValorIDEMessagesAndUpdateHistory();
        }
      }); // silently fails for now
    } else {
      // attempt completion requires checkpoint to be sync so that we can present button after attempt_completion
      const commitHash = await this.checkpointTracker?.commit();
      // For attempt_completion, find the last completion_result message and set its checkpoint hash. This will be used to present the 'see new changes' button
      const lastCompletionResultMessage = findLast(
        valorideMessages,
        (m) => m.say === "completion_result" || m.ask === "completion_result",
      );
      if (lastCompletionResultMessage) {
        lastCompletionResultMessage.lastCheckpointHash = commitHash;
        await this.saveValorIDEMessagesAndUpdateHistory();
      }
    }
  }

  async restoreCheckpoint(
    messageTs: number,
    restoreType: ValorIDECheckpointRestore,
    offset?: number,
  ): Promise<void> {
    const valorideMessages = this.messageHandler.getValorIDEMessages();
    const messageIndex =
      valorideMessages.findIndex((m) => m.ts === messageTs) -
      (offset || 0);
    // Find the last message before messageIndex that has a lastCheckpointHash
    const lastHashIndex = findLastIndex(
      valorideMessages.slice(0, messageIndex),
      (m) => m.lastCheckpointHash !== undefined,
    );
    const message = valorideMessages[messageIndex];
    const lastMessageWithHash = valorideMessages[lastHashIndex];

    if (!message) {
      console.error("Message not found", valorideMessages);
      return;
    }

    let didWorkspaceRestoreFail = false;

    switch (restoreType) {
      case "task":
        break;
      case "taskAndWorkspace":
      case "workspace":
        await this.initializeCheckpointTracker();
        if (message.lastCheckpointHash && this.checkpointTracker) {
          try {
            await this.checkpointTracker.resetHead(message.lastCheckpointHash);
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : "Unknown error";
            vscode.window.showErrorMessage(
              "Failed to restore checkpoint: " + errorMessage,
            );
            didWorkspaceRestoreFail = true;
          }
        } else if (
          offset &&
          lastMessageWithHash.lastCheckpointHash &&
          this.checkpointTracker
        ) {
          try {
            await this.checkpointTracker.resetHead(
              lastMessageWithHash.lastCheckpointHash,
            );
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : "Unknown error";
            vscode.window.showErrorMessage(
              "Failed to restore offset checkpoint: " + errorMessage,
            );
            didWorkspaceRestoreFail = true;
          }
        }
        break;
    }

    if (!didWorkspaceRestoreFail) {
      switch (restoreType) {
        case "task":
        case "taskAndWorkspace":
          // Handle task restoration logic here
          // This would need access to conversation history and other task state
          break;
        case "workspace":
          break;
      }

      if (restoreType !== "task") {
        // Set isCheckpointCheckedOut flag on the message
        const checkpointMessages = valorideMessages.filter(
          (m) => m.say === "checkpoint_created",
        );
        const currentMessageIndex = checkpointMessages.findIndex(
          (m) => m.ts === messageTs,
        );

        // Set isCheckpointCheckedOut to false for all checkpoint messages
        checkpointMessages.forEach((m, i) => {
          m.isCheckpointCheckedOut = i === currentMessageIndex;
        });
      }

      await this.saveValorIDEMessagesAndUpdateHistory();

      await this.postMessageToWebview({ type: "relinquishControl" });

      this.cancelTask();
    } else {
      await this.postMessageToWebview({ type: "relinquishControl" });
    }
  }

  async presentMultifileDiff(
    messageTs: number,
    seeNewChangesSinceLastTaskCompletion: boolean,
  ): Promise<void> {
    const relinquishButton = () => {
      this.postMessageToWebview({ type: "relinquishControl" });
    };

    const valorideMessages = this.messageHandler.getValorIDEMessages();
    console.log("presentMultifileDiff", messageTs);
    const messageIndex = valorideMessages.findIndex(
      (m) => m.ts === messageTs,
    );
    const message = valorideMessages[messageIndex];
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

    await this.initializeCheckpointTracker();

    let changedFiles:
      | {
          relativePath: string;
          absolutePath: string;
          before: string;
          after: string;
        }[]
      | undefined;

    try {
      if (seeNewChangesSinceLastTaskCompletion) {
        // Get last task completed
        const lastTaskCompletedMessageCheckpointHash = findLast(
          valorideMessages.slice(0, messageIndex),
          (m) => m.say === "completion_result",
        )?.lastCheckpointHash;
        
        const firstCheckpointMessageCheckpointHash = valorideMessages.find(
          (m) => m.say === "checkpoint_created",
        )?.lastCheckpointHash;

        const previousCheckpointHash =
          lastTaskCompletedMessageCheckpointHash ||
          firstCheckpointMessageCheckpointHash;

        if (!previousCheckpointHash) {
          vscode.window.showErrorMessage(
            "Unexpected error: No checkpoint hash found",
          );
          relinquishButton();
          return;
        }

        changedFiles = await this.checkpointTracker?.getDiffSet(
          previousCheckpointHash,
          hash,
        );
        if (!changedFiles?.length) {
          vscode.window.showInformationMessage("No changes found");
          relinquishButton();
          return;
        }
      } else {
        changedFiles = await this.checkpointTracker?.getDiffSet(hash);
        if (!changedFiles?.length) {
          vscode.window.showInformationMessage("No changes found");
          relinquishButton();
          return;
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      vscode.window.showErrorMessage(
        "Failed to retrieve diff set: " + errorMessage,
      );
      relinquishButton();
      return;
    }

    // Open multi-diff editor
    await vscode.commands.executeCommand(
      "vscode.changes",
      seeNewChangesSinceLastTaskCompletion
        ? "New changes"
        : "Changes since snapshot",
      changedFiles.map((file) => [
        vscode.Uri.file(file.absolutePath),
        vscode.Uri.parse(`${DIFF_VIEW_URI_SCHEME}:${file.relativePath}`).with({
          query: Buffer.from(file.before ?? "").toString("base64"),
        }),
        vscode.Uri.parse(`${DIFF_VIEW_URI_SCHEME}:${file.relativePath}`).with({
          query: Buffer.from(file.after ?? "").toString("base64"),
        }),
      ]),
    );
    relinquishButton();
  }

  async doesLatestTaskCompletionHaveNewChanges(): Promise<boolean> {
    const valorideMessages = this.messageHandler.getValorIDEMessages();
    const messageIndex = findLastIndex(
      valorideMessages,
      (m) => m.say === "completion_result",
    );
    const message = valorideMessages[messageIndex];
    if (!message) {
      console.error("Completion message not found");
      return false;
    }
    const hash = message.lastCheckpointHash;
    if (!hash) {
      console.error("No checkpoint hash found");
      return false;
    }

    await this.initializeCheckpointTracker();

    // Get last task completed
    const lastTaskCompletedMessage = findLast(
      valorideMessages.slice(0, messageIndex),
      (m) => m.say === "completion_result",
    );

    try {
      const lastTaskCompletedMessageCheckpointHash =
        lastTaskCompletedMessage?.lastCheckpointHash;
      
      const firstCheckpointMessageCheckpointHash = valorideMessages.find(
        (m) => m.say === "checkpoint_created",
      )?.lastCheckpointHash;

      const previousCheckpointHash =
        lastTaskCompletedMessageCheckpointHash ||
        firstCheckpointMessageCheckpointHash;

      if (!previousCheckpointHash) {
        return false;
      }

      // Get count of changed files between current state and commit
      const changedFilesCount =
        (await this.checkpointTracker?.getDiffCount(
          previousCheckpointHash,
          hash,
        )) || 0;
      if (changedFilesCount > 0) {
        return true;
      }
    } catch (error) {
      console.error("Failed to get diff set:", error);
      return false;
    }

    return false;
  }
}
