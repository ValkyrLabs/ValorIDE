import * as vscode from "vscode";

export interface StatusBarUpdate {
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  cacheTokens?: number;
  status?: "idle" | "running" | "streaming" | "error";
  message?: string;
}

/**
 * Manages the VSCode status bar for displaying ValorIDE's operational state,
 * current model, token usage, and streaming status.
 */
export class StatusBarService {
  private statusBar: vscode.StatusBarItem | null = null;
  private currentModel = "unknown";
  private inputTokens = 0;
  private outputTokens = 0;
  private cacheTokens = 0;
  private status: "idle" | "running" | "streaming" | "error" = "idle";
  private errorMessage: string | undefined;

  /**
   * Initialize the status bar item.
   */
  initialize(context: vscode.ExtensionContext): void {
    this.statusBar = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100,
    );
    this.statusBar.command = "valoride.showModelStatus";
    this.statusBar.tooltip = "Click to view detailed status";

    this.updateDisplay();
    this.statusBar.show();

    // Register the command
    context.subscriptions.push(
      vscode.commands.registerCommand("valoride.showModelStatus", () =>
        this.showDetailedStatus(),
      ),
    );

    context.subscriptions.push(this.statusBar);
  }

  /**
   * Update status bar with new metrics.
   */
  update(update: StatusBarUpdate): void {
    if (update.model !== undefined) {
      this.currentModel = update.model;
    }
    if (update.inputTokens !== undefined) {
      this.inputTokens = update.inputTokens;
    }
    if (update.outputTokens !== undefined) {
      this.outputTokens = update.outputTokens;
    }
    if (update.cacheTokens !== undefined) {
      this.cacheTokens = update.cacheTokens;
    }
    if (update.status !== undefined) {
      this.status = update.status;
    }
    if (update.message !== undefined) {
      this.errorMessage = update.message;
    }

    this.updateDisplay();
  }

  /**
   * Reset token counts and status to idle.
   */
  reset(): void {
    this.inputTokens = 0;
    this.outputTokens = 0;
    this.cacheTokens = 0;
    this.status = "idle";
    this.errorMessage = undefined;
    this.updateDisplay();
  }

  /**
   * Update the status bar display text and tooltip.
   */
  private updateDisplay(): void {
    if (!this.statusBar) return;

    const icon = this.getStatusIcon();
    const modelShort = this.getModelShortName();
    const totalTokens = this.inputTokens + this.outputTokens;

    const parts: string[] = [icon, modelShort];

    // Add token counts
    if (totalTokens > 0) {
      parts.push(`📊 ${totalTokens.toLocaleString()}`);
    }

    // Add cache indicator if applicable
    if (this.cacheTokens > 0) {
      parts.push(`💾 ${this.cacheTokens.toLocaleString()}`);
    }

    this.statusBar.text = parts.join(" ");
    this.statusBar.tooltip = this.getTooltip();
  }

  /**
   * Get the appropriate icon based on current status.
   */
  private getStatusIcon(): string {
    switch (this.status) {
      case "streaming":
        return "$(sync~spin)";
      case "running":
        return "$(loading)";
      case "error":
        return "$(error)";
      default:
        return "$(check-all)";
    }
  }

  /**
   * Shorten model name for display (e.g., "gemini-2-pro" -> "G2P").
   */
  private getModelShortName(): string {
    return this.currentModel
      .replace("gemini-3", "G3")
      .replace("gemini-2", "G2")
      .replace("gemini-", "G")
      .replace("claude-3-5-sonnet", "C35S")
      .replace("claude-3-opus", "C3O")
      .replace("claude-3-sonnet", "C3S")
      .replace("claude-", "C")
      .replace("gpt-4o", "GPT4O")
      .replace("gpt-4", "GPT4")
      .replace("gpt-", "GPT")
      .substring(0, 10);
  }

  /**
   * Generate detailed tooltip showing all metrics.
   */
  private getTooltip(): string {
    const parts: string[] = [`Model: ${this.currentModel}`];

    if (this.inputTokens > 0 || this.outputTokens > 0) {
      parts.push(`Input: ${this.inputTokens.toLocaleString()} tokens`);
      parts.push(`Output: ${this.outputTokens.toLocaleString()} tokens`);
    }

    if (this.cacheTokens > 0) {
      parts.push(`Cache: ${this.cacheTokens.toLocaleString()} tokens`);
    }

    parts.push(`Status: ${this.status.toUpperCase()}`);

    if (this.errorMessage) {
      parts.push(`Error: ${this.errorMessage}`);
    }

    return parts.join("\n");
  }

  /**
   * Show detailed status information in a message dialog.
   */
  private showDetailedStatus(): void {
    const totalTokens = this.inputTokens + this.outputTokens;
    const costEstimate = this.estimateCost();

    const details = [
      `🤖 Model: ${this.currentModel}`,
      `📊 Tokens:`,
      `   • Input: ${this.inputTokens.toLocaleString()}`,
      `   • Output: ${this.outputTokens.toLocaleString()}`,
      `   • Total: ${totalTokens.toLocaleString()}`,
      ...(this.cacheTokens > 0
        ? [`💾 Cache: ${this.cacheTokens.toLocaleString()}`]
        : []),
      `🔄 Status: ${this.status.toUpperCase()}`,
      ...(costEstimate ? [`💰 Est. Cost: $${costEstimate}`] : []),
    ];

    vscode.window.showInformationMessage(details.join("\n"));
  }

  /**
   * Rough cost estimation based on model and tokens.
   */
  private estimateCost(): string | null {
    // Simple estimation (in production, use actual pricing)
    const costPerMInput = 0.075 / 1_000_000; // Gemini 2 Pro
    const costPerMOutput = 0.3 / 1_000_000;

    const cost =
      this.inputTokens * costPerMInput + this.outputTokens * costPerMOutput;
    return cost > 0 ? cost.toFixed(4) : null;
  }

  /**
   * Dispose of resources.
   */
  dispose(): void {
    this.statusBar?.dispose();
    this.statusBar = null;
  }
}

// Singleton instance
let statusBarService: StatusBarService | null = null;

export function getStatusBarService(): StatusBarService {
  if (!statusBarService) {
    statusBarService = new StatusBarService();
  }
  return statusBarService;
}

export function initializeStatusBarService(
  context: vscode.ExtensionContext,
): StatusBarService {
  if (!statusBarService) {
    statusBarService = new StatusBarService();
    statusBarService.initialize(context);
  }
  return statusBarService;
}
