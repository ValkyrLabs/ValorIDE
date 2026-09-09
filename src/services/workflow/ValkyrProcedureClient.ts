import { createHash } from "node:crypto";
import { normalizeValkyraiHost } from "@utils/serverValkyraiHost";
import {
  getValkyrLabsRtkApiClient,
  ValkyrLabsApiError,
  type ValkyrLabsFetch,
} from "@services/valkyrai/ValkyrLabsRtkApi";

export const PROCEDURE_TASK_TYPES = [
  "app_generation",
  "context_compile",
  "context_hydration",
  "context_recompression",
  "procedure",
  "workflow",
  "model_call",
  "validation",
  "billing",
  "swarm_command",
  "other",
] as const;
const ROUTES = new Set([
  "use_cached_context",
  "hydrate_context",
  "recompress_context",
  "run_procedure",
  "run_thorapi_generation",
  "run_workflow",
  "call_local_model",
  "call_hosted_cheap_model",
  "call_hosted_premium_model",
  "ask_human_approval",
  "stop_insufficient_credits",
  "stop_policy_denied",
]);
const BLOCKED = new Set([
  "ask_human_approval",
  "stop_insufficient_credits",
  "stop_policy_denied",
]);
const STATES = new Set([
  "PENDING",
  "RUNNING",
  "PAUSED",
  "WAITING_FOR_USER",
  "WAITING_FOR_APPROVAL",
  "WAITING_UNTIL",
  "QUARANTINED",
  "SUCCESS",
  "FAILED",
  "CANCELLED",
  "TIMEOUT",
]);
const TERMINAL = new Set(["SUCCESS", "FAILED", "CANCELLED", "TIMEOUT"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REF = /^[a-z0-9][a-z0-9._:/-]{0,127}$/i;
const HASH = /^[0-9a-f]{64}$/;
export const PROCEDURE_MAX_BYTES = 64 * 1024;

export type ProcedureErrorCode =
  | "TASK_ENDED"
  | "INVALID_INPUT"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "CREDITS_REQUIRED"
  | "DISPATCH_CONFLICT"
  | "DISPATCH_OUTCOME_UNKNOWN"
  | "STATUS_UNAVAILABLE"
  | "CONTROL_NOT_APPLICABLE"
  | "CONTROL_CONFLICT"
  | "CONTROL_OUTCOME_UNKNOWN"
  | "INSPECTION_UNAVAILABLE"
  | "DISCOVERY_UNAVAILABLE"
  | "PLAN_MODE"
  | "PREPARATION_FAILED";
const MESSAGES: Record<ProcedureErrorCode, string> = {
  TASK_ENDED: "The task has stopped. No procedure request was sent.",
  PLAN_MODE:
    "Switch to Act mode before using Valkyr procedures. No procedure request was sent.",
  PREPARATION_FAILED:
    "Procedure preparation could not be completed. No procedure request was sent.",
  INVALID_INPUT:
    "Provide bounded procedure parameters and a stable logical operation reference. Identity, policy and runtime overrides are not accepted.",
  UNAUTHENTICATED:
    "Sign in to the selected ValkyrAI backend before using procedures.",
  FORBIDDEN: "The selected account cannot access this procedure operation.",
  CREDITS_REQUIRED:
    "The selected account needs credits for this procedure operation.",
  DISPATCH_CONFLICT:
    "This logical task conflicts with an existing exact execution. Inspect the prior execution before deciding the next action.",
  DISPATCH_OUTCOME_UNKNOWN:
    "Dispatch could not be verified. Inspect a known execution or retry the original operation reference with unchanged inputs. No fallback agent was launched.",
  STATUS_UNAVAILABLE:
    "The exact execution state could not be verified. No outcome was inferred.",
  CONTROL_NOT_APPLICABLE:
    "This control does not apply to the observed execution state. Check its progress or open Workflow Studio for required input, approval or reconciliation.",
  CONTROL_CONFLICT:
    "ValkyrAI could not apply this control to the current execution. Inspect its state and required approval or reconciliation before another action.",
  CONTROL_OUTCOME_UNKNOWN:
    "The control outcome could not be verified. Inspect this exact execution before taking another action. No control was retried and no new execution was started.",
  INSPECTION_UNAVAILABLE:
    "The exact procedure input contract could not be verified. No execution was started.",
  DISCOVERY_UNAVAILABLE:
    "This authorized procedure page could not be verified. Missing results do not establish that no procedure exists.",
};
export class ValkyrProcedureError extends Error {
  constructor(readonly code: ProcedureErrorCode) {
    super(MESSAGES[code]);
    this.name = "ValkyrProcedureError";
  }
}
function fail(code: ProcedureErrorCode = "INVALID_INPUT"): never {
  throw new ValkyrProcedureError(code);
}
const record = (value: unknown): value is Record<string, any> =>
  value !== null &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  [Object.prototype, null].includes(Object.getPrototypeOf(value));
const reference = (value: unknown): value is string =>
  typeof value === "string" && REF.test(value);
const uuid = (value: unknown): value is string =>
  typeof value === "string" && UUID.test(value);
const taskType = (value: unknown): value is string =>
  typeof value === "string" &&
  (PROCEDURE_TASK_TYPES as readonly string[]).includes(value);

/** Detach plain data, bounding work before traversing the remainder. */
export function boundedProcedureJson(input: unknown): Record<string, any> {
  let nodes = 0,
    bytes = 0;
  const parents = new Set<object>();
  const add = (count: number) => {
    bytes += count;
    if (bytes > PROCEDURE_MAX_BYTES) fail();
  };
  const copy = (value: unknown, depth: number): any => {
    if (++nodes > 10000 || depth > 16) fail();
    if (
      value === null ||
      typeof value === "boolean" ||
      (typeof value === "number" && Number.isFinite(value)) ||
      (typeof value === "string" &&
        Buffer.byteLength(value) <= PROCEDURE_MAX_BYTES)
    ) {
      add(Buffer.byteLength(JSON.stringify(value)));
      return value;
    }
    if (
      typeof value !== "object" ||
      (!Array.isArray(value) && !record(value)) ||
      parents.has(value)
    )
      fail();
    parents.add(value);
    const keys = Reflect.ownKeys(value);
    if (keys.length > 10001 || keys.some((key) => typeof key !== "string"))
      fail();
    const descriptors = Object.getOwnPropertyDescriptors(value),
      array = Array.isArray(value);
    if (array && (value.length > 10000 || keys.length !== value.length + 1))
      fail();
    const output: any = array ? [] : {};
    let fields = 0;
    add(2);
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (array && key === "length") continue;
      if (
        ["__proto__", "prototype", "constructor"].includes(key) ||
        key.length > 256 ||
        !descriptor.enumerable ||
        !Object.hasOwn(descriptor, "value") ||
        (array &&
          (!/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= value.length))
      )
        fail();
      if (fields++) add(1);
      if (!array) add(Buffer.byteLength(JSON.stringify(key)) + 1);
      output[key] = copy(descriptor.value, depth + 1);
    }
    parents.delete(value);
    return output;
  };
  const output = copy(input, 0);
  if (!record(output)) fail();
  return output;
}

export function procedureTraceId(taskId: string, operationRef: string): string {
  if (
    typeof taskId !== "string" ||
    !taskId.trim() ||
    taskId.length > 256 ||
    !reference(operationRef)
  )
    fail();
  return `valoride-procedure:${createHash("sha256")
    .update(JSON.stringify([taskId, operationRef]))
    .digest("hex")}`;
}

export function prepareProcedureRequest(input: unknown) {
  const args = boundedProcedureJson(input);
  const allowed = new Set([
    "taskType",
    "traceId",
    "inputs",
    "procedureHints",
    "applicationId",
    "projectId",
    "contextPageId",
  ]);
  if (
    Object.keys(args).some((key) => !allowed.has(key)) ||
    !taskType(args.taskType) ||
    !reference(args.traceId) ||
    !record(args.inputs)
  )
    fail();
  if (
    Object.keys(args.inputs).some(
      (key) => /^_skillOpt/i.test(key) || key === "_workflowExecutionRef",
    )
  )
    fail();
  const routeRequest: Record<string, unknown> = {
    taskType: args.taskType,
    traceId: args.traceId,
  };
  for (const [source, target] of [
    ["applicationId", "application"],
    ["projectId", "project"],
    ["contextPageId", "contextPage"],
  ]) {
    if (Object.hasOwn(args, source)) {
      if (!uuid(args[source])) fail();
      routeRequest[target] = { id: args[source] };
    }
  }
  if (Object.hasOwn(args, "procedureHints")) {
    if (
      !Array.isArray(args.procedureHints) ||
      args.procedureHints.length > 25 ||
      !args.procedureHints.every(reference)
    )
      fail();
    routeRequest.procedureHints = args.procedureHints;
  }
  const payload = { routeRequest, inputs: args.inputs };
  if (Buffer.byteLength(JSON.stringify(payload)) > PROCEDURE_MAX_BYTES) fail();
  return payload;
}

export function prepareProcedureSearch(input: unknown): {
  taskType: string;
  page: number;
} {
  const args = boundedProcedureJson(input);
  if (
    Object.keys(args).some((key) => !["taskType", "page"].includes(key)) ||
    !taskType(args.taskType) ||
    (args.page !== undefined &&
      (!Number.isInteger(args.page) || args.page < 0 || args.page > 10000))
  )
    fail();
  return { taskType: args.taskType, page: args.page ?? 0 };
}
export function requireProcedureExecutionId(value: unknown): string {
  if (!uuid(value)) fail();
  return value;
}

export type ProcedureControlAction = "pause" | "resume" | "cancel";
export function isProcedureControlAction(
  value: unknown,
): value is ProcedureControlAction {
  return value === "pause" || value === "resume" || value === "cancel";
}

/** Advisory preflight only; current server authority and continuation rules still apply. */
export function requireProcedureControlState(
  action: ProcedureControlAction,
  state: string,
): void {
  const allowed =
    action === "pause"
      ? ["RUNNING"]
      : action === "resume"
        ? ["PAUSED"]
        : [
            "RUNNING",
            "PAUSED",
            "WAITING_FOR_USER",
            "WAITING_FOR_APPROVAL",
            "WAITING_UNTIL",
          ];
  if (!allowed.includes(state)) fail("CONTROL_NOT_APPLICABLE");
}

export interface ProcedureExecutionState {
  id: string;
  workflowId?: string;
  workflowVersionId?: string;
  state: string;
  terminal: boolean;
  succeeded: boolean;
}
export interface ProcedureControlResult {
  status: "control_returned";
  action: ProcedureControlAction;
  workflow: ProcedureExecutionState;
}
export interface ProcedureDispatchResult {
  status: "procedure_started" | "blocked" | "fallback_required";
  traceId: string;
  procedureRef: string | null;
  workflowVersionId: string | null;
  workflow: ProcedureExecutionState | null;
  recommendedRoute: string;
  fallbackRoute: string | null;
  routeReceiptRef: string;
  agentExecutionPerformed: false;
}
function executionState(
  value: unknown,
  expected?: string,
  expectedVersion?: string,
): ProcedureExecutionState {
  if (
    !record(value) ||
    !uuid(value.id) ||
    !STATES.has(value.state) ||
    (value.workflowVersionId != null &&
      (!uuid(value.workflowVersionId) ||
        (expectedVersion &&
          value.workflowVersionId.toLowerCase() !==
            expectedVersion.toLowerCase()))) ||
    (expected && value.id.toLowerCase() !== expected.toLowerCase())
  )
    fail("STATUS_UNAVAILABLE");
  return {
    id: value.id,
    ...(uuid(value.workflowId) ? { workflowId: value.workflowId } : {}),
    ...(uuid(value.workflowVersionId)
      ? { workflowVersionId: value.workflowVersionId }
      : {}),
    state: value.state,
    terminal: TERMINAL.has(value.state),
    succeeded: value.state === "SUCCESS",
  };
}
function dispatchResult(
  value: any,
  status: number,
  traceId: string,
): ProcedureDispatchResult {
  if (
    !record(value) ||
    !["procedure_started", "blocked", "fallback_required"].includes(
      value.status,
    ) ||
    value.deterministicAttempted !== true ||
    value.agentExecutionPerformed !== false ||
    !record(value.route) ||
    !ROUTES.has(value.route.recommendedRoute) ||
    !reference(value.route.receipt?.receiptRef) ||
    (value.fallbackRoute != null && !ROUTES.has(value.fallbackRoute))
  )
    fail("DISPATCH_OUTCOME_UNKNOWN");
  let workflow = null;
  if (value.status === "procedure_started") {
    if (
      status !== 202 ||
      value.route.recommendedRoute !== "run_procedure" ||
      !reference(value.procedureRef) ||
      !uuid(value.workflowVersionId)
    )
      fail("DISPATCH_OUTCOME_UNKNOWN");
    try {
      workflow = executionState(
        value.workflowExecution,
        undefined,
        value.workflowVersionId,
      );
    } catch {
      fail("DISPATCH_OUTCOME_UNKNOWN");
    }
  } else if (
    status !== 200 ||
    value.workflowExecution != null ||
    value.workflowVersionId != null ||
    value.procedureRef != null ||
    (value.status === "blocked") !==
      BLOCKED.has(value.route.recommendedRoute) ||
    (value.status === "blocked" &&
      value.fallbackRoute !== value.route.recommendedRoute)
  )
    fail("DISPATCH_OUTCOME_UNKNOWN");
  return {
    status: value.status,
    traceId,
    workflow,
    procedureRef: value.procedureRef ?? null,
    workflowVersionId: value.workflowVersionId ?? null,
    recommendedRoute: value.route.recommendedRoute,
    fallbackRoute: value.fallbackRoute ?? null,
    routeReceiptRef: value.route.receipt.receiptRef,
    agentExecutionPerformed: false,
  };
}

function inputContract(metadata: unknown): Record<string, unknown> | null {
  if (
    typeof metadata !== "string" ||
    Buffer.byteLength(metadata) > PROCEDURE_MAX_BYTES
  )
    return null;
  let parsed: any;
  try {
    parsed = boundedProcedureJson(JSON.parse(metadata)).procedureContract;
  } catch {
    return null;
  }
  if (
    !record(parsed) ||
    parsed.version !== 1 ||
    !Array.isArray(parsed.requiredInputKeys) ||
    parsed.requiredInputKeys.length > 50 ||
    !parsed.requiredInputKeys.every(reference)
  )
    return null;
  const result: Record<string, unknown> = {
    version: 1,
    requiredInputKeys: parsed.requiredInputKeys,
  };
  for (const field of ["inputTypes", "inputAliases", "objectReferences"]) {
    const mapping = parsed[field] ?? {};
    if (!record(mapping) || Object.keys(mapping).length > 50) return null;
    for (const [key, value] of Object.entries(mapping)) {
      if (!reference(key)) return null;
      if (
        field === "inputAliases"
          ? !Array.isArray(value) ||
            value.length > 20 ||
            !value.every(reference)
          : !reference(value)
      )
        return null;
    }
    result[field] = mapping;
  }
  return result;
}

export interface ProcedureCandidate {
  id: string;
  procedureRef: string;
  name: string;
  taskType: string;
  workflowId?: string;
  workflowVersionId: string;
  mechanizationReceiptRef: string;
  workflowContentHash: string;
  workflowAbiHash: string;
  inputContract: Record<string, unknown>;
  eligibility: "requires_runtime_validation";
}
function candidate(value: unknown, family: string): ProcedureCandidate | null {
  if (
    !record(value) ||
    !uuid(value.id) ||
    !reference(value.procedureRef) ||
    value.taskType !== family ||
    value.enabled !== true ||
    value.deterministic !== true ||
    value.lifecycleStatus !== "active" ||
    value.workflowBindingStatus !== "active" ||
    !uuid(value.workflowVersionId) ||
    !reference(value.mechanizationReceiptRef) ||
    typeof value.workflowContentHash !== "string" ||
    !HASH.test(value.workflowContentHash) ||
    typeof value.workflowAbiHash !== "string" ||
    !HASH.test(value.workflowAbiHash)
  )
    return null;
  const contract = inputContract(value.metadataJson);
  if (!contract) return null;
  return {
    id: value.id,
    procedureRef: value.procedureRef,
    name:
      typeof value.name === "string"
        ? value.name.slice(0, 256)
        : value.procedureRef,
    taskType: family,
    ...(uuid(value.workflowId) ? { workflowId: value.workflowId } : {}),
    workflowVersionId: value.workflowVersionId,
    mechanizationReceiptRef: value.mechanizationReceiptRef,
    workflowContentHash: value.workflowContentHash,
    workflowAbiHash: value.workflowAbiHash,
    inputContract: contract,
    eligibility: "requires_runtime_validation",
  };
}

export class ValkyrProcedureClient {
  readonly baseUrl: string;
  private readonly api: ReturnType<typeof getValkyrLabsRtkApiClient>;
  constructor(
    private readonly options: {
      baseUrl: string;
      fetch?: ValkyrLabsFetch;
      getAuthToken: () => Promise<string | undefined> | string | undefined;
    },
  ) {
    this.baseUrl = normalizeValkyraiHost(options.baseUrl);
    this.api = getValkyrLabsRtkApiClient(options.fetch);
  }
  private async request(
    endpoint: string,
    method: "GET" | "POST",
    json: unknown,
    unavailable: ProcedureErrorCode,
    readSession?: string,
  ) {
    const token = await this.options.getAuthToken();
    if (!token || (readSession !== undefined && token !== readSession))
      fail("UNAUTHENTICATED");
    try {
      const result = await this.api.request({
        url: `${this.baseUrl}${endpoint}`,
        method,
        ...(readSession === undefined
          ? {}
          : { maxResponseBytes: 2 * 1024 * 1024 }),
        ...(json === undefined ? {} : { json }),
        headers: {
          accept: "application/json",
          authorization: `Bearer ${token}`,
        },
      });
      if (
        readSession !== undefined &&
        (await this.options.getAuthToken()) !== readSession
      )
        fail("UNAUTHENTICATED");
      return result;
    } catch (error) {
      if (error instanceof ValkyrProcedureError) throw error;
      if (error instanceof ValkyrLabsApiError) {
        if (error.status === 401) fail("UNAUTHENTICATED");
        if (error.status === 403) fail("FORBIDDEN");
        if (error.status === 402) fail("CREDITS_REQUIRED");
        if (method === "POST" && error.status === 409)
          fail(
            unavailable === "CONTROL_OUTCOME_UNKNOWN"
              ? "CONTROL_CONFLICT"
              : "DISPATCH_CONFLICT",
          );
      }
      fail(unavailable);
    }
  }
  /** Read the exact declared contract; this is never an execution eligibility grant. */
  async inspect(procedureId: string) {
    requireProcedureExecutionId(procedureId);
    const token = await this.options.getAuthToken();
    if (!token) fail("UNAUTHENTICATED");
    const reply = await this.request(
      `/Procedure/${procedureId}`,
      "GET",
      undefined,
      "INSPECTION_UNAVAILABLE",
      token,
    );
    const p = reply.data;
    if (
      reply.status !== 200 ||
      !record(p) ||
      !uuid(p.id) ||
      p.id.toLowerCase() !== procedureId.toLowerCase() ||
      !reference(p.procedureRef) ||
      !uuid(p.workflowId) ||
      !uuid(p.workflowVersionId) ||
      typeof p.workflowContentHash !== "string" ||
      !HASH.test(p.workflowContentHash) ||
      typeof p.workflowAbiHash !== "string" ||
      !HASH.test(p.workflowAbiHash)
    )
      fail("INSPECTION_UNAVAILABLE");
    const versionReply = await this.request(
      `/WorkflowVersion/${p.workflowVersionId}`,
      "GET",
      undefined,
      "INSPECTION_UNAVAILABLE",
      token,
    );
    const version = versionReply.data;
    if (
      versionReply.status !== 200 ||
      !record(version) ||
      !uuid(version.id) ||
      !uuid(version.workflowId) ||
      version.id.toLowerCase() !== p.workflowVersionId.toLowerCase() ||
      version.workflowId.toLowerCase() !== p.workflowId.toLowerCase() ||
      version.contentHash !== p.workflowContentHash ||
      version.abiHash !== p.workflowAbiHash
    )
      fail("INSPECTION_UNAVAILABLE");
    const result = {
      procedureId: p.id as string,
      procedureRef: p.procedureRef as string,
      workflowId: p.workflowId as string,
      workflowVersionId: p.workflowVersionId as string,
      workflowContentHash: p.workflowContentHash as string,
      workflowAbiHash: p.workflowAbiHash as string,
      runtimeValidationRequired: true as const,
    };
    const unavailable = (
      reason:
        | "not_declared"
        | "schema_too_large"
        | "schema_invalid"
        | "schema_unprojectable",
    ) => ({
      ...result,
      status: "input_contract_unavailable" as const,
      inputSchema: null,
      schemaSha256: null,
      reason,
    });
    const source = version.launchInputSchema;
    if (source == null || source === "") return unavailable("not_declared");
    if (typeof source !== "string") return unavailable("schema_invalid");
    if (Buffer.byteLength(source) > PROCEDURE_MAX_BYTES)
      return unavailable("schema_too_large");
    let parsed: unknown;
    try {
      parsed = JSON.parse(source);
    } catch {
      return unavailable("schema_invalid");
    }
    try {
      const inputSchema = boundedProcedureJson(parsed);
      return {
        ...result,
        status: "input_contract_available" as const,
        inputSchema,
        schemaSha256: createHash("sha256").update(source).digest("hex"),
        reason: null,
      };
    } catch {
      return unavailable("schema_unprojectable");
    }
  }
  async execute(input: unknown): Promise<ProcedureDispatchResult> {
    const payload = prepareProcedureRequest(input);
    const response = await this.request(
      "/skillopt_ops/execute",
      "POST",
      payload,
      "DISPATCH_OUTCOME_UNKNOWN",
    );
    return dispatchResult(
      response.data,
      response.status,
      String(payload.routeRequest.traceId),
    );
  }
  async status(executionId: string): Promise<ProcedureExecutionState> {
    requireProcedureExecutionId(executionId);
    const response = await this.request(
      `/WorkflowExecution/${executionId}`,
      "GET",
      undefined,
      "STATUS_UNAVAILABLE",
    );
    if (response.status !== 200) fail("STATUS_UNAVAILABLE");
    return executionState(response.data, executionId);
  }
  async control(
    action: ProcedureControlAction,
    executionId: string,
  ): Promise<ProcedureControlResult> {
    if (!isProcedureControlAction(action)) fail();
    requireProcedureExecutionId(executionId);
    const endpoint = action === "cancel" ? "stop" : action;
    const response = await this.request(
      `/vaiworkflow/executions/${executionId}/${endpoint}`,
      "POST",
      undefined,
      "CONTROL_OUTCOME_UNKNOWN",
    );
    if (response.status !== 200) fail("CONTROL_OUTCOME_UNKNOWN");
    try {
      return {
        status: "control_returned",
        action,
        workflow: executionState(response.data, executionId),
      };
    } catch {
      fail("CONTROL_OUTCOME_UNKNOWN");
    }
  }
  async search(input: unknown): Promise<{
    procedures: ProcedureCandidate[];
    coverage: {
      page: number;
      size: number;
      scanned: number;
      excluded: number;
      scope: "one_authorized_page";
      complete: false;
      nextPage: number | null;
      stopReason: "end_of_list" | "page_limit" | null;
    };
  }> {
    const args = prepareProcedureSearch(input);
    const page = args.page,
      size = 20;
    const example = {
      taskType: args.taskType,
      enabled: true,
      deterministic: true,
      lifecycleStatus: "active",
      workflowBindingStatus: "active",
    };
    const params = new URLSearchParams({
      page: String(page),
      size: String(size),
      sort: "id,asc",
      example: JSON.stringify(example),
    });
    const response = await this.request(
      `/Procedure?${params}`,
      "GET",
      undefined,
      "DISCOVERY_UNAVAILABLE",
    );
    if (
      response.status !== 200 ||
      !Array.isArray(response.data) ||
      response.data.length > size
    )
      fail("DISCOVERY_UNAVAILABLE");
    const procedures = response.data
      .map((value) => candidate(value, args.taskType))
      .filter((value): value is ProcedureCandidate => value !== null);
    return {
      procedures,
      coverage: {
        page,
        size,
        scanned: response.data.length,
        excluded: response.data.length - procedures.length,
        scope: "one_authorized_page",
        complete: false,
        nextPage: response.data.length > 0 && page < 10000 ? page + 1 : null,
        stopReason:
          response.data.length === 0
            ? "end_of_list"
            : page === 10000
              ? "page_limit"
              : null,
      },
    };
  }
}

/** Keep the reviewed target and account stable across the user's approval wait. */
export async function createSessionBoundProcedureClient(options: {
  getBaseUrl: () => string;
  getAuthToken: () => Promise<string | undefined>;
  fetch?: ValkyrLabsFetch;
}): Promise<ValkyrProcedureClient> {
  const baseUrl = normalizeValkyraiHost(options.getBaseUrl());
  const token = await options.getAuthToken();
  if (!token || normalizeValkyraiHost(options.getBaseUrl()) !== baseUrl)
    fail("UNAUTHENTICATED");
  return new ValkyrProcedureClient({
    baseUrl,
    fetch: options.fetch,
    getAuthToken: async () => {
      if (normalizeValkyraiHost(options.getBaseUrl()) !== baseUrl)
        fail("UNAUTHENTICATED");
      const currentToken = await options.getAuthToken();
      if (
        currentToken !== token ||
        normalizeValkyraiHost(options.getBaseUrl()) !== baseUrl
      )
        fail("UNAUTHENTICATED");
      return token;
    },
  });
}
