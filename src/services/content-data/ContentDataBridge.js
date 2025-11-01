/**
 * Bridge service to request ContentData via the webview's RTK Query system.
 * Mirrors the request/response pattern used in UsageTrackingService.
 */
export class ContentDataBridge {
    static instance;
    webviewPanel;
    pending = new Map();
    constructor() { }
    static getInstance() {
        if (!ContentDataBridge.instance) {
            ContentDataBridge.instance = new ContentDataBridge();
        }
        return ContentDataBridge.instance;
    }
    setWebviewPanel(panel) {
        this.webviewPanel = panel;
        panel.webview.onDidReceiveMessage((message) => this.handleWebviewMessage(message));
    }
    genTxnId() {
        return `content_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    }
    waitFor(txnId, timeoutMs = 10000) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pending.delete(txnId);
                reject(new Error('Timeout waiting for content data response'));
            }, timeoutMs);
            this.pending.set(txnId, { resolve, reject, timeout });
        });
    }
    complete(txnId, success, payload) {
        const waiter = this.pending.get(txnId);
        if (!waiter)
            return;
        clearTimeout(waiter.timeout);
        this.pending.delete(txnId);
        if (success)
            waiter.resolve(payload);
        else
            waiter.reject(payload ?? new Error('ContentDataBridge: request failed'));
    }
    handleWebviewMessage(message) {
        if (message?.type !== 'content_data_response')
            return;
        const action = message?.action;
        const data = message?.data || {};
        switch (action) {
            case 'list_result': {
                this.complete(data.transactionId, data.success, data.items);
                break;
            }
            case 'get_result': {
                this.complete(data.transactionId, data.success, data.item);
                break;
            }
            default:
                break;
        }
    }
    /**
     * Fetch ContentData list via webview RTK Query handler.
     */
    async listContentData(params) {
        if (!this.webviewPanel)
            throw new Error('ContentDataBridge: webview not ready');
        const transactionId = this.genTxnId();
        this.webviewPanel.webview.postMessage({
            type: 'content_data',
            action: 'list',
            data: { transactionId, page: params?.page ?? 0, size: params?.size ?? 20 },
        });
        return await this.waitFor(transactionId, 15000);
    }
}
//# sourceMappingURL=ContentDataBridge.js.map