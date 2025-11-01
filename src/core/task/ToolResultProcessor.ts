import { Anthropic } from "@anthropic-ai/sdk";
import { formatResponse } from "@core/prompts/responses";

type ToolResponse =
  | string
  | Array<Anthropic.TextBlockParam | Anthropic.ImageBlockParam>;

export interface ToolResultContext {
  userMessageContent: (
    | Anthropic.TextBlockParam
    | Anthropic.ImageBlockParam
  )[];
  didAlreadyUseTool: boolean;
}

export class ToolResultProcessor {
  /**
   * Pushes a tool result to the user message content and marks that a tool was already used
   */
  static pushToolResult(
    context: ToolResultContext,
    toolDescription: string,
    content: ToolResponse
  ): void {
    context.userMessageContent.push({
      type: "text",
      text: `${toolDescription} Result:`,
    });
    
    if (typeof content === "string") {
      context.userMessageContent.push({
        type: "text",
        text: content || "(tool did not return anything)",
      });
    } else {
      context.userMessageContent.push(...content);
    }
    
    // once a tool result has been collected, ignore all other tool uses since we should only ever present one tool result per message
    context.didAlreadyUseTool = true;
  }

  /**
   * Pushes additional tool feedback from user responses
   */
  static pushAdditionalToolFeedback(
    context: ToolResultContext,
    feedback?: string,
    images?: string[]
  ): void {
    if (!feedback && !images) {
      return;
    }
    
    const content = formatResponse.toolResult(
      `The user provided the following feedback:\n<feedback>\n${feedback}\n</feedback>`,
      images,
    );
    
    if (typeof content === "string") {
      context.userMessageContent.push({
        type: "text",
        text: content,
      });
    } else {
      context.userMessageContent.push(...content);
    }
  }

  /**
   * Creates a tool denial result
   */
  static createToolDenialResult(): ToolResponse {
    return formatResponse.toolDenied();
  }

  /**
   * Creates a tool error result
   */
  static createToolErrorResult(errorString: string): ToolResponse {
    return formatResponse.toolError(errorString);
  }

  /**
   * Creates a tool skipping result for when user rejected a previous tool
   */
  static createToolSkippedResult(toolDescription: string): string {
    return `Skipping tool ${toolDescription} due to user rejecting a previous tool.`;
  }

  /**
   * Creates a tool interrupted result for partial tools
   */
  static createToolInterruptedResult(toolDescription: string): string {
    return `Tool ${toolDescription} was interrupted and not executed due to user rejecting a previous tool.`;
  }

  /**
   * Creates a tool already used result
   */
  static createToolAlreadyUsedResult(toolName: string): string {
    return formatResponse.toolAlreadyUsed(toolName);
  }
}
