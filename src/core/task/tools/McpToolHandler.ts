import * as vscode from "vscode";
import {
  BaseToolHandler,
  type ToolExecutionResult,
  type ToolExecutionOutcome,
} from "./BaseToolHandler";
import type { AssistantMessageContent } from "@core/assistant-message";
import type { ValorIDEAskUseMcpServer } from "@shared/ExtensionMessage";
import { formatResponse } from "@core/prompts/responses";
import { ToolApprovalManager } from "@core/task/ToolApprovalManager";
import { validateMcpToolCall } from "@core/task/mcpToolValidation";
import { scopeGrayMatterMcpArguments } from "@services/graymatter/GrayMatterMcpScope";

/** MCP transport stays in McpHub; this owns native approval and result delivery. */
export class McpToolHandler extends BaseToolHandler {
  override async execute(
    block: AssistantMessageContent,
    partial: boolean,
  ): Promise<ToolExecutionResult> {
    if (
      block.type !== "tool_use" ||
      (block.name !== "use_mcp_tool" && block.name !== "access_mcp_resource")
    ) {
      return { shouldContinue: false };
    }
    const toolCall = block.name === "use_mcp_tool";
    let dispatched = false;
    let feedback: ToolExecutionResult["feedback"];
    const finish = (
      outcome: ToolExecutionOutcome,
      text: string,
    ): ToolExecutionResult => ({
      shouldContinue: true,
      didAlreadyUseTool: true,
      outcome,
      toolResponse: text,
      feedback,
    });
    const report = async (
      outcome: "blocked" | "unknown",
      text: string,
    ): Promise<ToolExecutionResult> => {
      // Terminal local reports must reach the human as well as the model.
      // Only remove our fixed diagnostic prefix; keep the actual guidance.
      const humanText = text.replace(
        /^(?:TASK_ENDED|MCP_SERVER_UNAVAILABLE|MCP_APPROVAL_CHANGED|MCP_OUTCOME_UNKNOWN|MCP_REQUEST_BLOCKED): /,
        "",
      );
      let response = text;
      try {
        await this.context.say(
          "mcp_server_response",
          `${outcome === "unknown" ? "Outcome unknown" : "Not sent"}\n\n${humanText}`,
        );
      } catch {
        response +=
          "\n\nChat update could not be verified. Use this tool result when explaining the outcome. Do not repeat the request to repair the display.";
      }
      return finish(outcome, response);
    };
    try {
      const serverName = block.params.server_name;
      const toolName = block.params.tool_name;
      const uri = block.params.uri;
      if (partial) {
        const preview = JSON.stringify(
          toolCall
            ? {
                type: "use_mcp_tool",
                serverName: this.removeClosingTag(
                  "server_name",
                  serverName,
                  true,
                ),
                toolName: this.removeClosingTag("tool_name", toolName, true),
                arguments: this.removeClosingTag(
                  "arguments",
                  block.params.arguments,
                  true,
                ),
              }
            : ({
                type: "access_mcp_resource",
                serverName: this.removeClosingTag(
                  "server_name",
                  serverName,
                  true,
                ),
                uri: this.removeClosingTag("uri", uri, true),
              } satisfies ValorIDEAskUseMcpServer),
        );
        const auto = this.context.shouldAutoApproveTool(block.name) === true;
        await this.context.removeLastPartialMessageIfExistsWithType(
          auto ? "ask" : "say",
          "use_mcp_server",
        );
        if (auto)
          await this.context.say("use_mcp_server", preview, undefined, true);
        else
          await this.context
            .ask("use_mcp_server", preview, true)
            .catch(() => {});
        return { shouldContinue: true, didAlreadyUseTool: false };
      }
      if (this.context.isTaskActive?.() === false)
        return report("blocked", "TASK_ENDED: MCP request was not dispatched.");
      for (const [key, value] of [
        ["server_name", serverName],
        [toolCall ? "tool_name" : "uri", toolCall ? toolName : uri],
      ]) {
        if (typeof value !== "string" || !value.trim()) {
          this.context.consecutiveMistakeCount++;
          return {
            ...finish("blocked", ""),
            toolResponse: await this.context.sayAndCreateMissingParamError(
              block.name,
              key!,
            ),
          };
        }
      }
      let args: Record<string, unknown> | undefined;
      if (toolCall && block.params.arguments) {
        try {
          const parsed: unknown = JSON.parse(block.params.arguments);
          if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
            throw new Error("object required");
          args = parsed as Record<string, unknown>;
        } catch {
          this.context.consecutiveMistakeCount++;
          return report(
            "blocked",
            "MCP arguments must be a valid JSON object. No request was dispatched.",
          );
        }
      }
      if (toolCall)
        args = scopeGrayMatterMcpArguments(
          serverName!,
          toolName!,
          args,
          vscode.workspace.workspaceFolders?.map((folder) => folder.uri.fsPath),
        );
      const connected = () =>
        this.context.mcpHub
          .getServers()
          .filter(
            (server) => server.status === "connected" && !server.disabled,
          );
      const validation = toolCall
        ? validateMcpToolCall(connected(), serverName!, toolName!, args)
        : undefined;
      if (validation && "error" in validation) {
        this.context.consecutiveMistakeCount++;
        return report("blocked", validation.error);
      }
      if (
        !toolCall &&
        !connected().some((server) => server.name === serverName)
      ) {
        return report(
          "blocked",
          "MCP_SERVER_UNAVAILABLE: Connect the selected server before reading its resource.",
        );
      }
      this.context.consecutiveMistakeCount = 0;
      const message = JSON.stringify(
        toolCall
          ? {
              type: "use_mcp_tool",
              serverName: serverName!,
              toolName: toolName!,
              arguments: args ? JSON.stringify(args) : block.params.arguments,
            }
          : ({
              type: "access_mcp_resource",
              serverName: serverName!,
              uri: uri!,
            } satisfies ValorIDEAskUseMcpServer),
      );
      const auto =
        this.context.shouldAutoApproveTool(block.name) === true &&
        (!toolCall ||
          (validation?.ok === true && validation.tool.autoApprove === true));
      await this.context.removeLastPartialMessageIfExistsWithType(
        auto ? "ask" : "say",
        "use_mcp_server",
      );
      if (auto) {
        await this.context.say("use_mcp_server", message, undefined, false);
        this.context.recordAutoApprovedRequest?.();
      } else {
        const approval = new ToolApprovalManager(
          this.context.autoApprovalSettings,
          this.context.ask,
          this.context.say,
        );
        approval.showNotificationForApprovalIfAutoApprovalEnabled(
          toolCall
            ? `MCP: ${toolName} (${serverName})`
            : `Accessing: ${uri} (${serverName})`,
        );
        const response = await this.context.ask(
          "use_mcp_server",
          message,
          false,
        );
        feedback =
          response.text || response.images?.length
            ? { text: response.text, images: response.images }
            : undefined;
        // Preserve MCP's existing explicit approval-button semantics.
        if (response.response !== "yesButtonClicked")
          return {
            ...finish("rejected", formatResponse.toolDenied()),
            userRejected: true,
          };
      }
      await this.context.saveCheckpoint();
      await this.context.say("mcp_server_request_started");
      if (this.context.isTaskActive?.() === false)
        return report("blocked", "TASK_ENDED: MCP request was not dispatched.");
      // Approval can remain open while a server is disabled or its advertised tools change.
      if (toolCall) {
        const current = validateMcpToolCall(
          connected(),
          serverName!,
          toolName!,
          args,
        );
        if ("error" in current) return report("blocked", current.error);
        if (
          auto &&
          (this.context.shouldAutoApproveTool(block.name) !== true ||
            current.tool.autoApprove !== true)
        ) {
          return report(
            "blocked",
            "MCP_APPROVAL_CHANGED: Review the request again before dispatch.",
          );
        }
      } else if (
        !connected().some((server) => server.name === serverName) ||
        (auto && this.context.shouldAutoApproveTool(block.name) !== true)
      ) {
        return report(
          "blocked",
          "MCP_APPROVAL_CHANGED: Review the resource request again before dispatch.",
        );
      }
      let text: string;
      let images: string[] = [];
      let outcome: ToolExecutionOutcome = "succeeded";
      const supportsImages =
        this.context.api.getModel().info.supportsImages ?? false;
      dispatched = true;
      if (toolCall) {
        const response = await this.context.mcpHub.callTool(
          serverName!,
          toolName!,
          args,
        );
        outcome = response.isError ? "failed" : "succeeded";
        images = response.content
          .filter((item) => item.type === "image")
          .map((item) => `data:${item.mimeType};base64,${item.data}`);
        const body = response.content
          .map((item) => {
            if (item.type === "text") return item.text;
            if (item.type === "resource") {
              const { blob, ...rest } = item.resource;
              return JSON.stringify(rest, null, 2);
            }
            return "";
          })
          .filter(Boolean)
          .join("\n\n");
        text = (response.isError ? "Error:\n" : "") + (body || "(No response)");
      } else {
        const response = await this.context.mcpHub.readResource(
          serverName!,
          uri!,
        );
        text =
          response.contents
            .map((item) => item.text || "")
            .filter(Boolean)
            .join("\n\n") || "(Empty response)";
      }
      const notices: string[] = [];
      try {
        await this.context.say(
          "mcp_server_response",
          text + images.map((image) => `\n\n${image}`).join(""),
        );
      } catch {
        notices.push(
          "Chat-card delivery could not be verified. Use the received result. Do not repeat the request to repair the display.",
        );
      }
      if (toolCall) {
        try {
          await this.context.saveCheckpoint();
        } catch {
          notices.push(
            "The post-call checkpoint could not be verified. The received MCP result is preserved. Do not repeat the request to repair the checkpoint.",
          );
        }
      }
      if (notices.length) {
        // A separate warning can settle the chat even when the response card
        // failed. It never replays the MCP request or replaces its known result.
        try {
          await this.context.say("error", notices.join("\n"));
        } catch {
          /* Preserve agent delivery when the entire UI is unavailable. */
        }
      }
      if (images.length && !supportsImages)
        text += `\n\n[${images.length} images were provided in the response, and while they are displayed to the user, you do not have the ability to view them.]`;
      if (notices.length) text += "\n\n" + notices.join("\n");
      return {
        ...finish(outcome, text),
        toolResponse: formatResponse.toolResult(
          text,
          supportsImages ? images : undefined,
        ),
      };
    } catch {
      if (partial) return { shouldContinue: true, didAlreadyUseTool: false };
      return report(
        dispatched ? "unknown" : "blocked",
        dispatched
          ? "MCP_OUTCOME_UNKNOWN: The request outcome could not be verified. Inspect the server's state before deciding whether another call is safe. Do not repeat a potentially completed action automatically."
          : "MCP_REQUEST_BLOCKED: The request could not be prepared or checkpointed. No MCP request was dispatched.",
      );
    }
  }
}
