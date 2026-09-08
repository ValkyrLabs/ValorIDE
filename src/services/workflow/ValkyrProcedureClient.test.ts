import {
  ValkyrProcedureClient,
  createSessionBoundProcedureClient,
  procedureTraceId,
} from "./ValkyrProcedureClient";

const executionId = "6b5f4311-bf51-448a-83c8-e391c435314e";
const versionId = "bfdeef65-350b-46af-a4ad-4bc82586fc4c";
const workflowId = "4d7b1763-71e6-4e8e-a1ee-b3cc39d6c671";
const request = () => ({
  taskType: "workflow",
  traceId: "case-42",
  procedureHints: ["procedure:reconcile:v1"],
  inputs: { amount: 42 },
});
const response = () => ({
  status: "procedure_started",
  deterministicAttempted: true,
  agentExecutionPerformed: false,
  procedureRef: "procedure:reconcile:v1",
  workflowVersionId: versionId,
  workflowExecution: {
    id: executionId,
    state: "RUNNING",
    inputs: { token: "private-secret" },
  },
  route: {
    recommendedRoute: "run_procedure",
    receipt: { receiptRef: "route:42" },
  },
  fallbackRoute: "call_hosted_cheap_model",
});
const candidate = () => ({
  id: executionId,
  procedureRef: "procedure:reconcile:v1",
  name: "Reconcile a case",
  taskType: "workflow",
  enabled: true,
  deterministic: true,
  lifecycleStatus: "active",
  workflowBindingStatus: "active",
  workflowVersionId: versionId,
  workflowContentHash: "a".repeat(64),
  workflowAbiHash: "b".repeat(64),
  mechanizationReceiptRef: "mechanization:42",
  confidence: 0.9,
  metadataJson: JSON.stringify({
    private: "private-secret",
    procedureContract: {
      version: 1,
      requiredInputKeys: ["amount"],
      inputTypes: { amount: "number" },
      inputAliases: {},
      objectReferences: {},
    },
  }),
});

function fixture(reply: unknown = response(), status = 202) {
  const fetch = jest.fn(
    async (_url: string, _init?: RequestInit) =>
      ({
        ok: status >= 200 && status < 300,
        status,
        headers: {
          get: (name: string) =>
            name.toLowerCase() === "content-type" ? "application/json" : null,
        },
        json: async () => reply,
        text: async () => JSON.stringify(reply),
      }) as unknown as Response,
  );
  return {
    fetch,
    client: new ValkyrProcedureClient({
      baseUrl: "https://api-0.valkyrlabs.com",
      fetch,
      getAuthToken: () => "session-token",
    }),
  };
}

