import * as path from "path";
import { serializeError } from "serialize-error";
import cloneDeep from "clone-deep";
import { setTimeout as setTimeoutPromise } from "node:timers/promises";
import * as vscode from "vscode";
import { Anthropic } from "@anthropic-ai/sdk";
import {
  BrowserAction,
  BrowserActionResult,
  browserActions,
  ValorIDEAsk,
  ValorIDESay,
  ValorIDEAskUseMcpServer,
  ValorIDESayBrowserAction,
  ValorIDESayTool,
} from "@shared/ExtensionMessage";
import { formatResponse } from "@core/prompts/responses";
import { telemetryService } from "@services/telemetry/TelemetryService";
import { extractTextFromFile } from "@integrations/misc/extract-text";
import { listFiles } from "@services/glob/list-files";
import { parseSourceCodeForDefinitionsTopLevel } from "@services/tree-sitter";
import { regexSearchFiles } from "@services/ripgrep";
import { fixModelHtmlEscaping, removeInvalidChars } from "@utils/string";
import { fileExistsAtPath } from "@utils/fs";
import { getReadablePath, isLocatedInWorkspace } from "@utils/path";
import { constructNewFileContent } from "@core/assistant-message/diff";
import { findLast, parsePartialArrayString } from "@shared/array";
import { 
  combineCommandSequences, 
  COMMAND_REQ_APP_STRING 
} from "@shared/combineCommandSequences";
import { loadMcpDocumentation } from "@core/prompts/loadMcpDocumentation";
import {
  AssistantMessageContent,
  ToolParamName,
  ToolUseName,
} from "@core/assistant-message";
import { ToolDescriptionHelper } from "./ToolDescriptionHelper";
import { TagProcessingUtils } from "./TagProcessingUtils";
import { ToolApprovalManager } from "./ToolApprovalManager";
import { ToolManager, ToolContext } from "./tools";

type ToolResponse =
  | string
  | Array<Anthropic.TextBlockParam | Anthropic.ImageBlockParam>;

/**
 * Core tool execution engine that handles all tool implementations
 * Extracted from the massive switch statement in Task.presentAssistantMessage
 */
export class ToolExecutionEngine {
  private toolApprovalManager: ToolApprovalManager;
  private toolManager: ToolManager;

  constructor(
    private task: any, // Task reference for accessing methods and properties
    private cwd: string
  ) {
    this.toolApprovalManager = new ToolApprovalManager(
      this.task.autoApprovalSettings,
      this.task.ask.bind(this.task),
      this.task.say.bind(this.task)
    );

    // Create ToolContext from task properties
    const toolContext: ToolContext = {
      // Core services
      valorideIgnoreController: this.task.valorideIgnoreController,
      fileContextTracker: this.task.fileContextTracker,
      diffViewProvider: this.task.diffViewProvider,
      terminalManager: this.task.terminalManager,
      browserSession: this.task.browserSession,
      mcpHub: this.task.mcpHub,
      urlContentFetcher: this.task.urlContentFetcher,
      workspaceTracker: this.task.workspaceTracker,
      checkpointTracker: this.task.checkpointTracker,
      api: this.task.api,

      // State
      taskId: this.task.taskId,
      cwd: this.cwd,
      autoApprovalSettings: this.task.autoApprovalSettings,
      didEditFile: this.task.didEditFile,
      consecutiveMistakeCount: this.task.consecutiveMistakeCount,
      consecutiveAutoApprovedRequestsCount: this.task.consecutiveAutoApprovedRequestsCount,

      // Callbacks
      say: this.task.say.bind(this.task),
      ask: this.task.ask.bind(this.task),
      saveCheckpoint: this.task.saveCheckpoint.bind(this.task),
      shouldAutoApproveTool: this.task.shouldAutoApproveTool.bind(this.task),
      shouldAutoApproveToolWithPath: this.task.shouldAutoApproveToolWithPath.bind(this.task),
      sayAndCreateMissingParamError: this.task.sayAndCreateMissingParamError.bind(this.task),
      removeLastPartialMessageIfExistsWithType: this.task.removeLastPartialMessageIfExistsWithType.bind(this.task),

      // Flags
      didRejectTool: false,
      didAlreadyUseTool: false,
    };

    this.toolManager = new ToolManager(toolContext);
  }

