import { formatResponse } from "@core/prompts/responses";
import { ToolApprovalManager } from "./ToolApprovalManager";
import { ToolManager } from "./tools";
/**
 * Core tool execution engine that handles all tool implementations
 * Extracted from the massive switch statement in Task.presentAssistantMessage
 */
export class ToolExecutionEngine {
    task;
    cwd;
    toolApprovalManager;
    toolManager;
    constructor(task, // Task reference for accessing methods and properties
    cwd) {
        this.task = task;
        this.cwd = cwd;
        this.toolApprovalManager = new ToolApprovalManager(this.task.autoApprovalSettings, this.task.ask.bind(this.task), this.task.say.bind(this.task));
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
    async executeToolBlock(block, toolDescription, userMessageContent, didRejectTool, didAlreadyUseTool, removeClosingTag) {
        if (didRejectTool) {
            // ignore any tool content after user has rejected tool once
            if (!block.partial) {
                userMessageContent.push({
                    type: "text",
                    text: `Skipping tool ${toolDescription()} due to user rejecting a previous tool.`,
                });
            }
            else {
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
        const pushToolResult = (content) => {
            this.toolApprovalManager.pushToolResult(userMessageContent, content, toolDescription());
            // Mark that we've used a tool
            didAlreadyUseTool = true;
        };
        const handleError = async (action, error) => {
            if (this.task.abandoned) {
                console.log("Ignoring error since task was abandoned (i.e. from task cancellation after resetting)");
                return;
            }
            const errorString = `Error ${action}: ${JSON.stringify({ message: error.message, stack: error.stack })}`;
            await this.task.say("error", `Error ${action}:\n${error.message ?? JSON.stringify({ message: error.message, stack: error.stack }, null, 2)}`);
            pushToolResult(formatResponse.toolError(errorString));
        };
        if (block.name !== "browser_action") {
            await this.task.browserSession.closeBrowser();
        }
        // Execute the specific tool
        const result = await this.executeSpecificTool(block, pushToolResult, handleError, removeClosingTag, toolDescription);
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
    async executeSpecificTool(block, pushToolResult, handleError, removeClosingTag, toolDescription) {
        try {
            // Try to execute with the refactored ToolManager first
            const result = await this.toolManager.executeTool(block, block.partial || false, false, // didRejectTool - handled at higher level
            false // didAlreadyUseTool - handled at higher level
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
        }
        catch (error) {
            await handleError(`executing ${block.name}`, error);
            return { shouldContinue: false, didRejectTool: false, didAlreadyUseTool: true };
        }
    }
    async executeFileOperation(block, pushToolResult, removeClosingTag) {
        // File operation implementation would go here
        // This is a placeholder - the actual implementation would be quite long
        // and would need access to diffViewProvider, consecutiveMistakeCount, etc.
        pushToolResult("File operations not yet implemented in refactored engine");
        return { shouldContinue: false, didRejectTool: false, didAlreadyUseTool: true };
    }
    async executeReadFile(block, pushToolResult, removeClosingTag) {
        pushToolResult("Read file not yet implemented in refactored engine");
        return { shouldContinue: false, didRejectTool: false, didAlreadyUseTool: true };
    }
    async executeListFiles(block, pushToolResult, removeClosingTag) {
        pushToolResult("List files not yet implemented in refactored engine");
        return { shouldContinue: false, didRejectTool: false, didAlreadyUseTool: true };
    }
    async executeListCodeDefinitions(block, pushToolResult, removeClosingTag) {
        pushToolResult("List code definitions not yet implemented in refactored engine");
        return { shouldContinue: false, didRejectTool: false, didAlreadyUseTool: true };
    }
    async executeSearchFiles(block, pushToolResult, removeClosingTag) {
        pushToolResult("Search files not yet implemented in refactored engine");
        return { shouldContinue: false, didRejectTool: false, didAlreadyUseTool: true };
    }
    async executeBrowserAction(block, pushToolResult, removeClosingTag) {
        pushToolResult("Browser action not yet implemented in refactored engine");
        return { shouldContinue: false, didRejectTool: false, didAlreadyUseTool: true };
    }
    async executeCommand(block, pushToolResult, removeClosingTag) {
        pushToolResult("Execute command not yet implemented in refactored engine");
        return { shouldContinue: false, didRejectTool: false, didAlreadyUseTool: true };
    }
    async executeMcpTool(block, pushToolResult, removeClosingTag) {
        pushToolResult("MCP tool not yet implemented in refactored engine");
        return { shouldContinue: false, didRejectTool: false, didAlreadyUseTool: true };
    }
    async executeAccessMcpResource(block, pushToolResult, removeClosingTag) {
        pushToolResult("Access MCP resource not yet implemented in refactored engine");
        return { shouldContinue: false, didRejectTool: false, didAlreadyUseTool: true };
    }
    async executeAskFollowupQuestion(block, pushToolResult, removeClosingTag) {
        pushToolResult("Ask followup question not yet implemented in refactored engine");
        return { shouldContinue: false, didRejectTool: false, didAlreadyUseTool: true };
    }
    async executeNewTask(block, pushToolResult, removeClosingTag) {
        pushToolResult("New task not yet implemented in refactored engine");
        return { shouldContinue: false, didRejectTool: false, didAlreadyUseTool: true };
    }
    async executeCondense(block, pushToolResult, removeClosingTag) {
        pushToolResult("Condense not yet implemented in refactored engine");
        return { shouldContinue: false, didRejectTool: false, didAlreadyUseTool: true };
    }
    async executePlanModeRespond(block, pushToolResult, removeClosingTag) {
        pushToolResult("Plan mode respond not yet implemented in refactored engine");
        return { shouldContinue: false, didRejectTool: false, didAlreadyUseTool: true };
    }
    async executeLoadMcpDocumentation(block, pushToolResult) {
        pushToolResult("Load MCP documentation not yet implemented in refactored engine");
        return { shouldContinue: false, didRejectTool: false, didAlreadyUseTool: true };
    }
    async executeAttemptCompletion(block, pushToolResult, removeClosingTag, toolDescription) {
        pushToolResult("Attempt completion not yet implemented in refactored engine");
        return { shouldContinue: false, didRejectTool: false, didAlreadyUseTool: true };
    }
}
//# sourceMappingURL=ToolExecutionEngine.js.map