describe("Valkyr procedure consumption", () => {
  it("controls only the exact execution through the canonical routes without a resume payload", async () => {
    for (const [action, endpoint, state] of [
      ["pause", "pause", "PAUSED"],
      ["resume", "resume", "RUNNING"],
      ["cancel", "stop", "CANCELLED"],
    ] as const) {
      const { client, fetch } = fixture(
        { id: executionId, workflowId, state, contextData: "private-secret" },
        200,
      );
      expect(await client.control(action, executionId)).toEqual({
        status: "control_returned",
        action,
        workflow: {
          id: executionId,
          workflowId,
          state,
          terminal: state === "CANCELLED",
          succeeded: false,
        },
      });
      expect(fetch).toHaveBeenCalledTimes(1);
      const [url, init] = fetch.mock.calls[0];
      expect(url).toBe(
        `https://api-0.valkyrlabs.com/v1/vaiworkflow/executions/${executionId}/${endpoint}`,
      );
      expect(init?.method).toBe("POST");
      expect(init?.body).toBeUndefined();
    }
  });

  it("reports actual control response state and rejects ambiguous identities or HTTP status", async () => {
    for (const state of ["RUNNING", "SUCCESS"]) {
      const { client } = fixture({ id: executionId, state }, 200);
      expect((await client.control("pause", executionId)).workflow.state).toBe(
        state,
      );
    }
    for (const [body, status] of [
      [{ id: executionId, state: "PAUSED" }, 202],
      [{ id: versionId, state: "PAUSED" }, 200],
      [{ id: executionId, state: "constructor" }, 200],
      ["Execution paused", 200],
    ] as const) {
      const { client, fetch } = fixture(body, status);
      await expect(client.control("pause", executionId)).rejects.toMatchObject({
        code: "CONTROL_OUTCOME_UNKNOWN",
      });
      expect(fetch).toHaveBeenCalledTimes(1);
    }
  });

  it("keeps control denial, conflict and transport uncertainty distinct without retrying", async () => {
    for (const [status, code] of [
      [401, "UNAUTHENTICATED"],
      [403, "FORBIDDEN"],
      [409, "CONTROL_CONFLICT"],
      [500, "CONTROL_OUTCOME_UNKNOWN"],
    ] as const) {
      const { client, fetch } = fixture({ message: "private-secret" }, status);
      await expect(client.control("resume", executionId)).rejects.toMatchObject(
        { code },
      );
      expect(fetch).toHaveBeenCalledTimes(1);
    }
    const { client, fetch } = fixture();
    await expect(
      client.control("approve" as any, executionId),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
    await expect(client.control("resume", "../other")).rejects.toMatchObject({
      code: "INVALID_INPUT",
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects a control when the approved session or backend changed", async () => {
    for (const change of ["host", "session", "logout"]) {
      let host = "https://api-0.valkyrlabs.com",
        token: string | undefined = "original-session";
      const { fetch } = fixture({ id: executionId, state: "PAUSED" }, 200);
      const client = await createSessionBoundProcedureClient({
        getBaseUrl: () => host,
        getAuthToken: async () => token,
        fetch,
      });
      if (change === "host") host = "https://other.example";
      if (change === "session") token = "replacement-session";
      if (change === "logout") token = undefined;
      await expect(client.control("pause", executionId)).rejects.toMatchObject({
        code: "UNAUTHENTICATED",
      });
      expect(fetch).not.toHaveBeenCalled();
    }
  });

  it("projects only a validated workflow reference from exact execution reads and dispatch", async () => {
    const reply = {
      ...response(),
      workflowExecution: {
        ...response().workflowExecution,
        workflowId,
        contextData: "private-secret",
      },
    };
    const { client } = fixture(reply);
    expect((await client.execute(request())).workflow).toEqual({
      id: executionId,
      workflowId,
      state: "RUNNING",
      terminal: false,
      succeeded: false,
    });
    for (const reference of [
      workflowId,
      undefined,
      null,
      "javascript:alert(1)",
      { id: workflowId },
    ]) {
      const { client: reader } = fixture(
        { ...reply.workflowExecution, workflowId: reference },
        200,
      );
      const status = await reader.status(executionId);
      expect(status).toEqual({
        id: executionId,
        ...(reference === workflowId ? { workflowId } : {}),
        state: "RUNNING",
        terminal: false,
        succeeded: false,
      });
      expect(JSON.stringify(status)).not.toContain("private-secret");
    }
  });
  it("binds approval to the canonical backend and session without transporting changed credentials", async () => {
    for (const change of ["host", "session", "logout"]) {
      let host = "https://api-0.valkyrlabs.com",
        token: string | undefined = "original-session";
      const { fetch } = fixture();
      const client = await createSessionBoundProcedureClient({
        getBaseUrl: () => host,
        getAuthToken: async () => token,
        fetch,
      });
      if (change === "host") host = "https://other.example";
      if (change === "session") token = "replacement-session";
      if (change === "logout") token = undefined;
      await expect(client.execute(request())).rejects.toMatchObject({
        code: "UNAUTHENTICATED",
      });
      expect(fetch).not.toHaveBeenCalled();
    }
  });

  it("rejects missing auth before constructing an approvable client and accepts a stable session", async () => {
    const { fetch } = fixture();
    await expect(
      createSessionBoundProcedureClient({
        getBaseUrl: () => "https://api-0.valkyrlabs.com",
        getAuthToken: async () => undefined,
        fetch,
      }),
    ).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    const client = await createSessionBoundProcedureClient({
      getBaseUrl: () => "https://api-0.valkyrlabs.com",
      getAuthToken: async () => "session-token",
      fetch,
    });
    expect(await client.execute(request())).toMatchObject({
      status: "procedure_started",
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("uses shared authenticated RTK dispatch and returns a reference-only started result", async () => {
    const { client, fetch } = fixture();
    const result = await client.execute(request());
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("https://api-0.valkyrlabs.com/v1/skillopt_ops/execute");
    expect(init?.method).toBe("POST");
    expect((init?.headers as Record<string, string>).authorization).toBe(
      "Bearer session-token",
    );
    expect(JSON.parse(String(init?.body))).toEqual({
      routeRequest: {
        taskType: "workflow",
        traceId: "case-42",
        procedureHints: ["procedure:reconcile:v1"],
      },
      inputs: { amount: 42 },
    });
    expect(result).toMatchObject({
      status: "procedure_started",
      procedureRef: "procedure:reconcile:v1",
      workflowVersionId: versionId,
      workflow: {
        id: executionId,
        state: "RUNNING",
        terminal: false,
        succeeded: false,
      },
      agentExecutionPerformed: false,
    });
    expect(JSON.stringify(result)).not.toMatch(/private-secret|inputs/);
  });

  it("keeps blocked/fallback separate from actual execution and never calls an agent", async () => {
    for (const [status, route] of [
      ["blocked", "ask_human_approval"],
      ["fallback_required", "call_hosted_cheap_model"],
    ]) {
      const { client, fetch } = fixture(
        {
          status,
          route: {
            recommendedRoute: route,
            receipt: { receiptRef: "route:42" },
          },
          fallbackRoute: route,
          fallbackReason: "private-secret",
          deterministicAttempted: true,
          agentExecutionPerformed: false,
        },
        200,
      );
      expect(await client.execute(request())).toMatchObject({
        status,
        workflow: null,
        agentExecutionPerformed: false,
      });
      expect(fetch).toHaveBeenCalledTimes(1);
    }
  });

  it("rejects identity/policy overrides, reserved inputs and unbounded data before transport", async () => {
    const { client, fetch } = fixture();
    for (const input of [
      {},
      { ...request(), tenantId: "other" },
      { ...request(), traceId: "" },
      { ...request(), inputs: { _workflowExecutionRef: "other" } },
      { ...request(), inputs: { _skillOptMechanizedProcedure: true } },
      { ...request(), inputs: JSON.parse('{"__proto__":{"admin":true}}') },
      { ...request(), inputs: { a: "x".repeat(40000), b: "y".repeat(40000) } },
    ]) {
      await expect(client.execute(input)).rejects.toMatchObject({
        code: "INVALID_INPUT",
      });
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not expose raw transport errors or retry ambiguous dispatch", async () => {
    const { client, fetch } = fixture();
    fetch.mockRejectedValue(new Error("Bearer private-secret"));
    await expect(client.execute(request())).rejects.toMatchObject({
      code: "DISPATCH_OUTCOME_UNKNOWN",
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    try {
      await client.execute(request());
    } catch (error) {
      expect(String(error)).not.toMatch(/private-secret/);
    }
  });

  it("rejects inconsistent or unknown server dispatch contracts", async () => {
    for (const reply of [
      { ...response(), agentExecutionPerformed: true },
      { ...response(), workflowVersionId: null },
      { ...response(), status: "complete" },
      {
        ...response(),
        workflowExecution: { id: executionId, state: "COMPLETED" },
      },
      { ...response(), status: "blocked" },
    ]) {
      await expect(
        fixture(reply).client.execute(request()),
      ).rejects.toMatchObject({ code: "DISPATCH_OUTCOME_UNKNOWN" });
    }
    await expect(
      fixture(response(), 200).client.execute(request()),
    ).rejects.toMatchObject({ code: "DISPATCH_OUTCOME_UNKNOWN" });
  });

  it("requires current authentication and returns sanitized explicit permission errors", async () => {
    const fetch = jest.fn();
    const noSession = new ValkyrProcedureClient({
      baseUrl: "https://api-0.valkyrlabs.com",
      fetch,
      getAuthToken: () => undefined,
    });
    await expect(noSession.execute(request())).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
    expect(fetch).not.toHaveBeenCalled();
    for (const [status, code] of [
      [401, "UNAUTHENTICATED"],
      [403, "FORBIDDEN"],
      [402, "CREDITS_REQUIRED"],
      [409, "DISPATCH_CONFLICT"],
    ] as const) {
      const f = fixture({ message: "private-secret" }, status);
      await expect(f.client.execute(request())).rejects.toMatchObject({ code });
      expect(f.fetch).toHaveBeenCalledTimes(1);
    }
  });

  it("reads one exact execution and distinguishes terminal failure from waiting and success", async () => {
    for (const [state, terminal, succeeded] of [
      ["SUCCESS", true, true],
      ["FAILED", true, false],
      ["WAITING_FOR_APPROVAL", false, false],
    ] as const) {
      const { client, fetch } = fixture(
        { id: executionId, state, errorStack: "private-secret" },
        200,
      );
      expect(await client.status(executionId)).toEqual({
        id: executionId,
        state,
        terminal,
        succeeded,
      });
      expect(fetch.mock.calls[0][0]).toBe(
        `https://api-0.valkyrlabs.com/v1/WorkflowExecution/${executionId}`,
      );
      expect(fetch).toHaveBeenCalledTimes(1);
    }
    await expect(
      fixture({ id: versionId, state: "SUCCESS" }, 200).client.status(
        executionId,
      ),
    ).rejects.toMatchObject({ code: "STATUS_UNAVAILABLE" });
  });

  it("discovers a bounded authorized page with generated query-by-example and limited input contracts", async () => {
    const { client, fetch } = fixture([candidate()], 200);
    const result = await client.search({ taskType: "workflow", page: 1 });
    const url = new URL(fetch.mock.calls[0][0]);
    expect(url.pathname).toBe("/v1/Procedure");
    expect(url.searchParams.get("page")).toBe("1");
    expect(url.searchParams.get("size")).toBe("20");
    expect(JSON.parse(url.searchParams.get("example")!)).toEqual({
      taskType: "workflow",
      enabled: true,
      deterministic: true,
      lifecycleStatus: "active",
      workflowBindingStatus: "active",
    });
    expect(result.procedures[0]).toMatchObject({
      procedureRef: "procedure:reconcile:v1",
      inputContract: {
        version: 1,
        requiredInputKeys: ["amount"],
        inputTypes: { amount: "number" },
      },
    });
    expect(result.coverage).toMatchObject({
      page: 1,
      size: 20,
      scanned: 1,
      scope: "one_authorized_page",
      complete: false,
    });
    expect(JSON.stringify(result)).not.toMatch(
      /private-secret|metadataJson|tenantId/,
    );
  });

  it("never advertises inactive or malformed bindings as executable and reports bounded coverage", async () => {
    const { client } = fixture(
      [
        { ...candidate(), workflowBindingStatus: "rolled_back" },
        { ...candidate(), taskType: "billing" },
        { ...candidate(), workflowVersionId: "bad" },
        { ...candidate(), metadataJson: "broken" },
      ],
      200,
    );
    const result = await client.search({ taskType: "workflow" });
    expect(result.procedures).toEqual([]);
    expect(result.coverage.scanned).toBe(4);
    expect(result.coverage.complete).toBe(false);
    await expect(
      fixture(Array(21).fill(candidate()), 200).client.search({
        taskType: "workflow",
      }),
    ).rejects.toMatchObject({ code: "DISCOVERY_UNAVAILABLE" });
  });

  it("continues after short and fully excluded pages, with an explicit end and page limit", async () => {
    for (const rows of [
      [candidate()],
      [{ ...candidate(), metadataJson: "broken" }],
    ]) {
      const { client, fetch } = fixture(rows, 200);
      const result = await client.search({ taskType: "workflow", page: 2 });
      expect(result.coverage).toMatchObject({
        page: 2,
        scanned: 1,
        complete: false,
        nextPage: 3,
        stopReason: null,
      });
      expect(fetch).toHaveBeenCalledTimes(1);
    }
    const end = await fixture([], 200).client.search({
      taskType: "workflow",
      page: 3,
    });
    expect(end.coverage).toMatchObject({
      scanned: 0,
      complete: false,
      nextPage: null,
      stopReason: "end_of_list",
    });
    const limit = await fixture([candidate()], 200).client.search({
      taskType: "workflow",
      page: 10000,
    });
    expect(limit.coverage).toMatchObject({
      scanned: 1,
      complete: false,
      nextPage: null,
      stopReason: "page_limit",
    });
  });

  it("projects only a valid optional workflow target for candidate review", async () => {
    for (const value of [workflowId, undefined, "bad", { id: workflowId }]) {
      const result = await fixture(
        [{ ...candidate(), workflowId: value }],
        200,
      ).client.search({ taskType: "workflow" });
      expect(result.procedures).toHaveLength(1);
      if (value === workflowId)
        expect(result.procedures[0]).toMatchObject({ workflowId });
      else expect(result.procedures[0]).not.toHaveProperty("workflowId");
    }
  });

  it("derives stable bounded dispatch identity from task plus logical operation", () => {
    expect(procedureTraceId("task-one", "reconcile-42")).toBe(
      procedureTraceId("task-one", "reconcile-42"),
    );
    expect(procedureTraceId("task-one", "reconcile-42")).not.toBe(
      procedureTraceId("task-two", "reconcile-42"),
    );
    expect(procedureTraceId("task-one", "reconcile-42")).toMatch(
      /^valoride-procedure:[0-9a-f]{64}$/,
    );
    expect(() => procedureTraceId("", "op")).toThrow();
  });
});

describe("exact procedure input inspection", () => {
  const schema = {
    type: "object",
    properties: {
      task: {
        type: "object",
        required: ["invoices"],
        properties: { invoices: { type: "array", items: { type: "object" } } },
      },
    },
  };
  function inspectFixture(
    change: Record<string, unknown> = {},
    procedureChange: Record<string, unknown> = {},
  ) {
    let token = "session-token";
    const procedure = { ...candidate(), workflowId, ...procedureChange };
    const version = {
      id: versionId,
      workflowId,
      contentHash: "a".repeat(64),
      abiHash: "b".repeat(64),
      validationStatus: "VALID",
      launchInputSchema: JSON.stringify(schema),
      definitionSnapshot: "private-secret",
      ...change,
    };
    const fetch = jest.fn(
      async (url: string, _init?: RequestInit) =>
        new Response(
          JSON.stringify(
            url.includes("/WorkflowVersion/") ? version : procedure,
          ),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    );
    const client = new ValkyrProcedureClient({
      baseUrl: "https://api-0.valkyrlabs.com",
      fetch,
      getAuthToken: () => token,
    });
    return {
      client,
      fetch,
      setToken: (value: string) => {
        token = value;
      },
    };
  }
  it("reads the exact bound version and returns only its declared nested contract", async () => {
    const { client, fetch } = inspectFixture();
    const result = await client.inspect(executionId);
    expect(result).toMatchObject({
      status: "input_contract_available",
      procedureId: executionId,
      workflowVersionId: versionId,
      workflowId,
      inputSchema: schema,
      runtimeValidationRequired: true,
      reason: null,
    });
    expect(result.schemaSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(result)).not.toContain("private-secret");
    expect(fetch.mock.calls.map(([url, init]) => [url, init?.method])).toEqual([
      [`https://api-0.valkyrlabs.com/v1/Procedure/${executionId}`, "GET"],
      [`https://api-0.valkyrlabs.com/v1/WorkflowVersion/${versionId}`, "GET"],
    ]);
  });
  for (const [field, value] of [
    ["id", executionId],
    ["workflowId", executionId],
    ["contentHash", "c".repeat(64)],
    ["abiHash", "c".repeat(64)],
  ]) {
    it(`rejects a mismatched version ${field}`, async () => {
      await expect(
        inspectFixture({ [field as string]: value }).client.inspect(
          executionId,
        ),
      ).rejects.toMatchObject({ code: "INSPECTION_UNAVAILABLE" });
    });
  }
  it("rejects mismatched Procedure identity before reading a version", async () => {
    const { client, fetch } = inspectFixture({}, { id: versionId });
    await expect(client.inspect(executionId)).rejects.toMatchObject({
      code: "INSPECTION_UNAVAILABLE",
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  for (const [value, reason] of [
    [null, "not_declared"],
    ["{", "schema_invalid"],
    ["[]", "schema_unprojectable"],
    ["x".repeat(65537), "schema_too_large"],
  ]) {
    it(`reports unavailable schema ${reason} explicitly`, async () => {
      expect(
        await inspectFixture({ launchInputSchema: value }).client.inspect(
          executionId,
        ),
      ).toMatchObject({
        status: "input_contract_unavailable",
        inputSchema: null,
        schemaSha256: null,
        reason,
        runtimeValidationRequired: true,
      });
    });
  }
  it("inspects a shadow binding without advertising runtime eligibility", async () => {
    const result = await inspectFixture(
      {},
      {
        enabled: false,
        lifecycleStatus: "shadow",
        workflowBindingStatus: "shadow",
      },
    ).client.inspect(executionId);
    expect(result.status).toBe("input_contract_available");
    expect(result.runtimeValidationRequired).toBe(true);
    expect(result).not.toHaveProperty("eligibility");
  });
  for (const requestIndex of [0, 1]) {
    it(`discards results when account changes during read ${requestIndex + 1}`, async () => {
      const f = inspectFixture();
      const original = f.fetch.getMockImplementation()!;
      let count = 0;
      f.fetch.mockImplementation(async (...args) => {
        const result = await original(...args);
        if (count++ === requestIndex) f.setToken("different-account");
        return result;
      });
      await expect(f.client.inspect(executionId)).rejects.toMatchObject({
        code: "UNAUTHENTICATED",
      });
      expect(f.fetch).toHaveBeenCalledTimes(requestIndex + 1);
    });
  }
  it("returns references as schema data without fetching them", async () => {
    const value = {
      type: "object",
      properties: { task: { $ref: "https://untrusted.invalid/schema" } },
    };
    const f = inspectFixture({ launchInputSchema: JSON.stringify(value) });
    expect((await f.client.inspect(executionId)).inputSchema).toEqual(value);
    expect(f.fetch).toHaveBeenCalledTimes(2);
  });
  for (const status of [401, 403, 500]) {
    it(`does not disclose a contract after version HTTP ${status}`, async () => {
      const f = inspectFixture();
      f.fetch
        .mockImplementationOnce(
          async () =>
            new Response(JSON.stringify({ ...candidate(), workflowId }), {
              status: 200,
              headers: { "content-type": "application/json" },
            }),
        )
        .mockImplementationOnce(
          async () => new Response("private-secret", { status }),
        );
      await expect(f.client.inspect(executionId)).rejects.toMatchObject({
        code:
          status === 401
            ? "UNAUTHENTICATED"
            : status === 403
              ? "FORBIDDEN"
              : "INSPECTION_UNAVAILABLE",
      });
    });
  }
});