  /**
   * Execute a tool based on the block content
   */
  async executeToolBlock(
    block: AssistantMessageContent & { type: "tool_use" },
    toolDescription: () => string,
    userMessageContent: (Anthropic.TextBlockParam | Anthropic.ImageBlockParam)[],
    didRejectTool: boolean,
    didAlreadyUseTool: boolean,
    removeClosingTag: (tag: ToolParamName, text?: string) => string
  ): Promise<{
    shouldContinue: boolean;
    didRejectTool: boolean;
    didAlreadyUseTool: boolean;
  }> {
    if (didRejectTool) {
      // ignore any tool content after user has rejected tool once
      if (!block.partial) {
        userMessageContent.push({
          type: "text",
          text: `Skipping tool ${toolDescription()} due to user rejecting a previous tool.`,
        });
      } else {
        // partial tool after user rejected a previous tool
        userMessageContent.push({
          type: "text",
          text: `Tool ${toolDescription()} was interrupted and not executed due to user rejecting a previous tool.`,
        });
      }
      return { shouldContinue: false, didRejectTool, didAlreadyUseTool };
    }

    if (didAlreadyUseTool) {
      // ignore any content after a tool has already been used
      userMessageContent.push({
        type: "text",
        text: formatResponse.toolAlreadyUsed(block.name),
      });
      return { shouldContinue: false, didRejectTool, didAlreadyUseTool };
    }

    const pushToolResult = (content: ToolResponse) => {
      this.toolApprovalManager.pushToolResult(userMessageContent, content, toolDescription());
      // Mark that we've used a tool
      didAlreadyUseTool = true;
    };

    const handleError = async (action: string, error: Error) => {
      if (this.task.abandoned) {
        console.log(
          "Ignoring error since task was abandoned (i.e. from task cancellation after resetting)",
        );
        return;
      }
      const errorString = `Error ${action}: ${JSON.stringify({ message: error.message, stack: error.stack })}`;
      await this.task.say(
        "error",
        `Error ${action}:\n${error.message ?? JSON.stringify({ message: error.message, stack: error.stack }, null, 2)}`,
      );
      pushToolResult(formatResponse.toolError(errorString));
    };

    if (block.name !== "browser_action") {
      await this.task.browserSession.closeBrowser();
    }

    // Execute the specific tool
    const result = await this.executeSpecificTool(
      block,
      pushToolResult,
      handleError,
      removeClosingTag,
      toolDescription
    );

    return {
      shouldContinue: result.shouldContinue,
      didRejectTool: result.didRejectTool || didRejectTool,
      didAlreadyUseTool: result.didAlreadyUseTool || didAlreadyUseTool,
    };
  }

  /**
   * Execute the specific tool using the ToolManager for refactored tools,
   * falling back to legacy implementations for unhandled tools
   */
  private async executeSpecificTool(
    block: AssistantMessageContent & { type: "tool_use" },
    pushToolResult: (content: ToolResponse) => void,
    handleError: (action: string, error: Error) => Promise<void>,
    removeClosingTag: (tag: ToolParamName, text?: string) => string,
    toolDescription: () => string
  ): Promise<{
    shouldContinue: boolean;
    didRejectTool: boolean;
    didAlreadyUseTool: boolean;
  }> {
    try {
      // Try to execute with the refactored ToolManager first
      const result = await this.toolManager.executeTool(
        block,
        block.partial || false,
        false, // didRejectTool - handled at higher level
        false  // didAlreadyUseTool - handled at higher level
      );

      // If the ToolManager handled the tool
      if (result.shouldContinue) {
        // Push the tool result if there is one
        if (result.toolResponse) {
          pushToolResult(result.toolResponse);
        }

        return {
          shouldContinue: true,
          didRejectTool: result.didRejectTool || false,
          didAlreadyUseTool: result.didAlreadyUseTool || false,
        };
      }

      // If ToolManager couldn't handle it, fall back to legacy implementation
      return { shouldContinue: true, didRejectTool: false, didAlreadyUseTool: false };
      
    } catch (error) {
      await handleError(`executing ${block.name}`, error as Error);
      return { shouldContinue: false, didRejectTool: false, didAlreadyUseTool: true };
    }
  }

  private async executeFileOperation(
    block: AssistantMessageContent & { type: "tool_use" },
    pushToolResult: (content: ToolResponse) => void,
    removeClosingTag: (tag: ToolParamName, text?: string) => string
  ) {
    // File operation implementation would go here
    // This is a placeholder - the actual implementation would be quite long
    // and would need access to diffViewProvider, consecutiveMistakeCount, etc.
    
    pushToolResult("File operations not yet implemented in refactored engine");
    return { shouldContinue: false, didRejectTool: false, didAlreadyUseTool: true };
  }

  private async executeReadFile(
    block: AssistantMessageContent & { type: "tool_use" },
    pushToolResult: (content: ToolResponse) => void,
    removeClosingTag: (tag: ToolParamName, text?: string) => string
  ) {
    pushToolResult("Read file not yet implemented in refactored engine");
    return { shouldContinue: false, didRejectTool: false, didAlreadyUseTool: true };
  }

  private async executeListFiles(
    block: AssistantMessageContent & { type: "tool_use" },
    pushToolResult: (content: ToolResponse) => void,
    removeClosingTag: (tag: ToolParamName, text?: string) => string
  ) {
    pushToolResult("List files not yet implemented in refactored engine");
    return { shouldContinue: false, didRejectTool: false, didAlreadyUseTool: true };
  }

