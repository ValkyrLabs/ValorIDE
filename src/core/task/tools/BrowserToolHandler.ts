import {
  BaseToolHandler,
  ToolExecutionResult,
  ToolResponse,
} from "./BaseToolHandler";
import { AssistantMessageContent } from "@core/assistant-message";
import { formatResponse } from "@core/prompts/responses";
import {
  BrowserAction,
  ValorIDESayBrowserAction,
} from "@shared/ExtensionMessage";
import { telemetryService } from "@services/telemetry/TelemetryService";

export class BrowserToolHandler extends BaseToolHandler {
  async execute(
    block: AssistantMessageContent,
    partial: boolean,
  ): Promise<ToolExecutionResult> {
    if (block.type !== "tool_use" || block.name !== "browser_action") {
      return { shouldContinue: false };
    }

    const action = block.params.action as BrowserAction;
    const url = block.params.url;
    const coordinate = block.params.coordinate;
    const text = block.params.text;

    if (partial) {
      if (this.context.shouldAutoApproveTool(block.name)) {
        // partial streaming logic if needed
      } else {
        const browserActionParams: any = {
          action,
          url,
          coordinate,
          text,
        };
        await this.context
          .ask("tool", JSON.stringify(browserActionParams), partial)
          .catch(() => {});
      }
      return { shouldContinue: false };
    }

    if (!action) {
      this.context.consecutiveMistakeCount++;
      return {
        shouldContinue: true,
        toolResponse: await this.context.sayAndCreateMissingParamError(
          "browser_action",
          "action",
        ),
      };
    }

    // Validate params based on action
    if (action === "launch" && !url) {
      this.context.consecutiveMistakeCount++;
      return {
        shouldContinue: true,
        toolResponse: await this.context.sayAndCreateMissingParamError(
          "browser_action",
          "url",
        ),
      };
    }
    if (action === "click" && !coordinate) {
      this.context.consecutiveMistakeCount++;
      return {
        shouldContinue: true,
        toolResponse: await this.context.sayAndCreateMissingParamError(
          "browser_action",
          "coordinate",
        ),
      };
    }
    if (action === "type" && !text) {
      this.context.consecutiveMistakeCount++;
      return {
        shouldContinue: true,
        toolResponse: await this.context.sayAndCreateMissingParamError(
          "browser_action",
          "text",
        ),
      };
    }

    this.context.consecutiveMistakeCount = 0;

    const browserActionParams: any = {
      action,
      url,
      coordinate,
      text,
    };
    const message = JSON.stringify(browserActionParams);

    if (this.context.shouldAutoApproveTool(block.name)) {
      this.context.removeLastPartialMessageIfExistsWithType(
        "ask",
        "browser_action",
      );
      await this.context.say("browser_action", message, undefined, false);
      this.context.consecutiveAutoApprovedRequestsCount++;
    } else {
      this.context.removeLastPartialMessageIfExistsWithType(
        "say",
        "browser_action",
      );
      const didApprove = await this.askApproval("tool", message);
      if (!didApprove) {
        telemetryService.captureToolUsage(
          this.context.taskId,
          block.name,
          false,
          false,
        );
        return { shouldContinue: true, userRejected: true };
      }
    }

    telemetryService.captureToolUsage(
      this.context.taskId,
      block.name,
      true, // assuming auto-approve or user approved
      true,
    );

    try {
      let result: any;
      switch (action) {
        case "launch":
          result = await this.context.browserSession.navigateToUrl(url!);
          break;
        case "click":
          result = await this.context.browserSession.click(coordinate!);
          break;
        case "type":
          result = await this.context.browserSession.type(text!);
          break;
        case "scroll_down":
          result = await this.context.browserSession.scrollDown();
          break;
        case "scroll_up":
          result = await this.context.browserSession.scrollUp();
          break;
        case "close":
          result = await this.context.browserSession.closeBrowser();
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
      }
      let toolResponse: ToolResponse;

      const message = `Browser action '${action}' completed.\nLogs: ${result.logs || "none"}\nText: ${result.text || "none"}`;

      if (result.screenshot) {
        toolResponse = formatResponse.toolResult(message, [result.screenshot]);
      } else {
        toolResponse = formatResponse.toolResult(message);
      }

      return {
        shouldContinue: true,
        toolResponse,
        didAlreadyUseTool: true,
      };
    } catch (error) {
      return {
        shouldContinue: true,
        toolResponse: await this.handleError(
          "executing browser action",
          error as Error,
        ),
      };
    }
  }
}
