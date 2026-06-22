import { ExtensionMessage } from "@shared/ExtensionMessage";

export class ValorIDEAccountService {
  private postMessageToWebview: (message: ExtensionMessage) => Promise<void>;

  constructor(
    postMessageToWebview: (message: ExtensionMessage) => Promise<void>,
  ) {
    this.postMessageToWebview = postMessageToWebview;
  }

  /**
   * Fetches content data via the webview RTK system
   */
  async fetchContentData(): Promise<any | undefined> {
    try {
      const { ContentDataBridge } = await import(
        "../../services/content-data/ContentDataBridge"
      );
      const items = await ContentDataBridge.getInstance().listContentData({
        page: 0,
        size: 50,
      });

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
