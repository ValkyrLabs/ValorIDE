import { showSystemNotification } from "@integrations/notifications";
import { AutoApprovalSettings } from "@shared/AutoApprovalSettings";
import { formatResponse } from "@core/prompts/responses";
import { ValorIDEAsk, ValorIDEMessage } from "@shared/ExtensionMessage";
import { ToolUseName } from "@core/assistant-message";

export type ToolResponse = string | Array<any>;

/**
 * Manages tool approval workflow and auto-approval logic
 */
export class ToolApprovalManager {
  constructor(
    private autoApprovalSettings: AutoApprovalSettings,
    private ask: (type: ValorIDEAsk, text?: string, partial?: boolean) => Promise<any>,
    private say: (type: any, text?: string, images?: string[], partial?: boolean) => Promise<any>
  ) {}

  /**
   * Show notification for approval if auto-approval is enabled
   */
  showNotificationForApprovalIfAutoApprovalEnabled(message: string): void {
    if (
      this.autoApprovalSettings.enabled &&
      this.autoApprovalSettings.enableNotifications
    ) {
      showSystemNotification({
        subtitle: "Approval Required",
        message,
      });
    }
  }

  /**
   * Ask for tool approval and handle the response
   */
  async askApproval(
    type: ValorIDEAsk,
    partialMessage?: string,
  ): Promise<{ approved: boolean; feedback?: { text?: string; images?: string[] } }> {
    const { response, text, images } = await this.ask(
      type,
      partialMessage,
      false,
    );
    
    if (response !== "yesButtonClicked") {
      // User pressed reject button or responded with a message, which we treat as a rejection
      return {
        approved: false,
        feedback: text || images?.length ? { text, images } : undefined
      };
    } else {
      // User hit the approve button, and may have provided feedback
      return {
        approved: true,
        feedback: text || images?.length ? { text, images } : undefined
      };
    }
  }

  /**
   * Push tool result to user message content
   */
  pushToolResult(
    userMessageContent: any[],
    content: ToolResponse,
    toolDescription: string,
  ): void {
    userMessageContent.push({
      type: "text",
      text: `${toolDescription} Result:`,
    });
    if (typeof content === "string") {
      userMessageContent.push({
        type: "text",
        text: content || "(tool did not return anything)",
      });
    } else {
      userMessageContent.push(...content);
    }
  }

  /**
   * Push additional tool feedback to user message content
   */
  pushAdditionalToolFeedback(
    userMessageContent: any[],
    feedback?: string,
    images?: string[],
  ): void {
    if (!feedback && !images) {
      return;
    }
    const content = formatResponse.toolResult(
      `The user provided the following feedback:\n<feedback>\n${feedback}\n</feedback>`,
      images,
    );
    if (typeof content === "string") {
      userMessageContent.push({
        type: "text",
        text: content,
      });
    } else {
      userMessageContent.push(...content);
    }
  }

  /**
   * Handle tool rejection workflow
   */
  async handleToolRejection(
    userMessageContent: any[],
    toolDescription: string,
    feedback?: { text?: string; images?: string[] }
  ): Promise<void> {
    // User pressed reject button or responded with a message
    this.pushToolResult(userMessageContent, formatResponse.toolDenied(), toolDescription);
    
    if (feedback?.text || feedback?.images?.length) {
      this.pushAdditionalToolFeedback(userMessageContent, feedback.text, feedback.images);
      await this.say("user_feedback", feedback.text, feedback.images);
    }
  }

  /**
   * Handle tool approval workflow
   */
  async handleToolApproval(
    userMessageContent: any[],
    feedback?: { text?: string; images?: string[] }
  ): Promise<void> {
    if (feedback?.text || feedback?.images?.length) {
      this.pushAdditionalToolFeedback(userMessageContent, feedback.text, feedback.images);
      await this.say("user_feedback", feedback.text, feedback.images);
    }
  }
}
