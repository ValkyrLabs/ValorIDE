import { showSystemNotification } from "@integrations/notifications";
import { AutoApprovalSettings } from "@shared/AutoApprovalSettings";

export class NotificationService {
  constructor(private autoApprovalSettings: AutoApprovalSettings) {}

  /**
   * Shows notification for approval if auto-approval is enabled
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
   * Shows notification for task completion
   */
  showTaskCompletionNotification(result: string): void {
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
  showFollowupQuestionNotification(question: string): void {
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
  showNewTaskNotification(context: string): void {
    if (
      this.autoApprovalSettings.enabled &&
      this.autoApprovalSettings.enableNotifications
    ) {
      showSystemNotification({
        subtitle: "ValorIDE wants to start a new task...",
        message: `ValorIDE is suggesting to start a new task with: ${context}`,
      });
    }
  }

  /**
   * Shows notification for conversation condensing
   */
  showCondenseNotification(context: string): void {
    if (
      this.autoApprovalSettings.enabled &&
      this.autoApprovalSettings.enableNotifications
    ) {
      showSystemNotification({
        subtitle: "ValorIDE wants to condense the conversation...",
        message: `ValorIDE is suggesting to condense your conversation with: ${context}`,
      });
    }
  }

  /**
   * Shows notification for error scenarios
   */
  showErrorNotification(message: string): void {
    if (
      this.autoApprovalSettings.enabled &&
      this.autoApprovalSettings.enableNotifications
    ) {
      showSystemNotification({
        subtitle: "Error",
        message,
      });
    }
  }

  /**
   * Shows notification for max requests reached
   */
  showMaxRequestsNotification(maxRequests: number): void {
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
  showLongRunningCommandNotification(): void {
    showSystemNotification({
      subtitle: "Command is still running",
      message:
        "An auto-approved command has been running for 30s, and may need your attention.",
    });
  }

  /**
   * Shows notification for command execution
   */
  showCommandExecutionNotification(command: string): void {
    this.showNotificationForApprovalIfAutoApprovalEnabled(
      `ValorIDE wants to execute a command: ${command}`
    );
  }

  /**
   * Shows notification for file operations
   */
  showFileOperationNotification(operation: "edit" | "create" | "read", filename: string): void {
    let message: string;
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
  showBrowserOperationNotification(url: string): void {
    this.showNotificationForApprovalIfAutoApprovalEnabled(
      `ValorIDE wants to use a browser and launch ${url}`
    );
  }

  /**
   * Shows notification for MCP operations
   */
  showMcpOperationNotification(toolName: string, serverName: string): void {
    this.showNotificationForApprovalIfAutoApprovalEnabled(
      `ValorIDE wants to use ${toolName} on ${serverName}`
    );
  }

  /**
   * Shows notification for MCP resource access
   */
  showMcpResourceNotification(uri: string, serverName: string): void {
    this.showNotificationForApprovalIfAutoApprovalEnabled(
      `ValorIDE wants to access ${uri} on ${serverName}`
    );
  }

  /**
   * Shows notification for directory operations
   */
  showDirectoryOperationNotification(operation: string, directoryName: string): void {
    this.showNotificationForApprovalIfAutoApprovalEnabled(
      `ValorIDE wants to ${operation} ${directoryName}/`
    );
  }
}
