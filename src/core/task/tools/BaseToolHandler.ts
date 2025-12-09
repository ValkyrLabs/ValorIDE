import * as vscode from "vscode";
import { ValorIDEIgnoreController } from "@core/ignore/ValorIDEIgnoreController";
import { FileContextTracker } from "@core/context/context-tracking/FileContextTracker";
import { DiffViewProvider } from "@integrations/editor/DiffViewProvider";
import { TerminalManager } from "@integrations/terminal/TerminalManager";
import { BrowserSession } from "@services/browser/BrowserSession";
import { McpHub } from "@services/mcp/McpHub";
import { UrlContentFetcher } from "@services/browser/UrlContentFetcher";
import WorkspaceTracker from "@integrations/workspace/WorkspaceTracker";
import { Anthropic } from "@anthropic-ai/sdk";
import { AssistantMessageContent } from "@core/assistant-message";
import { ToolDescriptionHelper } from "@core/task/ToolDescriptionHelper";
import { ValorIDEAskResponse } from "@shared/WebviewMessage";
import {
  ValorIDEMessage,
  ValorIDESay,
  ValorIDEAsk,
} from "@shared/ExtensionMessage";
import { AutoApprovalSettings } from "@shared/AutoApprovalSettings";
import { ApiHandler } from "@api/index";
import CheckpointTracker from "@integrations/checkpoints/CheckpointTracker";

export type ToolResponse =
  | string
  | Array<Anthropic.TextBlockParam | Anthropic.ImageBlockParam>;

export interface ToolContext {
  // Core services
  valorideIgnoreController: ValorIDEIgnoreController;
  fileContextTracker: FileContextTracker;
  diffViewProvider: DiffViewProvider;
  terminalManager: TerminalManager;
  browserSession: BrowserSession;
  mcpHub: McpHub;
  urlContentFetcher: UrlContentFetcher;
  workspaceTracker: WorkspaceTracker;
  checkpointTracker?: CheckpointTracker;
  api: ApiHandler;

  // State
  taskId: string;
  cwd: string;
  autoApprovalSettings: AutoApprovalSettings;
  didEditFile: boolean;
  consecutiveMistakeCount: number;
  consecutiveAutoApprovedRequestsCount: number;

  // Callbacks
  say: (
    type: ValorIDESay,
    text?: string,
    images?: string[],
    partial?: boolean,
  ) => Promise<undefined>;
  ask: (
    type: ValorIDEAsk,
    text?: string,
    partial?: boolean,
  ) => Promise<{
    response: ValorIDEAskResponse;
    text?: string;
    images?: string[];
  }>;
  saveCheckpoint: () => Promise<void>;
  shouldAutoApproveTool: (toolName: string) => boolean | [boolean, boolean];
  shouldAutoApproveToolWithPath: (toolName: string, path?: string) => boolean;
  sayAndCreateMissingParamError: (
    toolName: string,
    paramName: string,
    relPath?: string,
  ) => Promise<ToolResponse>;
  removeLastPartialMessageIfExistsWithType: (
    type: "ask" | "say",
    askOrSay: ValorIDEAsk | ValorIDESay,
  ) => Promise<void>;

  // Flags
  didRejectTool: boolean;
  didAlreadyUseTool: boolean;
}

export interface ToolExecutionResult {
  shouldContinue: boolean;
  toolResponse?: ToolResponse;
  userRejected?: boolean;
  didAlreadyUseTool?: boolean;
  feedback?: {
    text?: string;
    images?: string[];
  };
}

export abstract class BaseToolHandler {
  protected context: ToolContext;

  constructor(context: ToolContext) {
    this.context = context;
  }

  abstract execute(
    block: AssistantMessageContent,
    partial: boolean,
  ): Promise<ToolExecutionResult>;

  protected removeClosingTag(
    tag: string,
    text?: string,
    partial: boolean = false,
  ): string {
    if (!text || !partial) {
      return text || "";
    }

    const tagRegex = new RegExp(
      `\\s?</?${tag
        .split("")
        .map((char) => `(?:${char})?`)
        .join("")}$`,
      "g",
    );
    return text.replace(tagRegex, "");
  }

  protected async handleError(
    action: string,
    error: Error,
  ): Promise<ToolResponse> {
    const errorString = `Error ${action}: ${JSON.stringify(error, null, 2)}`;
    await this.context.say(
      "error",
      `Error ${action}:\n${error.message ?? JSON.stringify(error, null, 2)}`,
    );
    return `Error ${action}: ${error.message}`;
  }

  protected async askApproval(
    type: ValorIDEAsk,
    partialMessage?: string,
  ): Promise<boolean> {
    const { response, text, images } = await this.context.ask(
      type,
      partialMessage,
      false,
    );
    const normalizedText = text?.trim().toLowerCase();
    const approved =
      response === "yesButtonClicked" ||
      (response === "messageResponse" &&
        (normalizedText === "yes" || normalizedText === "approve"));

    if (!approved) {
      // User pressed reject button or responded with a message
      if (text || images?.length) {
        await this.context.say("user_feedback", text, images);
      }
      return false;
    } else {
      // User hit the approve button, and may have provided feedback
      if (text || images?.length) {
        await this.context.say("user_feedback", text, images);
      }
      return true;
    }
  }

  protected getToolDescription(block: AssistantMessageContent): string {
    if (block.type !== "tool_use") return "";

    // Use centralized helper to keep descriptions consistent across the codebase
    try {
      return ToolDescriptionHelper.getToolDescription(
        block.name as any,
        block.params || {},
      );
    } catch {
      return `[${block.name}]`;
    }
  }
}