  private async executeListCodeDefinitions(
    block: AssistantMessageContent & { type: "tool_use" },
    pushToolResult: (content: ToolResponse) => void,
    removeClosingTag: (tag: ToolParamName, text?: string) => string
  ) {
    pushToolResult("List code definitions not yet implemented in refactored engine");
    return { shouldContinue: false, didRejectTool: false, didAlreadyUseTool: true };
  }

  private async executeSearchFiles(
    block: AssistantMessageContent & { type: "tool_use" },
    pushToolResult: (content: ToolResponse) => void,
    removeClosingTag: (tag: ToolParamName, text?: string) => string
  ) {
    pushToolResult("Search files not yet implemented in refactored engine");
    return { shouldContinue: false, didRejectTool: false, didAlreadyUseTool: true };
  }

  private async executeBrowserAction(
    block: AssistantMessageContent & { type: "tool_use" },
    pushToolResult: (content: ToolResponse) => void,
    removeClosingTag: (tag: ToolParamName, text?: string) => string
  ) {
    pushToolResult("Browser action not yet implemented in refactored engine");
    return { shouldContinue: false, didRejectTool: false, didAlreadyUseTool: true };
  }

  private async executeCommand(
    block: AssistantMessageContent & { type: "tool_use" },
    pushToolResult: (content: ToolResponse) => void,
    removeClosingTag: (tag: ToolParamName, text?: string) => string
  ) {
    pushToolResult("Execute command not yet implemented in refactored engine");
    return { shouldContinue: false, didRejectTool: false, didAlreadyUseTool: true };
  }

  private async executeMcpTool(
    block: AssistantMessageContent & { type: "tool_use" },
    pushToolResult: (content: ToolResponse) => void,
    removeClosingTag: (tag: ToolParamName, text?: string) => string
  ) {
    pushToolResult("MCP tool not yet implemented in refactored engine");
    return { shouldContinue: false, didRejectTool: false, didAlreadyUseTool: true };
  }

  private async executeAccessMcpResource(
    block: AssistantMessageContent & { type: "tool_use" },
    pushToolResult: (content: ToolResponse) => void,
    removeClosingTag: (tag: ToolParamName, text?: string) => string
  ) {
    pushToolResult("Access MCP resource not yet implemented in refactored engine");
    return { shouldContinue: false, didRejectTool: false, didAlreadyUseTool: true };
  }

  private async executeAskFollowupQuestion(
    block: AssistantMessageContent & { type: "tool_use" },
    pushToolResult: (content: ToolResponse) => void,
    removeClosingTag: (tag: ToolParamName, text?: string) => string
  ) {
    pushToolResult("Ask followup question not yet implemented in refactored engine");
    return { shouldContinue: false, didRejectTool: false, didAlreadyUseTool: true };
  }

  private async executeNewTask(
    block: AssistantMessageContent & { type: "tool_use" },
    pushToolResult: (content: ToolResponse) => void,
    removeClosingTag: (tag: ToolParamName, text?: string) => string
  ) {
    pushToolResult("New task not yet implemented in refactored engine");
    return { shouldContinue: false, didRejectTool: false, didAlreadyUseTool: true };
  }

  private async executeCondense(
    block: AssistantMessageContent & { type: "tool_use" },
    pushToolResult: (content: ToolResponse) => void,
    removeClosingTag: (tag: ToolParamName, text?: string) => string
  ) {
    pushToolResult("Condense not yet implemented in refactored engine");
    return { shouldContinue: false, didRejectTool: false, didAlreadyUseTool: true };
  }

  private async executePlanModeRespond(
    block: AssistantMessageContent & { type: "tool_use" },
    pushToolResult: (content: ToolResponse) => void,
    removeClosingTag: (tag: ToolParamName, text?: string) => string
  ) {
    pushToolResult("Plan mode respond not yet implemented in refactored engine");
    return { shouldContinue: false, didRejectTool: false, didAlreadyUseTool: true };
  }

  private async executeLoadMcpDocumentation(
    block: AssistantMessageContent & { type: "tool_use" },
    pushToolResult: (content: ToolResponse) => void
  ) {
    pushToolResult("Load MCP documentation not yet implemented in refactored engine");
    return { shouldContinue: false, didRejectTool: false, didAlreadyUseTool: true };
  }

  private async executeAttemptCompletion(
    block: AssistantMessageContent & { type: "tool_use" },
    pushToolResult: (content: ToolResponse) => void,
    removeClosingTag: (tag: ToolParamName, text?: string) => string,
    toolDescription: () => string
  ) {
    pushToolResult("Attempt completion not yet implemented in refactored engine");
    return { shouldContinue: false, didRejectTool: false, didAlreadyUseTool: true };
  }
}
