import { showSystemNotification } from "@integrations/notifications";
import { formatResponse } from "@core/prompts/responses";
/**
 * Manages tool approval workflow and auto-approval logic
 */
export class ToolApprovalManager {
    autoApprovalSettings;
    ask;
    say;
    constructor(autoApprovalSettings, ask, say) {
        this.autoApprovalSettings = autoApprovalSettings;
        this.ask = ask;
        this.say = say;
    }
    /**
     * Show notification for approval if auto-approval is enabled
     */
    showNotificationForApprovalIfAutoApprovalEnabled(message) {
        if (this.autoApprovalSettings.enabled &&
            this.autoApprovalSettings.enableNotifications) {
            showSystemNotification({
                subtitle: "Approval Required",
                message,
            });
        }
    }
    /**
     * Ask for tool approval and handle the response
     */
    async askApproval(type, partialMessage) {
        const { response, text, images } = await this.ask(type, partialMessage, false);
        const normalizedText = text?.trim().toLowerCase();
        const approved = response === "yesButtonClicked" ||
            (response === "messageResponse" &&
                (normalizedText === "yes" || normalizedText === "approve"));
        if (!approved) {
            // User pressed reject button or responded with a message, which we treat as a rejection
            return {
                approved: false,
                feedback: text || images?.length ? { text, images } : undefined
            };
        }
        else {
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
    pushToolResult(userMessageContent, content, toolDescription) {
        userMessageContent.push({
            type: "text",
            text: `${toolDescription} Result:`,
        });
        if (typeof content === "string") {
            userMessageContent.push({
                type: "text",
                text: content || "(tool did not return anything)",
            });
        }
        else {
            userMessageContent.push(...content);
        }
    }
    /**
     * Push additional tool feedback to user message content
     */
    pushAdditionalToolFeedback(userMessageContent, feedback, images) {
        if (!feedback && !images) {
            return;
        }
        const content = formatResponse.toolResult(`The user provided the following feedback:\n<feedback>\n${feedback}\n</feedback>`, images);
        if (typeof content === "string") {
            userMessageContent.push({
                type: "text",
                text: content,
            });
        }
        else {
            userMessageContent.push(...content);
        }
    }
    /**
     * Handle tool rejection workflow
     */
    async handleToolRejection(userMessageContent, toolDescription, feedback) {
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
    async handleToolApproval(userMessageContent, feedback) {
        if (feedback?.text || feedback?.images?.length) {
            this.pushAdditionalToolFeedback(userMessageContent, feedback.text, feedback.images);
            await this.say("user_feedback", feedback.text, feedback.images);
        }
    }
}
//# sourceMappingURL=ToolApprovalManager.js.map