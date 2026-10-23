import {
  BaseToolHandler,
  type ToolExecutionResult,
  type ToolExecutionOutcome,
} from "./BaseToolHandler";
import type { AssistantMessageContent } from "@core/assistant-message";
import type { ValorIDESayTool } from "@shared/ExtensionMessage";
import { formatResponse } from "@core/prompts/responses";
import {
  boundedProcedureJson,
  prepareProcedureRequest,
  prepareProcedureSearch,
  procedureTraceId,
  requireProcedureExecutionId,
  isProcedureControlAction,
  requireProcedureControlState,
  PROCEDURE_MAX_BYTES,
  ValkyrProcedureError,
} from "@services/workflow/ValkyrProcedureClient";

export class ProcedureToolHandler extends BaseToolHandler {
  /** A local card failure cannot change an already established operation result. */
  private async deliverResult(
    result: object,
    message: ValorIDESayTool,
    outcome: ToolExecutionOutcome,
  ): Promise<ToolExecutionResult> {
    let toolResponse = JSON.stringify(result);
    try {
      await this.context.say("tool", JSON.stringify(message), undefined, false);
    } catch {
      toolResponse = JSON.stringify({
        ...result,
        presentation: {
          status: "unverified",
          message:
            "Chat-card delivery could not be verified. Use this tool result when reporting the operation. Do not repeat the operation to repair the display.",
        },
      });
    }
    return {
      outcome,
      shouldContinue: true,
      didAlreadyUseTool: true,
      toolResponse,
    };
  }

  private requireActMode(): void {
    if (this.context.isTaskActive?.() === false)
      throw new ValkyrProcedureError("TASK_ENDED");
    if (this.context.getChatMode?.() !== "act")
      throw new ValkyrProcedureError("PLAN_MODE");
  }
  override async execute(
    block: AssistantMessageContent,
    partial: boolean,
  ): Promise<ToolExecutionResult> {
    if (block.type !== "tool_use" || block.name !== "use_procedure" || partial)
      return { shouldContinue: false };
    const action = block.params.action;
    const control = isProcedureControlAction(action);
    let started = false;
    let executionId: string | undefined;
    let backend: string | undefined;
    try {
      this.requireActMode();
      const raw = block.params.arguments;
      if (
        typeof raw !== "string" ||
        Buffer.byteLength(raw) > PROCEDURE_MAX_BYTES
      )
        throw new ValkyrProcedureError("INVALID_INPUT");
      let args: Record<string, any>;
      try {
        args = boundedProcedureJson(JSON.parse(raw));
      } catch {
        throw new ValkyrProcedureError("INVALID_INPUT");
      }
      let payload: Record<string, any>;
      if (action === "search") payload = prepareProcedureSearch(args);
      else if (action === "inspect") {
        if (Object.keys(args).some((key) => key !== "procedureId"))
          throw new ValkyrProcedureError("INVALID_INPUT");
        payload = {
          procedureId: requireProcedureExecutionId(args.procedureId),
        };
      } else if (action === "status" || control) {
        if (Object.keys(args).some((key) => key !== "executionId"))
          throw new ValkyrProcedureError("INVALID_INPUT");
        payload = {
          executionId: requireProcedureExecutionId(args.executionId),
        };
        executionId = payload.executionId;
      } else if (action === "execute") {
        if (Object.hasOwn(args, "traceId"))
          throw new ValkyrProcedureError("INVALID_INPUT");
        const { operationRef, ...input } = args;
        payload = {
          ...input,
          traceId: procedureTraceId(this.context.taskId, operationRef),
        };
        prepareProcedureRequest(payload);
      } else throw new ValkyrProcedureError("INVALID_INPUT");

      const client = await this.context.getProcedureClient?.();
      if (!client) throw new ValkyrProcedureError("UNAUTHENTICATED");
      backend = client.baseUrl;
      const requestMessage = JSON.stringify({
        tool: "useProcedure",
        procedureAction: action,
        content: JSON.stringify({
          phase: "request",
          action,
          backend: client.baseUrl,
          parameters: payload,
        }),
      } satisfies ValorIDESayTool);
      if (
        !control &&
        this.context.shouldAutoApproveTool("use_procedure") === true
      ) {
        this.context.recordAutoApprovedRequest?.();
        await this.context.say("tool", requestMessage, undefined, false);
      } else if (!(await this.askApproval("tool", requestMessage))) {
        return {
          outcome: "rejected",
          shouldContinue: true,
          userRejected: true,
          toolResponse: formatResponse.toolDenied(),
        };
      }

      // This is the existing task checkpoint boundary, before any remote effect.
      this.requireActMode();
      if (control) {
        const current = await client.status(payload.executionId);
        this.requireActMode();
        requireProcedureControlState(action, current.state);
      }
      if (action === "execute" || control) await this.context.saveCheckpoint();
      this.requireActMode();
      started = true;
      const result =
        action === "search"
          ? await client.search(payload)
          : action === "inspect"
            ? await client.inspect(payload.procedureId)
            : action === "status"
              ? await client.status(payload.executionId)
              : control
                ? await client.control(action, payload.executionId)
                : await client.execute(payload);
      return await this.deliverResult(
        result,
        {
          tool: "useProcedure",
          procedureAction: action,
          content: JSON.stringify({
            phase: "result",
            action,
            backend: client.baseUrl,
            result,
          }),
        },
        action === "search" || action === "status" || action === "inspect"
          ? "succeeded"
          : "status" in result && result.status === "blocked"
            ? "blocked"
            : "pending",
      );
    } catch (error) {
      const safe =
        error instanceof ValkyrProcedureError
          ? error
          : new ValkyrProcedureError(
              !started
                ? "PREPARATION_FAILED"
                : action === "execute"
                  ? "DISPATCH_OUTCOME_UNKNOWN"
                  : control
                    ? "CONTROL_OUTCOME_UNKNOWN"
                    : action === "status"
                      ? "STATUS_UNAVAILABLE"
                      : action === "inspect"
                        ? "INSPECTION_UNAVAILABLE"
                        : "DISCOVERY_UNAVAILABLE",
            );
      const result = { error: { code: safe.code, message: safe.message } };
      return await this.deliverResult(
        result,
        {
          tool: "useProcedure",
          procedureAction: [
            "search",
            "inspect",
            "execute",
            "status",
            "pause",
            "resume",
            "cancel",
          ].includes(action)
            ? action
            : undefined,
          content: JSON.stringify({
            phase: "error",
            action,
            backend,
            executionId,
            result,
          }),
        },
        safe.code.endsWith("_UNKNOWN")
          ? "unknown"
          : !started
            ? "blocked"
            : "failed",
      );
    }
  }
}
