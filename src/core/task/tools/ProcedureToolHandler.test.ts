jest.mock("@integrations/notifications", () => ({
  showSystemNotification: jest.fn(),
}));
const { ProcedureToolHandler } = jest.requireActual<
  typeof import("./ProcedureToolHandler")
>("./ProcedureToolHandler");
import { parseAssistantMessage } from "@core/assistant-message";
import {
  procedureTraceId,
  ValkyrProcedureError,
} from "@services/workflow/ValkyrProcedureClient";

const executionId = "6b5f4311-bf51-448a-83c8-e391c435314e";
const params = {
  operationRef: "reconcile-42",
  taskType: "workflow",
  procedureHints: ["procedure:reconcile:v1"],
  inputs: { amount: 42 },
};
const block = (action = "execute", args: unknown = params, partial = false) =>
  ({
    type: "tool_use",
    name: "use_procedure",
    partial,
    params: { action, arguments: JSON.stringify(args) },
  }) as any;
const fixture = (approved = true, auto = false) => {
  const order: string[] = [];
  const client = {
    baseUrl: "https://api-0.valkyrlabs.com/v1",
    inspect: jest.fn(async () => ({
      status: "input_contract_available",
      inputSchema: { type: "object" },
      runtimeValidationRequired: true,
    })),
    search: jest.fn(async () => ({
      procedures: [],
      coverage: { complete: false },
    })),
    execute: jest.fn(async () => {
      order.push("execute");
      return {
        status: "procedure_started",
        workflow: { id: executionId, state: "RUNNING" },
        agentExecutionPerformed: false,
      };
    }),
    status: jest.fn(async () => ({
      id: executionId,
      state: "SUCCESS",
      terminal: true,
      succeeded: true,
    })),
    control: jest.fn(async (action: string, id: string) => {
      order.push("control");
      return {
        status: "control_returned",
        action,
        workflow: { id, state: "PAUSED" },
      };
    }),
  };
  const context = {
    taskId: "task-42",
    getChatMode: jest.fn(() => "act"),
    getProcedureClient: jest.fn(async () => client),
    ask: jest.fn(async () => {
      order.push("approve");
      return { response: approved ? "yesButtonClicked" : "noButtonClicked" };
    }),
    say: jest.fn(async (..._args: unknown[]) => undefined),
    saveCheckpoint: jest.fn(async () => {
      order.push("checkpoint");
    }),
    shouldAutoApproveTool: jest.fn(() => auto),
    recordAutoApprovedRequest: jest.fn(),
    removeLastPartialMessageIfExistsWithType: jest.fn(),
  };
  return {
    client,
    context,
    order,
    handler: new ProcedureToolHandler(context as any),
  };
};

