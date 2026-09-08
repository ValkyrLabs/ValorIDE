jest.mock("serialize-error", () => ({
  serializeError: (error: any) => ({ message: error.message }),
}));
jest.mock("@integrations/notifications", () => ({
  showSystemNotification: jest.fn(),
}));
jest.mock("@integrations/misc/extract-text", () => ({}));
jest.mock("@services/glob/list-files", () => ({}));
jest.mock("@services/tree-sitter", () => ({}));
jest.mock("@services/ripgrep", () => ({}));
jest.mock("@core/prompts/loadMcpDocumentation", () => ({}));
jest.mock("@services/telemetry/TelemetryService", () => ({
  telemetryService: { captureUnknownTool: jest.fn() },
}));
jest.mock("@services/logging/Logger", () => ({
  Logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock("./tools/FileToolHandler", () => ({ FileToolHandler: class {} }));
jest.mock("./tools/CommandToolHandler", () => ({
  CommandToolHandler: class {},
}));
jest.mock("./tools/BrowserToolHandler", () => ({
  BrowserToolHandler: class {},
}));
jest.mock("@core/hooks/ValorIDEHookService", () => ({
  ValorIDEHookService: class {
    findHookScripts = jest.fn(() => []);
    runPreToolUse = jest.fn(async () => undefined);
    runPostToolUse = jest.fn(async () => undefined);
  },
}));
const { ToolExecutionEngine } = jest.requireActual<
  typeof import("./ToolExecutionEngine")
>("./ToolExecutionEngine");

function fixture() {
  const order: string[] = [];
  const client = {
    baseUrl: "https://api-0.valkyrlabs.com/v1",
    inspect: jest.fn(async () => ({
      status: "input_contract_available",
      inputSchema: { type: "object", properties: { task: { type: "object" } } },
      runtimeValidationRequired: true,
    })),
    execute: jest.fn(async () => {
      order.push("dispatch");
      return { status: "blocked" };
    }),
  };
  const task = {
    taskId: "task-1",
    abort: false,
    chatSettings: { mode: "act" },
    autoApprovalSettings: { enabled: false },
    consecutiveAutoApprovedRequestsCount: 0,
    getProcedureClient: jest.fn(async () => client),
    ask: jest.fn(async () => {
      order.push("approval");
      return { response: "yesButtonClicked" };
    }),
    say: jest.fn(async () => undefined),
    saveCheckpoint: jest.fn(async (..._args: any[]) => {
      order.push("checkpoint");
    }),
    shouldAutoApproveTool: () => false,
    shouldAutoApproveToolWithPath: () => false,
    sayAndCreateMissingParamError: jest.fn(),
    removeLastPartialMessageIfExistsWithType: jest.fn(),
    browserSession: { closeBrowser: jest.fn(async () => undefined) },
  };
  const engine = new ToolExecutionEngine(task, "/tmp");
  const hooks = (engine as any).hookService;
  const results: any[] = [];
  const call = () =>
    engine.executeToolBlock(
      {
        type: "tool_use",
        name: "use_procedure",
        partial: false,
        params: {
          action: "execute",
          arguments:
            '{"taskType":"workflow","operationRef":"case-1","inputs":{}}',
        },
      },
      () => "use_procedure",
      results,
      false,
      false,
      () => "",
      () => undefined,
    );
  return { task, client, hooks, results, call, order, engine };
}

describe("procedure tool through the shared execution engine", () => {
  it("delivers the known dispatch to agent history when its chat card fails", async () => {
    const { task, client, call, results } = fixture();
    client.execute.mockResolvedValue({
      status: "procedure_started",
      workflow: {
        id: "6b5f4311-bf51-448a-83c8-e391c435314e",
        state: "RUNNING",
      },
    } as any);
    task.say.mockRejectedValue(new Error("private-card-secret"));
    expect(await call()).toMatchObject({
      handled: true,
      didAlreadyUseTool: true,
    });
    const history = JSON.stringify(results);
    expect(history).toContain("procedure_started");
    expect(history).toContain("6b5f4311-bf51-448a-83c8-e391c435314e");
    expect(history).toContain("presentation");
    expect(history).not.toContain("DISPATCH_OUTCOME_UNKNOWN");
    expect(history).not.toContain("private-card-secret");
    expect(client.execute).toHaveBeenCalledTimes(1);
  });

  it("does not dispatch after the task stops while a checkpoint is being captured", async () => {
    const { task, call, client, results } = fixture();
    task.saveCheckpoint.mockImplementation(async () => {
      task.abort = true;
    });
    await call();
    expect(client.execute).not.toHaveBeenCalled();
    expect(JSON.stringify(results)).toContain("TASK_ENDED");
  });
  it("waits on checkpoint capture before an active hook and again before remote dispatch", async () => {
    const { task, client, hooks, call, order } = fixture();
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    task.saveCheckpoint.mockImplementation(async () => {
      order.push("checkpoint");
      await pending;
    });
    hooks.findHookScripts.mockReturnValue(["configured-hook"]);
    hooks.runPreToolUse.mockImplementation(async () => {
      order.push("pre-hook");
    });
    hooks.runPostToolUse.mockImplementation(async () => {
      order.push("post-hook");
    });
    const running = call();
    await Promise.resolve();
    await Promise.resolve();
    expect(hooks.runPreToolUse).not.toHaveBeenCalled();
    expect(client.execute).not.toHaveBeenCalled();
    release();
    await running;
    expect(order).toEqual([
      "checkpoint",
      "pre-hook",
      "approval",
      "checkpoint",
      "dispatch",
      "post-hook",
    ]);
    expect(task.saveCheckpoint).toHaveBeenCalledWith(false, true);
  });
  it("honors hook cancellation without requesting approval or dispatching", async () => {
    const { hooks, call, task, client } = fixture();
    hooks.runPreToolUse.mockResolvedValue({
      cancel: true,
      context: "Needs review",
    });
    expect(await call()).toMatchObject({ didRejectTool: true });
    expect(task.getProcedureClient).not.toHaveBeenCalled();
    expect(client.execute).not.toHaveBeenCalled();
  });
  it("blocks Plan mode before hooks and transport", async () => {
    const { task, hooks, call, results } = fixture();
    task.chatSettings.mode = "plan";
    expect(await call()).toMatchObject({ handled: true });
    expect(JSON.stringify(results)).toContain("PLAN_MODE");
    expect(hooks.runPreToolUse).not.toHaveBeenCalled();
    expect(task.getProcedureClient).not.toHaveBeenCalled();
  });
  it("validates hook overrides before approval so hooks cannot inject caller authority", async () => {
    const { hooks, call, task, results } = fixture();
    hooks.runPreToolUse.mockResolvedValue({
      overrideInput: {
        arguments:
          '{"taskType":"workflow","operationRef":"case-1","tenantId":"other","inputs":{}}',
      },
    });
    await call();
    expect(JSON.stringify(results)).toContain("INVALID_INPUT");
    expect(task.ask).not.toHaveBeenCalled();
  });
});

describe("explicit tool outcomes for execution evidence", () => {
  for (const [response, outcome] of [
    [{ status: "blocked" }, "blocked"],
    [{ status: "agent_fallback" }, "pending"],
    [
      {
        status: "procedure_started",
        workflow: {
          id: "6b5f4311-bf51-448a-83c8-e391c435314e",
          state: "RUNNING",
        },
      },
      "pending",
    ],
  ] as const) {
    it(`does not treat ${response.status} as completed successful work`, async () => {
      const { client, hooks, call } = fixture();
      client.execute.mockResolvedValue(response as any);
      await call();
      expect(hooks.runPostToolUse).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, outcome }),
      );
    });
  }

  it("reports a validation block without marking the procedure successful", async () => {
    const { hooks, client, call } = fixture();
    hooks.runPreToolUse.mockResolvedValue({
      overrideInput: { arguments: "invalid-json" },
    });
    await call();
    expect(client.execute).not.toHaveBeenCalled();
    expect(hooks.runPostToolUse).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, outcome: "blocked" }),
    );
  });

  it("keeps an uncertain dispatch distinct from success or confirmed failure", async () => {
    const { hooks, client, call } = fixture();
    client.execute.mockRejectedValue(new Error("uncertain transport"));
    await call();
    expect(hooks.runPostToolUse).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, outcome: "unknown" }),
    );
    expect(client.execute).toHaveBeenCalledTimes(1);
  });

  it("keeps an accepted workflow pending when its result card fails", async () => {
    const { hooks, client, task, call } = fixture();
    client.execute.mockResolvedValue({
      status: "procedure_started",
      workflow: {
        id: "6b5f4311-bf51-448a-83c8-e391c435314e",
        state: "RUNNING",
      },
    } as any);
    task.say.mockRejectedValue(new Error("card unavailable"));
    await call();
    expect(hooks.runPostToolUse).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, outcome: "pending" }),
    );
    expect(client.execute).toHaveBeenCalledTimes(1);
  });

  for (const [result, outcome, success] of [
    [
      { shouldContinue: true, toolResponse: "handled response" },
      "unknown",
      false,
    ],
    [
      {
        shouldContinue: true,
        outcome: "succeeded",
        toolResponse: "The data contains the word Error.",
      },
      "succeeded",
      true,
    ],
    [
      {
        shouldContinue: true,
        outcome: "failed",
        toolResponse: "operation failed",
      },
      "failed",
      false,
    ],
    [{ shouldContinue: true, userRejected: true }, "rejected", false],
    [
      { shouldContinue: true, outcome: "succeeded", userRejected: true },
      "succeeded",
      true,
    ],
  ] as const) {
    it(`carries explicit ${outcome} without inferring success from prose or handling`, async () => {
      const { engine, hooks, call } = fixture();
      jest
        .spyOn((engine as any).toolManager, "executeTool")
        .mockResolvedValue(result);
      await call();
      expect(hooks.runPostToolUse).toHaveBeenCalledWith(
        expect.objectContaining({ outcome, success }),
      );
    });
  }

  it("does not label a caught tool exception successful", async () => {
    const { engine, hooks, call } = fixture();
    jest
      .spyOn((engine as any).toolManager, "executeTool")
      .mockRejectedValue(new Error("tool failed"));
    await call();
    expect(hooks.runPostToolUse).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "failed", success: false }),
    );
  });
});

it("delivers the inspected nested schema through the real tool engine", async () => {
  const { engine, client, results, task } = fixture();
  const id = "6b5f4311-bf51-448a-83c8-e391c435314e";
  await engine.executeToolBlock(
    {
      type: "tool_use",
      name: "use_procedure",
      partial: false,
      params: {
        action: "inspect",
        arguments: JSON.stringify({ procedureId: id }),
      },
    },
    () => "use_procedure",
    results,
    false,
    false,
    () => "",
    () => undefined,
  );
  expect(client.inspect).toHaveBeenCalledWith(id);
  expect(client.execute).not.toHaveBeenCalled();
  expect(task.saveCheckpoint).not.toHaveBeenCalled();
  expect(JSON.stringify(results)).toContain("input_contract_available");
  expect(JSON.stringify(results)).toContain("properties");
});
