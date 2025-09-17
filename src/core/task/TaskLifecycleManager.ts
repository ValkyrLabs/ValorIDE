import * as vscode from "vscode";
import { Anthropic } from "@anthropic-ai/sdk";
import {
  ensureTaskDirectoryExists,
  getSavedApiConversationHistory,
  getSavedValorIDEMessages,
} from "@core/storage/disk";
import { formatResponse } from "@core/prompts/responses";
import { findLastIndex } from "@shared/array";
import {
  ValorIDEAsk,
  ValorIDEApiReqInfo,
  ValorIDEMessage,
} from "@shared/ExtensionMessage";

type UserContent = Array<Anthropic.ContentBlockParam>;

export class TaskLifecycleManager {
  constructor(
    private context: vscode.ExtensionContext,
    private taskId: string,
    private chatSettings: any,
    private contextManager: any,
    private say: (type: string, text?: string, images?: string[], partial?: boolean) => Promise<void>,
    private ask: (type: ValorIDEAsk, text?: string, partial?: boolean) => Promise<any>,
    private postStateToWebview: () => Promise<void>,
    private addToValorIDEMessages: (message: ValorIDEMessage) => Promise<void>,
    private overwriteValorIDEMessages: (messages: ValorIDEMessage[]) => Promise<void>,
    private overwriteApiConversationHistory: (history: Anthropic.MessageParam[]) => Promise<void>,
    private initiateTaskLoop: (userContent: UserContent) => Promise<void>,
  ) {}

  async startTask(task?: string, images?: string[]): Promise<void> {
    // conversationHistory (for API) and valorideMessages (for webview) need to be in sync
    // if the extension process were killed, then on restart the valorideMessages might not be empty, so we need to set it to [] when we create a new ValorIDE client (otherwise webview would show stale messages from previous session)
    await this.postStateToWebview();

    await this.say("text", task, images);

    let imageBlocks: Anthropic.ImageBlockParam[] = formatResponse.imageBlocks(images);
    await this.initiateTaskLoop([
      {
        type: "text",
        text: `<task>\n${task}\n</task>`,
      },
      ...imageBlocks,
    ]);
  }

  async resumeTaskFromHistory(): Promise<void> {
    // UPDATE: we don't need this anymore since most tasks are now created with checkpoints enabled
    const modifiedValorIDEMessages = await getSavedValorIDEMessages(
      this.context,
      this.taskId,
    );

    // Remove any resume messages that may have been added before
    const lastRelevantMessageIndex = findLastIndex(
      modifiedValorIDEMessages,
      (m) => !(m.ask === "resume_task" || m.ask === "resume_completed_task"),
    );
    if (lastRelevantMessageIndex !== -1) {
      modifiedValorIDEMessages.splice(lastRelevantMessageIndex + 1);
    }

    // since we don't use api_req_finished anymore, we need to check if the last api_req_started has a cost value
    const lastApiReqStartedIndex = findLastIndex(
      modifiedValorIDEMessages,
      (m) => m.type === "say" && m.say === "api_req_started",
    );
    if (lastApiReqStartedIndex !== -1) {
      const lastApiReqStarted = modifiedValorIDEMessages[lastApiReqStartedIndex];
      const { cost, cancelReason }: ValorIDEApiReqInfo = JSON.parse(
        lastApiReqStarted.text || "{}",
      );
      if (cost === undefined && cancelReason === undefined) {
        modifiedValorIDEMessages.splice(lastApiReqStartedIndex, 1);
      }
    }

    await this.overwriteValorIDEMessages(modifiedValorIDEMessages);

    // Now present the valoride messages to the user and ask if they want to resume
    const apiConversationHistory = await getSavedApiConversationHistory(
      this.context,
      this.taskId,
    );

    // load the context history state
    await this.contextManager.initializeContextHistory(
      await ensureTaskDirectoryExists(this.context, this.taskId),
    );

    const lastValorIDEMessage = modifiedValorIDEMessages
      .slice()
      .reverse()
      .find(
        (m) => !(m.ask === "resume_task" || m.ask === "resume_completed_task"),
      );

    let askType: ValorIDEAsk;
    if (lastValorIDEMessage?.ask === "completion_result") {
      askType = "resume_completed_task";
    } else {
      askType = "resume_task";
    }

    const { response, text, images } = await this.ask(askType);
    let responseText: string | undefined;
    let responseImages: string[] | undefined;
    if (response === "messageResponse") {
      await this.say("user_feedback", text, images);
      responseText = text;
      responseImages = images;
    }

    // Prepare user content for continuation
    let modifiedOldUserContent: UserContent;
    let modifiedApiConversationHistory: Anthropic.Messages.MessageParam[];
    
    if (apiConversationHistory.length > 0) {
      const lastMessage = apiConversationHistory[apiConversationHistory.length - 1];
      if (lastMessage.role === "assistant") {
        modifiedApiConversationHistory = [...apiConversationHistory];
        modifiedOldUserContent = [];
      } else if (lastMessage.role === "user") {
        const existingUserContent: UserContent = Array.isArray(lastMessage.content)
          ? lastMessage.content
          : [{ type: "text", text: lastMessage.content }];
        modifiedApiConversationHistory = apiConversationHistory.slice(0, -1);
        modifiedOldUserContent = [...existingUserContent];
      } else {
        throw new Error("Unexpected: Last message is not a user or assistant message");
      }
    } else {
      throw new Error("Unexpected: No existing API conversation history");
    }

    let newUserContent: UserContent = [...modifiedOldUserContent];

    const agoText = this.getAgoText(lastValorIDEMessage?.ts);
    const wasRecent = lastValorIDEMessage?.ts && Date.now() - lastValorIDEMessage.ts < 30_000;

    const [taskResumptionMessage, userResponseMessage] = formatResponse.taskResumption(
      this.chatSettings?.mode === "plan" ? "plan" : "act",
      agoText,
      process.cwd(), // Using process.cwd() as placeholder for cwd
      wasRecent,
      responseText,
    );

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

  private getAgoText(timestamp?: number): string {
    const now = Date.now();
    const diff = now - (timestamp ?? now);
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
  }
}
