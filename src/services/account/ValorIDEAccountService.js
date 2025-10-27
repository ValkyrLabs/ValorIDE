export class ValorIDEAccountService {
    baseUrl = process.env.VITE_basePath || "http://localhost:8080/v1";
    postMessageToWebview;
    getValorIDEApiKey;
    constructor(postMessageToWebview, getValorIDEApiKey) {
        this.postMessageToWebview = postMessageToWebview;
        this.getValorIDEApiKey = getValorIDEApiKey;
    }
    // Obsolete REST helpers removed. Usage/Payments now flow through webview RTK.
    /**
     * Request account balance refresh via the webview RTK Query system.
     * The webview component UsageTrackingHandler will handle this and
     * respond back with 'usage_tracking_response' (balance_updated).
     */
    async requestBalanceRefresh() {
        try {
            await this.postMessageToWebview({
                type: "usage_tracking",
                action: "request_balance",
                data: {},
            });
        }
        catch (error) {
            console.error("Failed to request balance refresh:", error);
        }
    }
    /**
     * Fetches content data via the webview RTK system
     */
    async fetchContentData() {
        try {
            const { ContentDataBridge } = await import('../../services/content-data/ContentDataBridge');
            const items = await ContentDataBridge.getInstance().listContentData({ page: 0, size: 50 });
            // Also forward to webview in case any components reflect it directly
            await this.postMessageToWebview({
                type: "contentData",
                contentData: items,
            });
            return items;
        }
        catch (error) {
            console.error("Failed to fetch content data via RTK bridge:", error);
            return undefined;
        }
    }
}
//# sourceMappingURL=ValorIDEAccountService.js.map