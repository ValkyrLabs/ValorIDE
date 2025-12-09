import {
  capturePageText,
  capturePageScreenshot,
  WebSocketUtils,
} from "./websocketUtils";
import {
  ChatMessage,
  ChatMessageRoleEnum,
  ChatMessageSourceTypeEnum,
} from "@thor/model";

export interface CommandResult {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

export interface CommandContext {
  user?: any;
  sessionId?: string;
  addMessage?: (message: ChatMessage) => void;
  wsUtils?: WebSocketUtils | null;
}

/**
 * Frontend Command Processor
 *
 * Handles browser-based commands from LLM responses.
 * Supports commands like screen capture, navigation, WebSocket communication, etc.
 */
export class FrontendCommandProcessor {
  private context: CommandContext;

  constructor(context: CommandContext) {
    this.context = context;
  }

  /**
   * Process XML commands from LLM responses
   * @param content The LLM response content
   * @returns Processed content with commands executed
   */
  async processCommands(content: string): Promise<string> {
    let processedContent = content;

    // Process screencapture commands
    processedContent =
      await this.processScreenCaptureCommands(processedContent);

    // Process websocket commands
    processedContent = await this.processWebSocketCommands(processedContent);

    // Process navigation commands
    processedContent = await this.processNavigationCommands(processedContent);

    // Process UI interaction commands
    processedContent = await this.processUICommands(processedContent);

    return processedContent;
  }

  /**
   * Handle screen capture commands
   * Format: <screencapture><type>screenshot|screenscrape</type></screencapture>
   */
  private async processScreenCaptureCommands(content: string): Promise<string> {
    const screencaptureRegex =
      /<screencapture>\s*<type>([\s\S]*?)<\/type>\s*<\/screencapture>/g;
    let processedContent = content;
    let match;

    while ((match = screencaptureRegex.exec(content)) !== null) {
      try {
        const captureType = match[1].trim().toLowerCase();
        console.log("🖼️ Processing screen capture command:", captureType);

        const result = await this.executeScreenCapture(captureType);

        if (result.success && this.context.addMessage) {
          // Add captured content to chat context
          this.context.addMessage({
            content: `**Screen Capture Result**: ${result.message || "Captured successfully"}`,
            role: ChatMessageRoleEnum.ASSISTANT,
            sourceType: ChatMessageSourceTypeEnum.API,
            sessionId: this.context.sessionId,
          });
        }

        // Remove the command from content
        processedContent = processedContent.replace(match[0], "");
      } catch (error) {
        console.error("Error processing screen capture command:", error);
        processedContent = processedContent.replace(
          match[0],
          `[Screen capture failed: ${error}]`,
        );
      }
    }

    return processedContent;
  }

  /**
   * Handle WebSocket commands
   * Format: <websocket><message>JSON message</message></websocket>
   */
  private async processWebSocketCommands(content: string): Promise<string> {
    const websocketRegex =
      /<websocket>\s*<message>([\s\S]*?)<\/message>\s*<\/websocket>/g;
    let processedContent = content;
    let match;

    while ((match = websocketRegex.exec(content)) !== null) {
      try {
        const messageData = JSON.parse(match[1].trim());
        console.log("📡 Processing WebSocket command:", messageData);

        const result = await this.executeWebSocketCommand(messageData);

        if (result.success && this.context.addMessage) {
          this.context.addMessage({
            content: `**WebSocket Command**: ${result.message || "Sent successfully"}`,
            role: ChatMessageRoleEnum.ASSISTANT,
            sourceType: ChatMessageSourceTypeEnum.API,
            sessionId: this.context.sessionId,
          });
        }

        // Remove the command from content
        processedContent = processedContent.replace(match[0], "");
      } catch (error) {
        console.error("Error processing WebSocket command:", error);
        processedContent = processedContent.replace(
          match[0],
          `[WebSocket command failed: ${error}]`,
        );
      }
    }

    return processedContent;
  }

  /**
   * Handle navigation commands
   * Format: <navigate><url>URL</url></navigate>
   */
  private async processNavigationCommands(content: string): Promise<string> {
    const navRegex = /<navigate>\s*<url>([\s\S]*?)<\/url>\s*<\/navigate>/g;
    let processedContent = content;
    let match;

    while ((match = navRegex.exec(content)) !== null) {
      try {
        const url = match[1].trim();
        console.log("🧭 Processing navigation command:", url);

        const result = await this.executeNavigation(url);

        // Remove the command from content
        processedContent = processedContent.replace(
          match[0],
          result.success
            ? `[Navigated to ${url}]`
            : `[Navigation failed: ${result.error}]`,
        );
      } catch (error) {
        console.error("Error processing navigation command:", error);
        processedContent = processedContent.replace(
          match[0],
          `[Navigation failed: ${error}]`,
        );
      }
    }

    return processedContent;
  }

