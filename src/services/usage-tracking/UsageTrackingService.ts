import * as vscode from 'vscode';
import { UsageTrackingData } from '../../shared/UsageTransaction';

/**
 * Service for tracking API usage and charges, sending data to backend server
 * via the webview's RTQ system
 */
export class UsageTrackingService {
  private static instance: UsageTrackingService;
  private webview: vscode.WebviewView | vscode.WebviewPanel | undefined;
  private pendingTransactions = new Map<string, { resolve: (value: boolean) => void; reject: (reason?: any) => void; timeout: NodeJS.Timeout }>();

  private constructor() { }

  public static getInstance(): UsageTrackingService {
    if (!UsageTrackingService.instance) {
      UsageTrackingService.instance = new UsageTrackingService();
    }
    return UsageTrackingService.instance;
  }

  /**
   * Set the webview for communication (supports both WebviewView and WebviewPanel)
   */
  public setWebview(webview: vscode.WebviewView | vscode.WebviewPanel): void {
    this.webview = webview;

    // Set up message listener for responses from webview
    webview.webview.onDidReceiveMessage((message) => {
      this.handleWebviewResponse(message);
    });
  }

  /**
   * Set the webview panel for communication
   * @deprecated Use setWebview instead for broader compatibility
   */
  public setWebviewPanel(panel: vscode.WebviewPanel): void {
    this.setWebview(panel);
  }

  /**
   * Track API usage by sending a usage transaction to the backend
   */
  public async trackUsage(usageData: UsageTrackingData): Promise<boolean> {
    if (!this.webview) {
      console.warn('UsageTrackingService: No webview available for tracking usage');
      return false;
    }

    const transactionId = this.generateTransactionId();
    const usageTransaction = {
      spentAt: new Date(),
      credits: usageData.credits,
      modelProvider: usageData.modelProvider,
      model: usageData.model,
      promptTokens: usageData.promptTokens,
      completionTokens: usageData.completionTokens,
    };

    try {
      // Send message to webview to submit via RTQ
      this.webview.webview.postMessage({
        type: 'usage_tracking',
        action: 'track_usage',
        data: {
          transactionId,
          usageTransaction
        }
      });

      // Wait for response with timeout
      return await this.waitForResponse(transactionId, 10000); // 10 second timeout
    } catch (error) {
      console.error('UsageTrackingService: Failed to track usage:', error);
      return false;
    }
  }

  /**
   * Request current balance from the backend
   */
  public async requestBalance(): Promise<void> {
    if (!this.webview) {
      console.warn('UsageTrackingService: No webview available for balance request');
      return;
    }

    try {
      this.webview.webview.postMessage({
        type: 'usage_tracking',
        action: 'request_balance'
      });
    } catch (error) {
      console.error('UsageTrackingService: Failed to request balance:', error);
    }
  }

  /**
   * Track usage for OpenAI API calls
   */
  public async trackOpenAIUsage(
    model: string,
    promptTokens: number,
    completionTokens: number,
    costPerPromptToken: number = 0.00001, // Default pricing, should be configurable
    costPerCompletionToken: number = 0.00002
  ): Promise<boolean> {
    const credits = (promptTokens * costPerPromptToken) + (completionTokens * costPerCompletionToken);

    return this.trackUsage({
      modelProvider: 'openai',
      model,
      promptTokens,
      completionTokens,
      credits
    });
  }

  /**
   * Track usage for Anthropic API calls
   */
  public async trackAnthropicUsage(
    model: string,
    promptTokens: number,
    completionTokens: number,
    costPerPromptToken: number = 0.000008, // Default pricing for Claude
    costPerCompletionToken: number = 0.000024
  ): Promise<boolean> {
    const credits = (promptTokens * costPerPromptToken) + (completionTokens * costPerCompletionToken);

    return this.trackUsage({
      modelProvider: 'anthropic',
      model,
      promptTokens,
      completionTokens,
      credits
    });
  }

  /**
   * Track usage for other LLM providers
   */
  public async trackGenericUsage(
    provider: string,
    model: string,
    promptTokens: number,
    completionTokens: number,
    credits: number
  ): Promise<boolean> {
    return this.trackUsage({
      modelProvider: provider,
      model,
      promptTokens,
      completionTokens,
      credits
    });
  }

  /**
   * Generate a unique transaction ID
   */
  private generateTransactionId(): string {
    return `usage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Wait for response from webview
   */
  private waitForResponse(transactionId: string, timeoutMs: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingTransactions.delete(transactionId);
        reject(new Error('Timeout waiting for usage tracking response'));
      }, timeoutMs);

      this.pendingTransactions.set(transactionId, {
        resolve,
        reject,
        timeout
      });
    });
  }

  /**
   * Handle response from webview
   */
  private handleWebviewResponse(message: any): void {
    if (message.type === 'usage_tracking_response') {
      switch (message.action) {
        case 'transaction_submitted':
          this.handleTransactionResponse(message.data);
          break;
        case 'balance_updated':
          this.handleBalanceUpdate(message.data);
          break;
      }
    }
  }

  /**
   * Handle transaction submission response
   */
  private handleTransactionResponse(data: { transactionId: string; success: boolean; result?: any }): void {
    const pending = this.pendingTransactions.get(data.transactionId);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingTransactions.delete(data.transactionId);

      if (data.success) {
        pending.resolve(true);
      } else {
        pending.reject(new Error('Failed to submit usage transaction'));
      }
    }
  }

  /**
   * Handle balance update from server
   */
  private handleBalanceUpdate(balanceData: any): void {
    // Emit event or update UI as needed
    console.log('Balance updated:', balanceData);

    // Could emit a VSCode event here for other parts of the extension to listen to
    vscode.commands.executeCommand('valoride.balanceUpdated', balanceData);
  }

  /**
   * Clean up pending transactions
   */
  public dispose(): void {
    // Clear all pending transactions
    for (const [transactionId, pending] of this.pendingTransactions) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Service disposed'));
    }
    this.pendingTransactions.clear();
  }
}
