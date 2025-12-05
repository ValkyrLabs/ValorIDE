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
                subtitle: "Starting new task...",
                message: `New task: ${context}`,
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
                subtitle: "Condensing conversation...",
                message: `Condensing: ${context}`,
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
        this.showNotificationForApprovalIfAutoApprovalEnabled(`Executing: ${command}`);
    }
    /**
     * Shows notification for file operations
     */
    showFileOperationNotification(operation, filename) {
        let message;
        switch (operation) {
            case "edit":
                message = `Editing: ${filename}`;
                break;
            case "create":
                message = `Creating: ${filename}`;
                break;
            case "read":
                message = `Reading: ${filename}`;
                break;
        }
        this.showNotificationForApprovalIfAutoApprovalEnabled(message);
    }
    /**
     * Shows notification for browser operations
     */
    showBrowserOperationNotification(url) {
        this.showNotificationForApprovalIfAutoApprovalEnabled(`Browser: ${url}`);
    }
    /**
     * Shows notification for MCP operations
     */
    showMcpOperationNotification(toolName, serverName) {
        this.showNotificationForApprovalIfAutoApprovalEnabled(`MCP: ${toolName} → ${serverName}`);
    }
    /**
     * Shows notification for MCP resource access
     */
    showMcpResourceNotification(uri, serverName) {
        this.showNotificationForApprovalIfAutoApprovalEnabled(`Accessing: ${uri} (${serverName})`);
    }
    /**
     * Shows notification for directory operations
     */
    showDirectoryOperationNotification(operation, directoryName) {
        this.showNotificationForApprovalIfAutoApprovalEnabled(`${operation.toUpperCase()}: ${directoryName}/`);
    }
}
//# sourceMappingURL=NotificationService.js.map