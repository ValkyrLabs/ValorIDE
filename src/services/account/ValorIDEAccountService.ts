import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { ExtensionMessage } from "@shared/ExtensionMessage";
// Align account-related types with Thor models (RTK/ThorAPI)
// Note: We don't execute RTK Query here (extension host). The webview owns RTK.
// These imports ensure consumers use the correct model shapes.
import type { UsageTransaction, PaymentTransaction } from "@thor/model";

export class ValorIDEAccountService {
  private readonly baseUrl = process.env.REACT_APP_BASE_PATH || "http://localhost:8080/v1";
  private postMessageToWebview: (message: ExtensionMessage) => Promise<void>;
  private getValorIDEApiKey: () => Promise<string | undefined>;

  constructor(
    postMessageToWebview: (message: ExtensionMessage) => Promise<void>,
    getValorIDEApiKey: () => Promise<string | undefined>,
  ) {
    this.postMessageToWebview = postMessageToWebview;
    this.getValorIDEApiKey = getValorIDEApiKey;
  }

  // Obsolete REST helpers removed. Usage/Payments now flow through webview RTK.


  /**
   * Request account balance refresh via the webview RTK Query system.
   * The webview component UsageTrackingHandler will handle this and
   * respond back with 'usage_tracking_response' (balance_updated).
   */
  async requestBalanceRefresh(): Promise<void> {
    try {
      await this.postMessageToWebview({
        type: "usage_tracking" as any,
        action: "request_balance" as any,
        data: {},
      } as unknown as ExtensionMessage);
    } catch (error) {
      console.error("Failed to request balance refresh:", error);
    }
  }

  /**
   * Fetches content data via the webview RTK system
   */
  async fetchContentData(): Promise<any | undefined> {
    try {
      const { ContentDataBridge } = await import('../../services/content-data/ContentDataBridge');
      const items = await ContentDataBridge.getInstance().listContentData({ page: 0, size: 50 });

      // Also forward to webview in case any components reflect it directly
      await this.postMessageToWebview({
        type: "contentData",
        contentData: items,
      });

      return items;
    } catch (error) {
      console.error("Failed to fetch content data via RTK bridge:", error);
      return undefined;
    }
  }
}
