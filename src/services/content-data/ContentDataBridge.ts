import * as vscode from 'vscode';

/**
 * Bridge service to request ContentData via the webview's RTK Query system.
 * Mirrors the request/response pattern used in UsageTrackingService.
 */
export class ContentDataBridge {
  private static instance: ContentDataBridge;
  private webviewPanel: vscode.WebviewPanel | undefined;
  private pending = new Map<string, { resolve: (value: any) => void; reject: (reason?: any) => void; timeout: NodeJS.Timeout }>();

  private constructor() {}

  public static getInstance(): ContentDataBridge {
    if (!ContentDataBridge.instance) {
      ContentDataBridge.instance = new ContentDataBridge();
    }
    return ContentDataBridge.instance;
  }

  public setWebviewPanel(panel: vscode.WebviewPanel): void {
    this.webviewPanel = panel;
    panel.webview.onDidReceiveMessage((message) => this.handleWebviewMessage(message));
  }

  private genTxnId(): string {
    return `content_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  private waitFor<T = any>(txnId: string, timeoutMs = 10000): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(txnId);
        reject(new Error('Timeout waiting for content data response'));
      }, timeoutMs);
      this.pending.set(txnId, { resolve, reject, timeout });
    });
  }

  private complete(txnId: string, success: boolean, payload?: any) {
    const waiter = this.pending.get(txnId);
    if (!waiter) return;
    clearTimeout(waiter.timeout);
    this.pending.delete(txnId);
    if (success) waiter.resolve(payload);
    else waiter.reject(payload ?? new Error('ContentDataBridge: request failed'));
  }

  private handleWebviewMessage(message: any) {
    if (message?.type !== 'content_data_response') return;
    const action = message?.action;
    const data = message?.data || {};
    switch (action) {
      case 'list_result': {
        this.complete(data.transactionId, data.success, data.items);
        break; }
      case 'get_result': {
        this.complete(data.transactionId, data.success, data.item);
        break; }
      case 'create_result': {
        this.complete(data.transactionId, data.success, data.item);
        break; }
      default:
        break;
    }
  }

  /**
   * Fetch ContentData list via webview RTK Query handler.
   */
  public async listContentData(params?: { page?: number; size?: number }): Promise<any[]> {
    if (!this.webviewPanel) throw new Error('ContentDataBridge: webview not ready');
    const transactionId = this.genTxnId();
    this.webviewPanel.webview.postMessage({
      type: 'content_data',
      action: 'list',
      data: { transactionId, page: params?.page ?? 0, size: params?.size ?? 20 },
    });
    return await this.waitFor<any[]>(transactionId, 15000);
  }

  /**
   * Create ContentData via webview RTK Query handler.
   */
  public async createContentData(contentData: any): Promise<any> {
    if (!this.webviewPanel) throw new Error('ContentDataBridge: webview not ready');
    const transactionId = this.genTxnId();
    this.webviewPanel.webview.postMessage({
      type: 'content_data',
      action: 'create',
      data: { transactionId, contentData },
    });
    return await this.waitFor<any>(transactionId, 15000);
  }
}
