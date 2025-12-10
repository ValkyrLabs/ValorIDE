import * as StompJs from "@stomp/stompjs";
import { WebsocketMessage, WebsocketMessageTypeEnum } from "@thorapi/model";
import {
  getJwtToken,
  isAuthenticated as isAuthed,
} from "../redux/auth/session";
import { getWebsocketUrl } from "../websocket/websocket";

export interface WebSocketUtilsConfig {
  onMessage?: (message: WebsocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: any) => void;
}

export class WebSocketUtils {
  private client: StompJs.Client | null = null;
  private config: WebSocketUtilsConfig;
  private connected: boolean = false;

  constructor(config: WebSocketUtilsConfig = {}) {
    this.config = config;
  }

  connect(): boolean {
    const token = getJwtToken();
    if (!isAuthed() || !token) {
      console.log("WebSocket connection skipped: not authenticated");
      return false;
    }

    console.log("Creating WebSocket client with token:", token);

    const websocketUrl = getWebsocketUrl();
    if (!websocketUrl) {
      console.warn("WebSocket connection skipped: no websocket URL configured");
      return false;
    }

    const authenticatedUrl = `${websocketUrl}?token=${encodeURIComponent(token)}`;
    this.client = new StompJs.Client({
      brokerURL: authenticatedUrl,
      reconnectDelay: 5000,
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      onConnect: () => {
        console.log("WebSocket connected successfully");
        this.connected = true;
        this.subscribeToTopics();
        this.config.onConnect?.();
      },
      onDisconnect: () => {
        console.log("WebSocket disconnected");
        this.connected = false;
        this.config.onDisconnect?.();
      },
      onStompError: (frame) => {
        console.error("Broker error: " + frame.headers["message"]);
        console.error("Details: " + frame.body);
        this.config.onError?.(frame);
      },
    });

    this.client.activate();
    return true;
  }

  private subscribeToTopics() {
    if (!this.client || !this.connected) return;

    this.client.subscribe("/topic/statuses", (message) => {
      const parsedMessage: WebsocketMessage = JSON.parse(message.body);
      this.config.onMessage?.(parsedMessage);
    });

    this.client.subscribe("/topic/messages", (message) => {
      const parsedMessage: WebsocketMessage = JSON.parse(message.body);
      this.config.onMessage?.(parsedMessage);
    });
  }

  sendMessage(payload: string, destination: string = "/app/chat"): boolean {
    if (!this.client || !this.connected) {
      console.log("Cannot send message: WebSocket not connected");
      return false;
    }

    const message = {
      payload,
      type: "user",
    };

    this.client.publish({
      destination,
      body: JSON.stringify(message),
    });

    return true;
  }

  sendCommand(command: any, destination: string = "/app/command"): boolean {
    if (!this.client || !this.connected) {
      console.log("Cannot send command: WebSocket not connected");
      return false;
    }

    this.client.publish({
      destination,
      body: JSON.stringify(command),
    });

    return true;
  }

  isConnected(): boolean {
    return this.connected;
  }

  disconnect() {
    if (this.client) {
      this.client.deactivate();
      this.client = null;
      this.connected = false;
    }
  }
}

// Utility function to take a screenshot of the current page
export const capturePageScreenshot = async (): Promise<string | null> => {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      console.warn("Screen capture not supported in this browser");
      return null;
    }

    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
    });

    const video = document.createElement("video");
    video.srcObject = stream;
    video.play();

    return new Promise((resolve) => {
      video.onloadedmetadata = () => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }

        ctx.drawImage(video, 0, 0);

        // Stop the stream
        stream.getTracks().forEach((track) => track.stop());

        // Convert to base64
        const dataURL = canvas.toDataURL("image/png");
        resolve(dataURL);
      };
    });
  } catch (error) {
    console.error("Error capturing screenshot:", error);
    return null;
  }
};

// Utility function to extract text content from the current page
export const capturePageText = (): string => {
  try {
    // Get the main content areas, excluding navigation and footer
    const contentSelectors = [
      "main",
      "article",
      ".content",
      "#content",
      ".main-content",
      "body",
    ];

    let content = "";

    for (const selector of contentSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        // Get text content but filter out script and style elements
        const clone = element.cloneNode(true) as Element;
        const scripts = clone.querySelectorAll("script, style, nav, footer");
        scripts.forEach((el) => el.remove());

        content = clone.textContent?.trim() || "";
        if (content.length > 100) break; // Found substantial content
      }
    }

    // Fallback to body if no content found
    if (!content) {
      content = document.body.textContent?.trim() || "";
    }

    // Clean up the content
    content = content
      .replace(/\s+/g, " ") // Normalize whitespace
      .replace(/\n\s*\n/g, "\n") // Remove empty lines
      .substring(0, 4000); // Limit length for API calls

    return content;
  } catch (error) {
    console.error("Error capturing page text:", error);
    return "Error capturing page content";
  }
};
