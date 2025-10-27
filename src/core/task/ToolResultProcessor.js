import { formatResponse } from "@core/prompts/responses";
export class ToolResultProcessor {
    /**
     * Pushes a tool result to the user message content and marks that a tool was already used
     */
    static pushToolResult(context, toolDescription, content) {
        context.userMessageContent.push({
            type: "text",
            text: `${toolDescription} Result:`,
        });
        if (typeof content === "string") {
            context.userMessageContent.push({
                type: "text",
                text: content || "(tool did not return anything)",
            });
        }
        else {
            context.userMessageContent.push(...content);
        }
        // once a tool result has been collected, ignore all other tool uses since we should only ever present one tool result per message
        context.didAlreadyUseTool = true;
    }
    /**
     * Pushes additional tool feedback from user responses
     */
    static pushAdditionalToolFeedback(context, feedback, images) {
        if (!feedback && !images) {
            return;
        }
        const content = formatResponse.toolResult(`The user provided the following feedback:\n<feedback>\n${feedback}\n</feedback>`, images);
        if (typeof content === "string") {
            context.userMessageContent.push({
                type: "text",
                text: content,
            });
        }
        else {
            context.userMessageContent.push(...content);
        }
    }
    /**
     * Creates a tool denial result
     */
    static createToolDenialResult() {
        return formatResponse.toolDenied();
    }
    /**
     * Creates a tool error result
     */
    static createToolErrorResult(errorString) {
        return formatResponse.toolError(errorString);
    }
    /**
     * Creates a tool skipping result for when user rejected a previous tool
     */
    static createToolSkippedResult(toolDescription) {
        return `Skipping tool ${toolDescription} due to user rejecting a previous tool.`;
    }
    /**
     * Creates a tool interrupted result for partial tools
     */
    static createToolInterruptedResult(toolDescription) {
        return `Tool ${toolDescription} was interrupted and not executed due to user rejecting a previous tool.`;
    }
    /**
     * Creates a tool already used result
     */
    static createToolAlreadyUsedResult(toolName) {
        return formatResponse.toolAlreadyUsed(toolName);
    }
}
//# sourceMappingURL=ToolResultProcessor.js.map