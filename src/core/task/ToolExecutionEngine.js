import { formatResponse } from "@core/prompts/responses";
import { ToolApprovalManager } from "./ToolApprovalManager";
import { ToolManager } from "./tools";
import { Logger } from "@services/logging/Logger";
/**
 * Core tool execution engine that handles all tool implementations
 * Extracted from the massive switch statement in Task.presentAssistantMessage
 */
export class ToolExecutionEngine {
  task;
  cwd;
  toolApprovalManager;
  toolManager;
  constructor(
    task, // Task reference for accessing methods and properties
    cwd,
  ) {
    this.task = task;
    this.cwd = cwd;
    this.toolApprovalManager = new ToolApprovalManager(
      this.task.autoApprovalSettings,
      this.task.ask.bind(this.task),
      this.task.say.bind(this.task),
    );
    // Create ToolContext from task properties
    const toolContext = {
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
      consecutiveAutoApprovedRequestsCount:
        this.task.consecutiveAutoApprovedRequestsCount,
      // Callbacks
      say: this.task.say.bind(this.task),
      ask: this.task.ask.bind(this.task),
      saveCheckpoint: this.task.saveCheckpoint.bind(this.task),
      shouldAutoApproveTool: this.task.shouldAutoApproveTool.bind(this.task),
      shouldAutoApproveToolWithPath:
        this.task.shouldAutoApproveToolWithPath.bind(this.task),
      sayAndCreateMissingParamError:
        this.task.sayAndCreateMissingParamError.bind(this.task),
      removeLastPartialMessageIfExistsWithType:
        this.task.removeLastPartialMessageIfExistsWithType.bind(this.task),
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
    block,
    toolDescription,
    userMessageContent,
    didRejectTool,
    didAlreadyUseTool,
    removeClosingTag,
    handleFeedback,
  ) {
    Logger.info(
      `[ToolExecutionEngine] executeToolBlock start name=${block.name} partial=${block.partial} didReject=${didRejectTool} didAlreadyUse=${didAlreadyUseTool}`,
    );
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
      return {
        shouldContinue: false,
        didRejectTool,
        didAlreadyUseTool,
        handled: true,
      };
    }
    if (didAlreadyUseTool) {
      // ignore any content after a tool has already been used
      userMessageContent.push({
        type: "text",
        text: formatResponse.toolAlreadyUsed(block.name),
      });
      return {
        shouldContinue: false,
        didRejectTool,
        didAlreadyUseTool,
        handled: true,
      };
    }
    const pushToolResult = (content) => {
      this.toolApprovalManager.pushToolResult(
        userMessageContent,
        content,
        toolDescription(),
      );
      // Mark that we've used a tool
      didAlreadyUseTool = true;
    };
    const handleError = async (action, error) => {
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
      toolDescription,
      handleFeedback,
    );
    return {
      shouldContinue: result.shouldContinue,
      didRejectTool: result.didRejectTool || didRejectTool,
      didAlreadyUseTool: result.didAlreadyUseTool || didAlreadyUseTool,
      handled: result.handled ?? false,
    };
  }
  /**
   * Execute the specific tool using the ToolManager for refactored tools,
   * falling back to legacy implementations for unhandled tools
   */
  async executeSpecificTool(
    block,
    pushToolResult,
    handleError,
    removeClosingTag,
    toolDescription,
    handleFeedback,
  ) {
    try {
      // Try to execute with the refactored ToolManager first
      const result = await this.toolManager.executeTool(
        block,
        block.partial || false,
        false, // didRejectTool - handled at higher level
        false,
      );
      // If the ToolManager handled the tool
      if (result.shouldContinue) {
        // Push the tool result if there is one
        if (result.toolResponse) {
          pushToolResult(result.toolResponse);
        }
        if (result.feedback) {
          await handleFeedback(result.feedback);
        }
        Logger.info(
          `[ToolExecutionEngine] Tool manager handled ${block.name} shouldContinue=${result.shouldContinue} userRejected=${result.userRejected} didAlreadyUse=${result.didAlreadyUseTool}`,
        );
        return {
          shouldContinue: true,
          didRejectTool: result.didRejectTool || result.userRejected || false,
          didAlreadyUseTool: result.didAlreadyUseTool || false,
          handled: true,
        };
      }
      // If ToolManager couldn't handle it, fall back to legacy implementation
      Logger.info(
        `[ToolExecutionEngine] Tool manager did not handle ${block.name}; falling back to legacy implementation`,
      );
      return {
        shouldContinue: true,
        didRejectTool: false,
        didAlreadyUseTool: false,
        handled: false,
      };
    } catch (error) {
      await handleError(`executing ${block.name}`, error);
      Logger.error(
        `[ToolExecutionEngine] Error executing ${block.name}: ${error.message}`,
      );
      return {
        shouldContinue: false,
        didRejectTool: false,
        didAlreadyUseTool: true,
        handled: true,
      };
    }
  }
  async executeAttemptCompletion(
    block,
    pushToolResult,
    removeClosingTag,
    toolDescription,
  ) {
    pushToolResult(
      "Attempt completion not yet implemented in refactored engine",
    );
    return {
      shouldContinue: false,
      didRejectTool: false,
      didAlreadyUseTool: true,
    };
  }
}
//# sourceMappingURL=ToolExecutionEngine.js.map
