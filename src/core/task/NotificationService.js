import { showSystemNotification } from "@integrations/notifications";
export class NotificationService {
    autoApprovalSettings;
    constructor(autoApprovalSettings) {
        this.autoApprovalSettings = autoApprovalSettings;
    }
    /**
     * Shows notification for approval if auto-approval is enabled
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
     * Shows notification for task completion
     */
    showTaskCompletionNotification(result) {
        if (this.autoApprovalSettings.enableNotifications) {
            showSystemNotification({
                subtitle: "Task Completed",
                message: result.replace(/\n/g, " "),
            });
        }
    }
    /**
     * Shows notification for followup questions
     */
    showFollowupQuestionNotification(question) {
        if (this.autoApprovalSettings.enableNotifications) {
            showSystemNotification({
                subtitle: "ValorIDE has a question...",
                message: question.replace(/\n/g, " "),
            });
        }
    }
    /**
     * Shows notification for new task creation
     */
    showNewTaskNotification(context) {
        if (this.autoApprovalSettings.enabled &&
            this.autoApprovalSettings.enableNotifications) {
            showSystemNotification({
                subtitle: "ValorIDE wants to start a new task...",
                message: `ValorIDE is suggesting to start a new task with: ${context}`,
            });
        }
    }
    /**
     * Shows notification for conversation condensing
     */
    showCondenseNotification(context) {
        if (this.autoApprovalSettings.enabled &&
            this.autoApprovalSettings.enableNotifications) {
            showSystemNotification({
                subtitle: "ValorIDE wants to condense the conversation...",
                message: `ValorIDE is suggesting to condense your conversation with: ${context}`,
            });
        }
    }
    /**
     * Shows notification for error scenarios
     */
    showErrorNotification(message) {
        if (this.autoApprovalSettings.enabled &&
            this.autoApprovalSettings.enableNotifications) {
            showSystemNotification({
                subtitle: "Error",
                message,
            });
        }
    }
    /**
     * Shows notification for max requests reached
     */
    showMaxRequestsNotification(maxRequests) {
        if (this.autoApprovalSettings.enableNotifications) {
            showSystemNotification({
                subtitle: "Max Requests Reached",
                message: `ValorIDE has auto-approved ${maxRequests.toString()} API requests.`,
            });
        }
    }
    /**
     * Shows notification for long running commands
     */
    showLongRunningCommandNotification() {
        showSystemNotification({
            subtitle: "Command is still running",
            message: "An auto-approved command has been running for 30s, and may need your attention.",
        });
    }
    /**
     * Shows notification for command execution
     */
    showCommandExecutionNotification(command) {
        this.this.notifyCommandExecuting(command);
    }
    /**
     * Shows notification for file operations
     */
    showFileOperationNotification(operation, filename) {
        let message;
        switch (operation) {
            case "edit":
                message = `ValorIDE wants to edit ${filename}`;
                break;
            case "create":
                message = `ValorIDE wants to create ${filename}`;
                break;
            case "read":
                message = `ValorIDE wants to read ${filename}`;
                break;
        }
        this.showNotificationForApprovalIfAutoApprovalEnabled(message);
    }
    /**
     * Shows notification for browser operations
     */
    showBrowserOperationNotification(url) {
        this.showNotificationForApprovalIfAutoApprovalEnabled(`ValorIDE wants to use a browser and launch ${url}`);
    }
    /**
     * Shows notification for MCP operations
     */
    showMcpOperationNotification(toolName, serverName) {
        this.showNotificationForApprovalIfAutoApprovalEnabled(`ValorIDE wants to use ${toolName} on ${serverName}`);
    }
    /**
     * Shows notification for MCP resource access
     */
    showMcpResourceNotification(uri, serverName) {
        this.showNotificationForApprovalIfAutoApprovalEnabled(`ValorIDE wants to access ${uri} on ${serverName}`);
    }
    /**
     * Shows notification for directory operations
     */
    showDirectoryOperationNotification(operation, directoryName) {
        this.showNotificationForApprovalIfAutoApprovalEnabled(`ValorIDE wants to ${operation} ${directoryName}/`);
    }
}
//# sourceMappingURL=NotificationService.js.map