describe("native procedure tool", () => {
  for (const action of [
    "execute",
    "pause",
    "resume",
    "cancel",
    "search",
    "status",
  ] as const) {
    it(`preserves the verified ${action} response when result-card delivery fails without retrying`, async () => {
      const { handler, context, client } = fixture();
      if (["pause", "resume", "cancel"].includes(action))
        client.status.mockResolvedValue({
          id: executionId,
          state: action === "resume" ? "PAUSED" : "RUNNING",
          terminal: false,
          succeeded: false,
        });
      context.say.mockRejectedValueOnce(new Error("private-card-secret"));
      const args =
        action === "execute"
          ? params
          : action === "search"
            ? { taskType: "workflow" }
            : { executionId };
      const result = await handler.execute(block(action, args), false);
      const response = JSON.parse(String(result.toolResponse));
      const remote =
        action === "execute"
          ? client.execute
          : action === "search"
            ? client.search
            : action === "status"
              ? client.status
              : client.control;
      const verified = await remote.mock.results[0].value;
      expect(response).toMatchObject(verified);
      expect(response.error).toBeUndefined();
      expect(response.presentation).toMatchObject({ status: "unverified" });
      expect(response.presentation.message).toContain("Do not repeat");
      expect(result.toolResponse).not.toContain("private-card-secret");
      expect(remote).toHaveBeenCalledTimes(1);
      expect(context.say).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({
        shouldContinue: true,
        didAlreadyUseTool: true,
      });
      if (action !== "execute") expect(client.execute).not.toHaveBeenCalled();
    });
  }

  for (const code of ["DISPATCH_OUTCOME_UNKNOWN", "FORBIDDEN"] as const) {
    it(`preserves the safe ${code} result when its error card cannot be delivered`, async () => {
      const { handler, context, client } = fixture();
      client.execute.mockRejectedValue(new ValkyrProcedureError(code));
      context.say.mockRejectedValue(new Error("private-card-secret"));
      const result = await handler.execute(block(), false);
      expect(JSON.parse(String(result.toolResponse))).toMatchObject({
        error: { code },
        presentation: { status: "unverified" },
      });
      expect(result.toolResponse).not.toContain("private-card-secret");
      expect(client.execute).toHaveBeenCalledTimes(1);
      expect(client.status).not.toHaveBeenCalled();
      expect(context.say).toHaveBeenCalledTimes(1);
    });
  }

  it("still blocks dispatch when auto-approved request history cannot be delivered", async () => {
    const { handler, context, client } = fixture(true, true);
    context.say.mockRejectedValue(new Error("private-card-secret"));
    const result = await handler.execute(block(), false);
    expect(JSON.parse(String(result.toolResponse))).toMatchObject({
      error: { code: "PREPARATION_FAILED" },
      presentation: { status: "unverified" },
    });
    expect(result.toolResponse).not.toContain("private-card-secret");
    expect(client.execute).not.toHaveBeenCalled();
    expect(context.saveCheckpoint).not.toHaveBeenCalled();
    expect(context.say).toHaveBeenCalledTimes(2);
  });

  it("requires human approval for controls even when procedure invocation is auto-approved", async () => {
    for (const [action, state] of [
      ["pause", "RUNNING"],
      ["resume", "PAUSED"],
      ["cancel", "WAITING_FOR_APPROVAL"],
    ]) {
      const { handler, context, client, order } = fixture(true, true);
      client.status.mockImplementation(async () => {
        order.push("status");
        return { id: executionId, state, terminal: false, succeeded: false };
      });
      const parsed = parseAssistantMessage(
        `<use_procedure><action>${action}</action><arguments>${JSON.stringify({ executionId })}</arguments></use_procedure>`,
      );
      const result = await handler.execute(
        parsed.find((x) => x.type === "tool_use")!,
        false,
      );
      expect(order).toEqual(["approve", "status", "checkpoint", "control"]);
      expect(client.control).toHaveBeenCalledWith(action, executionId);
      expect(context.recordAutoApprovedRequest).not.toHaveBeenCalled();
      expect(client.execute).not.toHaveBeenCalled();
      expect(result.toolResponse).toContain("control_returned");
    }
  });

  it("does not use resume as approval or input and rejects unsupported control parameters", async () => {
    for (const state of [
      "WAITING_FOR_APPROVAL",
      "WAITING_FOR_USER",
      "WAITING_UNTIL",
      "QUARANTINED",
      "SUCCESS",
      "PENDING",
    ]) {
      const { handler, client, context } = fixture();
      client.status.mockResolvedValue({
        id: executionId,
        state,
        terminal: false,
        succeeded: false,
      });
      expect(
        (await handler.execute(block("resume", { executionId }), false))
          .toolResponse,
      ).toContain("CONTROL_NOT_APPLICABLE");
      expect(client.control).not.toHaveBeenCalled();
      expect(context.saveCheckpoint).not.toHaveBeenCalled();
    }
    for (const args of [
      { executionId, approved: true },
      { executionId, inputs: {} },
      { executionId: "bad" },
    ]) {
      const { handler, client, context } = fixture();
      expect(
        (await handler.execute(block("resume", args), false)).toolResponse,
      ).toContain("INVALID_INPUT");
      expect(context.ask).not.toHaveBeenCalled();
      expect(client.status).not.toHaveBeenCalled();
      expect(client.control).not.toHaveBeenCalled();
    }
  });

  it("stops control at denied, mode, active-task, status and checkpoint boundaries", async () => {
    for (const boundary of [
      "denied",
      "plan",
      "approval-plan",
      "approval-ended",
      "read-plan",
      "read-ended",
      "read-error",
      "checkpoint",
      "checkpoint-plan",
      "checkpoint-ended",
    ]) {
      const { handler, context, client } = fixture(boundary !== "denied", true);
      client.status.mockImplementation(async () => {
        if (boundary === "read-plan")
          context.getChatMode.mockReturnValue("plan");
        if (boundary === "read-ended")
          (context as any).isTaskActive = () => false;
        if (boundary === "read-error")
          throw new ValkyrProcedureError("STATUS_UNAVAILABLE");
        return {
          id: executionId,
          state: "RUNNING",
          terminal: false,
          succeeded: false,
        };
      });
      if (boundary === "plan") context.getChatMode.mockReturnValue("plan");
      if (boundary === "approval-plan" || boundary === "approval-ended") {
        context.ask.mockImplementation(async () => {
          if (boundary === "approval-plan")
            context.getChatMode.mockReturnValue("plan");
          else (context as any).isTaskActive = () => false;
          return { response: "yesButtonClicked" };
        });
      }
      if (boundary === "checkpoint")
        context.saveCheckpoint.mockRejectedValue(new Error("private-secret"));
      if (boundary === "checkpoint-plan")
        context.saveCheckpoint.mockImplementation(async () => {
          context.getChatMode.mockReturnValue("plan");
        });
      if (boundary === "checkpoint-ended")
        context.saveCheckpoint.mockImplementation(async () => {
          (context as any).isTaskActive = () => false;
        });
      const result = await handler.execute(
        block("pause", { executionId }),
        false,
      );
      if (boundary === "denied") expect(result.userRejected).toBe(true);
      else
        expect(result.toolResponse).toContain(
          boundary.includes("plan")
            ? "PLAN_MODE"
            : boundary.includes("ended")
              ? "TASK_ENDED"
              : boundary === "read-error"
                ? "STATUS_UNAVAILABLE"
                : "PREPARATION_FAILED",
        );
      expect(client.control).not.toHaveBeenCalled();
      expect(client.execute).not.toHaveBeenCalled();
    }
  });

  it("retains the exact control reference on an uncertain write and never retries", async () => {
    const { handler, context, client } = fixture();
    client.status.mockResolvedValue({
      id: executionId,
      state: "RUNNING",
      terminal: false,
      succeeded: false,
    });
    client.control.mockRejectedValue(new Error("private-secret"));
    const result = await handler.execute(
      block("pause", { executionId }),
      false,
    );
    expect(result.toolResponse).toContain("CONTROL_OUTCOME_UNKNOWN");
    expect(result.toolResponse).not.toContain("private-secret");
    expect(client.control).toHaveBeenCalledTimes(1);
    expect(client.execute).not.toHaveBeenCalled();
    const card = JSON.parse(
      JSON.parse(String(context.say.mock.calls[0][1])).content,
    );
    expect(card).toMatchObject({
      phase: "error",
      action: "pause",
      backend: client.baseUrl,
      executionId,
    });
  });

  it("parses the real agent tool and approves/checkpoints before dispatch with host-bound identity", async () => {
    const { handler, client, context, order } = fixture();
    const parsed = parseAssistantMessage(
      `<use_procedure><action>execute</action><arguments>${JSON.stringify(params)}</arguments></use_procedure>`,
    );
    const tool = parsed.find((item) => item.type === "tool_use")!;
    expect(tool).toMatchObject({
      type: "tool_use",
      name: "use_procedure",
      partial: false,
    });
    const result = await handler.execute(tool, false);
    expect(order).toEqual(["approve", "checkpoint", "execute"]);
    expect(client.execute).toHaveBeenCalledWith({
      taskType: "workflow",
      procedureHints: ["procedure:reconcile:v1"],
      inputs: { amount: 42 },
      traceId: procedureTraceId("task-42", "reconcile-42"),
    });
    expect(context.ask).toHaveBeenCalledWith(
      "tool",
      expect.stringContaining('"tool":"useProcedure"'),
      false,
    );
    expect(result.toolResponse).toContain('"procedure_started"');
    expect(result.toolResponse).not.toContain('"succeeded":true');
    const card = JSON.parse(
      JSON.parse(String(context.say.mock.calls[0][1])).content,
    );
    expect(card).toMatchObject({ phase: "result", backend: client.baseUrl });
  });

  it("never starts a partial, denied or malformed call", async () => {
    const { handler, client, context } = fixture(false);
    await handler.execute(block("execute", params, true), true);
    expect(context.ask).not.toHaveBeenCalled();
    expect(await handler.execute(block(), false)).toMatchObject({
      userRejected: true,
    });
    await handler.execute(
      block("execute", { ...params, tenantId: "other" }),
      false,
    );
    expect(context.ask).toHaveBeenCalledTimes(1);
    expect(client.execute).not.toHaveBeenCalled();
    expect(context.saveCheckpoint).not.toHaveBeenCalled();
  });

  it("honors explicit auto approval while retaining the checkpoint and server execution path", async () => {
    const { handler, client, context, order } = fixture(true, true);
    await handler.execute(block(), false);
    await handler.execute(block(), false);
    expect(context.ask).not.toHaveBeenCalled();
    expect(context.recordAutoApprovedRequest).toHaveBeenCalledTimes(2);
    expect(order).toEqual(["checkpoint", "execute", "checkpoint", "execute"]);
    expect(client.execute.mock.calls[0]).toEqual(client.execute.mock.calls[1]);
  });

  it("searches and reads status without starting a workflow or writing a checkpoint", async () => {
    const { handler, client, context } = fixture(true, true);
    await handler.execute(
      block("search", { taskType: "workflow", page: 1 }),
      false,
    );
    await handler.execute(block("status", { executionId }), false);
    expect(client.search).toHaveBeenCalledWith({
      taskType: "workflow",
      page: 1,
    });
    expect(client.status).toHaveBeenCalledWith(executionId);
    expect(client.execute).not.toHaveBeenCalled();
    expect(context.saveCheckpoint).not.toHaveBeenCalled();
  });

  it("keeps unknown dispatch visible and does not invoke fallback or echo transport details", async () => {
    const { handler, client, context } = fixture(true, true);
    client.execute.mockRejectedValue(
      new ValkyrProcedureError("DISPATCH_OUTCOME_UNKNOWN"),
    );
    const result = await handler.execute(block(), false);
    expect(result.toolResponse).toContain("DISPATCH_OUTCOME_UNKNOWN");
    expect(client.execute).toHaveBeenCalledTimes(1);
    expect(client.status).not.toHaveBeenCalled();
    context.getProcedureClient.mockRejectedValue(new Error("private-secret"));
    const error = await handler.execute(block(), false);
    expect(error.toolResponse).not.toContain("private-secret");
  });

  it("blocks plan mode before approval and rechecks it after approval and checkpoint", async () => {
    for (const boundary of ["initial", "approval", "checkpoint"]) {
      const { handler, context, client } = fixture();
      if (boundary === "initial") context.getChatMode.mockReturnValue("plan");
      if (boundary === "approval")
        context.ask.mockImplementation(async () => {
          context.getChatMode.mockReturnValue("plan");
          return { response: "yesButtonClicked" };
        });
      if (boundary === "checkpoint")
        context.saveCheckpoint.mockImplementation(async () => {
          context.getChatMode.mockReturnValue("plan");
        });
      expect((await handler.execute(block(), false)).toolResponse).toContain(
        "PLAN_MODE",
      );
      expect(client.execute).not.toHaveBeenCalled();
      if (boundary === "initial")
        expect(context.getProcedureClient).not.toHaveBeenCalled();
    }
  });

  it("does not dispatch when the checkpoint barrier fails", async () => {
    const { handler, context, client } = fixture();
    context.saveCheckpoint.mockRejectedValue(
      new Error("private-checkpoint-details"),
    );
    expect((await handler.execute(block(), false)).toolResponse).toContain(
      "PREPARATION_FAILED",
    );
    expect(client.execute).not.toHaveBeenCalled();
  });
});

