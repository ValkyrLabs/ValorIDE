import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import type {
  BalanceResponse,
  PaymentTransaction,
  UsageTransaction,
} from "@shared/ValorIDEAccount";
import { ExtensionMessage } from "@shared/ExtensionMessage";

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

  /**
   * Helper function to make authenticated requests to the ValorIDE API
   * @param endpoint The API endpoint to call (without the base URL)
   * @param config Additional axios request configuration
   * @returns The API response data
   * @throws Error if the API key is not found or the request fails
   */
  private async authenticatedRequest<T>(
    endpoint: string,
    config: AxiosRequestConfig = {},
  ): Promise<T> {
    const valorideApiKey = await this.getValorIDEApiKey();

    if (!valorideApiKey) {
      throw new Error("ValorIDE API key not found");
    }

    const url = `${this.baseUrl}${endpoint}`;
    const requestConfig: AxiosRequestConfig = {
      ...config,
      headers: {
        Authorization: `Bearer ${valorideApiKey}`,
        "Content-Type": "application/json",
        ...config.headers,
      },
    };

    const response: AxiosResponse<T> = await axios.get(url, requestConfig);

    if (!response.data) {
      throw new Error(`Invalid response from ${endpoint} API`);
    }

    return response.data;
  }


  /**
   * Fetches the user's usage transactions
   */
  async fetchUsageTransactions(): Promise<UsageTransaction[] | undefined> {
    try {
      const data = await this.authenticatedRequest<UsageTransaction[]>(
        "/user/credits/usage",
      );

      // Post to webview
      await this.postMessageToWebview({
        type: "userCreditsUsage",
        userCreditsUsage: data,
      });

      return data;
    } catch (error) {
      console.error("Failed to fetch usage transactions:", error);
      return undefined;
    }
  }

  /**
   * Fetches the user's payment transactions
   */
  async fetchPaymentTransactions(): Promise<PaymentTransaction[] | undefined> {
    try {
      const data = await this.authenticatedRequest<PaymentTransaction[]>(
        "/user/credits/payments",
      );

      // Post to webview
      await this.postMessageToWebview({
        type: "userCreditsPayments",
        userCreditsPayments: data,
      });

      return data;
    } catch (error) {
      console.error("Failed to fetch payment transactions:", error);
      return undefined;
    }
  }

  /**
   * Fetches content data from the ContentData endpoint
   */
  async fetchContentData(): Promise<any | undefined> {
    try {
      // Note: Using root path /ContentData instead of /v1/ContentData based on user's request
      const url = `${process.env.REACT_APP_BASE_PATH?.replace('/v1', '') || "http://localhost:8080"}/ContentData`;
      const valorideApiKey = await this.getValorIDEApiKey();

      if (!valorideApiKey) {
        throw new Error("ValorIDE API key not found");
      }

      const requestConfig: AxiosRequestConfig = {
        headers: {
          Authorization: `Bearer ${valorideApiKey}`,
          "Content-Type": "application/json",
        },
      };

      const response: AxiosResponse<any> = await axios.get(url, requestConfig);

      if (!response.data) {
        throw new Error("Invalid response from ContentData API");
      }

      // Post to webview if needed
      await this.postMessageToWebview({
        type: "contentData",
        contentData: response.data,
      });

      return response.data;
    } catch (error) {
      console.error("Failed to fetch content data:", error);
      return undefined;
    }
  }
}
