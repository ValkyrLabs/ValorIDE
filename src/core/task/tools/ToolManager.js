import { FileToolHandler } from "./FileToolHandler";
import { CommandToolHandler } from "./CommandToolHandler";
import { BrowserToolHandler } from "./BrowserToolHandler";
import { telemetryService } from "@services/telemetry/TelemetryService";
import { Logger } from "@services/logging/Logger";
export class ToolManager {
    handlers;
    context;
    constructor(context) {
        this.context = context;
        this.handlers = new Map();
        // Register file operation handlers
        const fileHandler = new FileToolHandler(context);
        this.handlers.set("write_to_file", fileHandler);
        this.handlers.set("replace_in_file", fileHandler);
        this.handlers.set("precision_search_and_replace", fileHandler);
        this.handlers.set("read_file", fileHandler);
        this.handlers.set("list_files", fileHandler);
        this.handlers.set("list_code_definition_names", fileHandler);
        this.handlers.set("search_files", fileHandler);
        // Register command handler
        const commandHandler = new CommandToolHandler(context);
        this.handlers.set("execute_command", commandHandler);
        // Register browser handler
        const browserHandler = new BrowserToolHandler(context);
        this.handlers.set("browser_action", browserHandler);
    }
    async executeTool(block, partial, didRejectTool, didAlreadyUseTool) {
        if (block.type !== "tool_use") {
            return { shouldContinue: false };
        }
        // Handle tool rejections and already used tools
        if (didRejectTool) {
            // ignore any tool content after user has rejected tool once
            if (!partial) {
                const toolResponse = `Skipping tool [${block.name}] due to user rejecting a previous tool.`;
                return { shouldContinue: true, toolResponse };
            }
            else {
                // partial tool after user rejected a previous tool
                const toolResponse = `Tool [${block.name}] was interrupted and not executed due to user rejecting a previous tool.`;
                return { shouldContinue: true, toolResponse };
            }
        }
        if (didAlreadyUseTool) {
            // ignore any content after a tool has already been used
            const toolResponse = `Tool [${block.name}] was already used for this message.`;
            return { shouldContinue: true, toolResponse };
        }
        // Get the appropriate handler for this tool
        const handler = this.handlers.get(block.name);
        if (handler) {
            const result = await handler.execute(block, partial);
            return {
                shouldContinue: result.shouldContinue,
                toolResponse: result.toolResponse,
                userRejected: result.userRejected,
                didRejectTool: result.userRejected,
                didAlreadyUseTool: result.didAlreadyUseTool ??
                    (result.shouldContinue && !result.userRejected),
                feedback: result.feedback,
            };
        }
        // If no handler found, return false to indicate the tool should be handled elsewhere
        telemetryService.captureUnknownTool(this.context.taskId, block.name, {
            partial,
        });
        Logger.warn(`Unknown tool requested: ${block.name}`);
        return { shouldContinue: false };
    }
}
//# sourceMappingURL=ToolManager.js.map