describe("native procedure inspection", () => {
  it("uses the existing approval boundary without checkpoint or dispatch", async () => {
    const { handler, context, client, order } = fixture();
    const result = await handler.execute(
      block("inspect", { procedureId: executionId }),
      false,
    );
    expect(order).toEqual(["approve"]);
    expect(client.inspect).toHaveBeenCalledWith(executionId);
    expect(client.execute).not.toHaveBeenCalled();
    expect(context.saveCheckpoint).not.toHaveBeenCalled();
    expect(result.outcome).toBe("succeeded");
  });
  for (const args of [
    { procedureId: executionId, url: "https://bad.test" },
    { procedureId: "not-a-uuid" },
    { executionId },
  ]) {
    it("rejects invalid inspection parameters before any request", async () => {
      const { handler, client } = fixture();
      const result = await handler.execute(block("inspect", args), false);
      expect(client.inspect).not.toHaveBeenCalled();
      expect(result.outcome).toBe("blocked");
    });
  }
  it("honors a rejected inspection and Act mode", async () => {
    const f = fixture(false);
    expect(
      (
        await f.handler.execute(
          block("inspect", { procedureId: executionId }),
          false,
        )
      ).outcome,
    ).toBe("rejected");
    expect(f.client.inspect).not.toHaveBeenCalled();
    const g = fixture();
    g.context.getChatMode.mockReturnValue("plan");
    expect(
      (
        await g.handler.execute(
          block("inspect", { procedureId: executionId }),
          false,
        )
      ).outcome,
    ).toBe("blocked");
    expect(g.client.inspect).not.toHaveBeenCalled();
  });
  it("preserves the inspected schema after card delivery fails", async () => {
    const f = fixture();
    f.context.say.mockRejectedValueOnce(new Error("private-card-error"));
    const result = await f.handler.execute(
      block("inspect", { procedureId: executionId }),
      false,
    );
    expect(result.outcome).toBe("succeeded");
    expect(JSON.parse(String(result.toolResponse))).toMatchObject({
      status: "input_contract_available",
      presentation: { status: "unverified" },
    });
    expect(f.client.inspect).toHaveBeenCalledTimes(1);
  });
});
