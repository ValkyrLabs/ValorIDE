import {
  BaseToolHandler,
  ToolExecutionResult,
  ToolResponse,
} from "./BaseToolHandler";
import { AssistantMessageContent } from "@core/assistant-message";
import { formatResponse } from "@core/prompts/responses";
import {
  BrowserAction,
  browserActions,
  ValorIDESayBrowserAction,
} from "@shared/ExtensionMessage";

export class BrowserToolHandler extends BaseToolHandler {
  async execute(
    block: AssistantMessageContent,
    partial: boolean,
  ): Promise<ToolExecutionResult> {
    if (block.type !== "tool_use" || block.name !== "browser_action") {
      return { shouldContinue: false };
    }

    const action = this.removeClosingTag(
      "action",
      block.params.action,
      partial,
    ) as BrowserAction;
    const url = block.params.url;
    const coordinate = block.params.coordinate;
    const text = block.params.text;

    if (partial) {
      if (!action || !browserActions.includes(action)) {
        return { shouldContinue: false };
      }

      if (action === "launch") {
        const partialUrl = this.removeClosingTag("url", url, true);
        if (this.context.shouldAutoApproveTool(block.name)) {
          await this.context.removeLastPartialMessageIfExistsWithType(
            "ask",
            "browser_action_launch",
          );
          await this.context.removeLastPartialMessageIfExistsWithType(
            "say",
            "browser_action_launch",
          );
          await this.context.say(
            "browser_action_launch",
            partialUrl,
            undefined,
            true,
          );
        } else {
          await this.context.removeLastPartialMessageIfExistsWithType(
            "ask",
            "browser_action_launch",
          );
          await this.context
            .ask("browser_action_launch", partialUrl, true)
            .catch(() => {});
        }
      } else {
        const browserActionParams: any = {
          action,
          coordinate,
          text: this.removeClosingTag("text", text, true),
        };
        await this.context.say(
          "browser_action",
          JSON.stringify(browserActionParams),
          undefined,
          true,
        );
      }
      return { shouldContinue: false };
    }

    if (!action || !browserActions.includes(action)) {
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

    const browserActionParams = {
      action,
      coordinate,
      text,
      ...(action === "launch" ? { url, text: url } : {}),
    } satisfies ValorIDESayBrowserAction;
    const message = JSON.stringify(browserActionParams);

    if (action === "launch") {
      if (this.context.shouldAutoApproveTool(block.name)) {
        await this.context.removeLastPartialMessageIfExistsWithType(
          "ask",
          "browser_action_launch",
        );
        await this.context.removeLastPartialMessageIfExistsWithType(
          "say",
          "browser_action_launch",
        );
        await this.context.removeLastPartialMessageIfExistsWithType(
          "say",
          "browser_action",
        );
        await this.context.say("browser_action_launch", url, undefined, false);
        this.context.consecutiveAutoApprovedRequestsCount++;
      } else {
        await this.context.removeLastPartialMessageIfExistsWithType(
          "ask",
          "browser_action_launch",
        );
        const didApprove = await this.askApproval(
          "browser_action_launch",
          url,
        );
        if (!didApprove) {
          return { shouldContinue: true, userRejected: true };
        }
      }
      await this.context.say("browser_action_result", "");
    } else {
      await this.context.say("browser_action", message, undefined, false);
      if (!this.context.shouldAutoApproveTool(block.name)) {
        const didApprove = await this.askApproval("tool", message);
        if (!didApprove) {
          return { shouldContinue: true, userRejected: true };
        }
      }
    }

    try {
      let result: any;
      switch (action) {
        case "launch":
          await this.context.browserSession.launchBrowser();
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

      if (action !== "close") {
        await this.context.say(
          "browser_action_result",
          JSON.stringify(result),
        );
      }

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
