import * as vscode from 'vscode';
/**
 * Service for tracking API usage and charges, sending data to backend server
 * via the webview's RTQ system
 */
export class UsageTrackingService {
    static instance;
    webview;
    pendingTransactions = new Map();
    constructor() { }
    static getInstance() {
        if (!UsageTrackingService.instance) {
            UsageTrackingService.instance = new UsageTrackingService();
        }
        return UsageTrackingService.instance;
    }
    /**
     * Set the webview for communication (supports both WebviewView and WebviewPanel)
     */
    setWebview(webview) {
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
    setWebviewPanel(panel) {
        this.setWebview(panel);
    }
    /**
     * Track API usage by sending a usage transaction to the backend
     */
    async trackUsage(usageData) {
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
        }
        catch (error) {
            console.error('UsageTrackingService: Failed to track usage:', error);
            return false;
        }
    }
    /**
     * Request current balance from the backend
     */
    async requestBalance() {
        if (!this.webview) {
            console.warn('UsageTrackingService: No webview available for balance request');
            return;
        }
        try {
            this.webview.webview.postMessage({
                type: 'usage_tracking',
                action: 'request_balance'
            });
        }
        catch (error) {
            console.error('UsageTrackingService: Failed to request balance:', error);
        }
    }
    /**
     * Track usage for OpenAI API calls
     */
    async trackOpenAIUsage(model, promptTokens, completionTokens, costPerPromptToken = 0.00001, // Default pricing, should be configurable
    costPerCompletionToken = 0.00002) {
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
    async trackAnthropicUsage(model, promptTokens, completionTokens, costPerPromptToken = 0.000008, // Default pricing for Claude
    costPerCompletionToken = 0.000024) {
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
    async trackGenericUsage(provider, model, promptTokens, completionTokens, credits) {
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
    generateTransactionId() {
        return `usage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Wait for response from webview
     */
    waitForResponse(transactionId, timeoutMs) {
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
    handleWebviewResponse(message) {
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
    handleTransactionResponse(data) {
        const pending = this.pendingTransactions.get(data.transactionId);
        if (pending) {
            clearTimeout(pending.timeout);
            this.pendingTransactions.delete(data.transactionId);
            if (data.success) {
                pending.resolve(true);
            }
            else {
                pending.reject(new Error('Failed to submit usage transaction'));
            }
        }
    }
    /**
     * Handle balance update from server
     */
    handleBalanceUpdate(balanceData) {
        // Emit event or update UI as needed
        console.log('Balance updated:', balanceData);
        // Could emit a VSCode event here for other parts of the extension to listen to
        vscode.commands.executeCommand('valoride.balanceUpdated', balanceData);
    }
    /**
     * Clean up pending transactions
     */
    dispose() {
        // Clear all pending transactions
        for (const [transactionId, pending] of this.pendingTransactions) {
            clearTimeout(pending.timeout);
            pending.reject(new Error('Service disposed'));
        }
        this.pendingTransactions.clear();
    }
}
//# sourceMappingURL=UsageTrackingService.js.map