  /**
   * Handle UI interaction commands
   * Format: <ui_action><action>click|scroll|type</action><target>selector</target><value>optional value</value></ui_action>
   */
  private async processUICommands(content: string): Promise<string> {
    const uiRegex =
      /<ui_action>\s*<action>([\s\S]*?)<\/action>\s*<target>([\s\S]*?)<\/target>(?:\s*<value>([\s\S]*?)<\/value>)?\s*<\/ui_action>/g;
    let processedContent = content;
    let match;

    while ((match = uiRegex.exec(content)) !== null) {
      try {
        const action = match[1].trim();
        const target = match[2].trim();
        const value = match[3]?.trim();

        console.log("🎯 Processing UI command:", { action, target, value });

        const result = await this.executeUIAction(action, target, value);

        // Remove the command from content
        processedContent = processedContent.replace(
          match[0],
          result.success
            ? `[${action} on ${target}]`
            : `[UI action failed: ${result.error}]`,
        );
      } catch (error) {
        console.error("Error processing UI command:", error);
        processedContent = processedContent.replace(
          match[0],
          `[UI action failed: ${error}]`,
        );
      }
    }

    return processedContent;
  }

  /**
   * Execute screen capture
   */
  private async executeScreenCapture(type: string): Promise<CommandResult> {
    try {
      if (type === "screenscrape" || type === "screenshot") {
        const pageText = capturePageText();
        let captureData: any = {
          type,
          url: window.location.href,
          title: document.title,
          timestamp: new Date().toISOString(),
          text: pageText,
          length: pageText.length,
        };

        if (type === "screenshot") {
          try {
            const screenshot = await capturePageScreenshot();
            if (screenshot) {
              captureData.screenshot = screenshot;
            }
          } catch (error) {
            console.log(
              "Screenshot capture failed, continuing with text only:",
              error,
            );
          }
        }

        // Send via WebSocket if available
        if (this.context.wsUtils && this.context.wsUtils.isConnected()) {
          const wsMessage = {
            type: "screen_capture",
            payload: `SCREEN CAPTURE (${type}): ${JSON.stringify(captureData)}`,
            timestamp: new Date().toISOString(),
            user: this.context.user || { username: "anonymous" },
          };
          this.context.wsUtils.sendCommand(wsMessage);
        }

        return {
          success: true,
          data: captureData,
          message: `Captured ${pageText.length} characters of page content`,
        };
      }

      return { success: false, error: `Unsupported capture type: ${type}` };
    } catch (error) {
      return { success: false, error: `Screen capture failed: ${error}` };
    }
  }

  /**
   * Execute WebSocket command
   */
  private async executeWebSocketCommand(
    messageData: any,
  ): Promise<CommandResult> {
    try {
      if (!this.context.wsUtils) {
        return { success: false, error: "WebSocket not available" };
      }

      if (!this.context.wsUtils.isConnected()) {
        return { success: false, error: "WebSocket not connected" };
      }

      const sent = this.context.wsUtils.sendCommand(messageData);

      return {
        success: sent,
        message: sent
          ? "WebSocket message sent"
          : "Failed to send WebSocket message",
      };
    } catch (error) {
      return { success: false, error: `WebSocket command failed: ${error}` };
    }
  }

  /**
   * Execute navigation
   */
  private async executeNavigation(url: string): Promise<CommandResult> {
    try {
      // Validate URL
      const validUrl = new URL(url, window.location.origin);

      // Navigate
      window.location.href = validUrl.toString();

      return {
        success: true,
        message: `Navigating to ${validUrl.toString()}`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Invalid URL or navigation failed: ${error}`,
      };
    }
  }

  /**
   * Execute UI action
   */
  private async executeUIAction(
    action: string,
    target: string,
    value?: string,
  ): Promise<CommandResult> {
    try {
      const element = document.querySelector(target);
      if (!element) {
        return { success: false, error: `Element not found: ${target}` };
      }

      switch (action.toLowerCase()) {
        case "click":
          (element as HTMLElement).click();
          return { success: true, message: `Clicked ${target}` };

        case "scroll":
          element.scrollIntoView({ behavior: "smooth" });
          return { success: true, message: `Scrolled to ${target}` };

        case "type":
          if (!value) {
            return { success: false, error: "Type action requires a value" };
          }
          if (
            element instanceof HTMLInputElement ||
            element instanceof HTMLTextAreaElement
          ) {
            element.value = value;
            element.dispatchEvent(new Event("change", { bubbles: true }));
            return {
              success: true,
              message: `Typed "${value}" into ${target}`,
            };
          }
          return {
            success: false,
            error: `Cannot type into ${target} - not an input element`,
          };

        default:
          return { success: false, error: `Unsupported action: ${action}` };
      }
    } catch (error) {
      return { success: false, error: `UI action failed: ${error}` };
    }
  }
}

/**
 * Helper function to create a command processor instance
 */
export const createFrontendCommandProcessor = (context: CommandContext) => {
  return new FrontendCommandProcessor(context);
};
