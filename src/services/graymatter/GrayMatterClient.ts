import { normalizeValkyraiHost } from "@utils/serverValkyraiHost";
import { createHash } from "node:crypto";
import type {
  GrayMatterCapabilities,
  GrayMatterControlSurface,
} from "@shared/GrayMatterSession";
import { buildTenantHeaders } from "../auth/tenantContext";
import type { TenantContext } from "../auth/tenantContext";
import {
  getValkyrLabsRtkApiClient,
  ValkyrLabsApiError,
  ValkyrLabsFetch,
  ValkyrLabsRtkApiClient,
} from "../valkyrai/ValkyrLabsRtkApi";

export type { GrayMatterCapabilities, GrayMatterControlSurface };

export type GrayMatterMemoryType =
  | "artifact"
  | "configuration"
  | "context"
  | "decision"
  | "preference"
  | "todo";

export type GrayMatterErrorKind =
  | "forbidden"
  | "quota"
  | "unauthenticated"
  | "unavailable";

export type GrayMatterMemoryWriteErrorKind = GrayMatterErrorKind | "unverified";

export interface GrayMatterClientOptions {
  baseUrl: string;
  fetch?: ValkyrLabsFetch;
  getAuthToken: () => Promise<string | undefined> | string | undefined;
  getTenantContext?: () =>
    | Promise<TenantContext | undefined>
    | TenantContext
    | undefined;
}

export interface GrayMatterMemoryInput {
  content: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
  type: GrayMatterMemoryType;
}

export interface GrayMatterMemoryQuery {
  limit?: number;
  query: string;
}

export interface GrayMatterRetrievalReceiptQuery {
  agentId?: string;
  filters?: Record<string, unknown>;
  includeEvaluator?: boolean;
  includeItems?: boolean;
  includeText?: boolean;
  qualityProfile?: "DEFAULT" | "ENTERPRISE_AUDIT" | "FAST" | "STRICT" | string;
  query: string;
  retrievalMode?:
    | "HYBRID"
    | "KEYWORD"
    | "RECENCY_BIASED"
    | "SCHEMA_FILTERED"
    | "VECTOR"
    | string;
  tenantId?: string;
  topK?: number;
  workflowId?: string;
}

export interface GrayMatterContextPageCompileInput {
  filters?: Record<string, unknown>;
  includeProcedures?: boolean;
  includeRatings?: boolean;
  taskIntent: string;
  tokenBudget?: number;
  traceId?: string;
}

export interface GrayMatterContextPagePromptInput {
  contextPageRef: string;
  maxTokens?: number;
  surface: "action" | "audit" | "chat" | "code" | "research" | "workflow";
  task?: string;
}

export interface GrayMatterOmegaRecallInput {
  asOf?: string;
  budgets?: Record<string, unknown>;
  idempotencyKey?: string;
  includeEvaluator?: boolean;
  mode?: "AUDIT" | "BALANCED" | "DEEP" | "FAST" | "PRIVATE" | string;
  query: string;
}

export type GrayMatterOmegaPlanInput = Omit<
  GrayMatterOmegaRecallInput,
  "includeEvaluator"
> & {
  includeEvaluator?: boolean;
};

export interface GrayMatterOmegaEvaluateInput {
  profile?:
    | "AUDIT"
    | "BUSINESS_ANALYSIS"
    | "CODE"
    | "MEMORY_RECALL"
    | "RESEARCH"
    | "STANDARD"
    | "WORKFLOW_ACTION"
    | string;
  trajectoryId: string;
}

export interface GrayMatterOmegaOutcomeInput {
  actionRef?: string;
  correctionHash?: string;
  outcome: "canceled" | "failure" | "partial" | "success";
  outcomeHash?: string;
  outcomeRef?: string;
  ratingScore?: number;
  testRef?: string;
  trajectoryId: string;
  workflowExecutionRef?: string;
}

export interface GrayMatterOmegaRememberInput {
  idempotencyKey: string;
  sourceChannel?: string;
  tags?: string[];
  text: string;
  title?: string;
  type?: GrayMatterMemoryType;
}

export interface GrayMatterOmegaForgetInput {
  idempotencyKey: string;
  memoryRef: string;
  reason?: string;
}

export interface GrayMatterOmegaIndexJobInput {
  dryRun?: boolean;
  idempotencyKey?: string;
  mode?: "cleanup" | "estimate" | "full" | "incremental" | "tombstone";
  targetTypes?: string[];
}

/**
 * Identity-free request for a durable asynchronous OmegaRAG retrieval run.
 * api-0 derives the principal, tenant, and generated ACL scope; it persists a
 * normalized query hash rather than this query text.
 */
export interface GrayMatterOmegaRetrievalRunInput {
  asOf?: string;
  budgets?: Record<string, unknown>;
  idempotencyKey: string;
  includeEvaluator?: boolean;
  mode?: "AUDIT" | "BALANCED" | "DEEP" | "FAST" | "PRIVATE" | string;
  query: string;
}

export interface GrayMatterProjectInput {
  currentStage?: string;
  description?: string;
  name?: string;
  notes?: string;
  progressPercent?: number;
  projectType?: string;
  repositoryUrl?: string;
  sourceSurface?: string;
  status?: string;
  workspacePath?: string;
}

type HeaderRecord = Record<string, string>;

interface OpenApiLike {
  paths?: Record<string, unknown>;
}

export interface GrayMatterDiscovery {
  capabilities: GrayMatterCapabilities;
  controlSurface?: GrayMatterControlSurface;
}

export class GrayMatterClientError extends Error {
  constructor(
    message: string,
    readonly kind: GrayMatterErrorKind,
    readonly status?: number,
  ) {
    super(message);
    this.name = "GrayMatterClientError";
  }
}

export class GrayMatterMemoryWriteUnverifiedError extends Error {
  readonly kind = "unverified" as const;

  constructor(readonly memoryId?: string) {
    super(
      "Memory persistence could not be verified. Inspect the exact memory when its reference is available before another write. This attempt must not be replayed automatically.",
    );
    this.name = "GrayMatterMemoryWriteUnverifiedError";
  }
}

export interface GrayMatterMemoryWriteReceipt {
  id: string;
  type: GrayMatterMemoryType;
  verification: {
    status: "verified";
    purpose: "write_verification";
    contentHash: string;
    inputContentHash: string;
  };
}

const memoryRecord = (value: unknown): value is Record<string, any> =>
  value !== null &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  [Object.prototype, null].includes(Object.getPrototypeOf(value));
const memoryId = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const memoryHash = (text: string): string =>
  createHash("sha256").update(text).digest("hex");

/** A raw HTTP acknowledgement is not a verified durable memory receipt. */
export function requireVerifiedMemoryWrite(
  value: unknown,
  input: GrayMatterMemoryInput,
): GrayMatterMemoryWriteReceipt {
  const id = memoryRecord(value) && memoryId(value.id) ? value.id : undefined;
  const proof =
    memoryRecord(value) && memoryRecord(value.verification)
      ? value.verification
      : undefined;
  if (
    !id ||
    !memoryRecord(value) ||
    value.type !== input.type ||
    proof?.status !== "verified" ||
    proof?.purpose !== "write_verification" ||
    typeof proof.contentHash !== "string" ||
    !/^[0-9a-f]{64}$/.test(proof.contentHash) ||
    proof.inputContentHash !== memoryHash(input.content)
  )
    throw new GrayMatterMemoryWriteUnverifiedError(id);
  return {
    id,
    type: input.type,
    verification: {
      status: "verified",
      purpose: "write_verification",
      contentHash: proof.contentHash,
      inputContentHash: proof.inputContentHash,
    },
  };
}

interface MemoryWriteSession {
  token: string;
  tenantHeaders: string;
}

export class GrayMatterClient {
  private readonly baseUrl: string;
  private readonly api: ValkyrLabsRtkApiClient;

  constructor(private readonly options: GrayMatterClientOptions) {
    this.baseUrl = normalizeValkyraiHost(options.baseUrl);
    this.api = getValkyrLabsRtkApiClient(options.fetch);
  }

  async loadDiscovery(): Promise<GrayMatterDiscovery> {
    try {
      const controlSurface = await this.loadControlSurface();
      let capabilities = capabilitiesFromControlSurface(controlSurface);
      if (isMissingCriticalMemoryCapability(capabilities)) {
        try {
          capabilities = mergeCapabilities(
            capabilities,
            await this.loadCapabilitiesFromOpenApi(),
          );
        } catch (error) {
          console.warn(
            `[GrayMatterClient] OpenAPI capability merge failed: ${String(error)}`,
          );
        }
      }
      return {
        capabilities,
        controlSurface,
      };
    } catch (error) {
      if (!(error instanceof GrayMatterClientError) || error.status !== 404) {
        throw error;
      }
    }

    return {
      capabilities: await this.loadCapabilitiesFromOpenApi(),
    };
  }

  async loadCapabilities(): Promise<GrayMatterCapabilities> {
    const discovery = await this.loadDiscovery();
    return discovery.capabilities;
  }

  async loadControlSurface(): Promise<GrayMatterControlSurface> {
    return this.request<GrayMatterControlSurface>("/graymatter/control");
  }

  private async loadCapabilitiesFromOpenApi(): Promise<GrayMatterCapabilities> {
    const openApi = await this.request<OpenApiLike>("/api-docs");
    const paths = Object.keys(openApi.paths ?? {}).map(normalizeOpenApiPath);
    const hasResource = (resource: string) => {
      const basePath = `/${resource.toLowerCase()}`;
      return paths.some(
        (path) => path === basePath || path.startsWith(`${basePath}/`),
      );
    };
    const hasResourceRoot = (resource: string) =>
      paths.includes(`/${resource.toLowerCase()}`);
    const hasOperation = (resource: string, operation: string) => {
      const operationPath = `/${resource.toLowerCase()}/${operation.toLowerCase()}`;
      return paths.some(
        (path) =>
          path === operationPath || path.startsWith(`${operationPath}/`),
      );
    };
    const hasCustomOperation = (basePath: string, operation: string) => {
      const operationPath = `${basePath.toLowerCase()}/${operation.toLowerCase()}`;
      return paths.some(
        (path) =>
          path === operationPath || path.startsWith(`${operationPath}/`),
      );
    };
    const hasCustomResource = (basePath: string) => {
      const normalizedBasePath = basePath.toLowerCase();
      return paths.some(
        (path) =>
          path === normalizedBasePath ||
          path.startsWith(`${normalizedBasePath}/`),
      );
    };

    return {
      agent: hasResource("Agent"),
      grayMatter: hasResource("GrayMatter"),
      memoryEntry: hasResource("MemoryEntry"),
      memoryQuery: hasOperation("MemoryEntry", "query"),
      memoryRead:
        hasResource("MemoryEntry") || hasOperation("MemoryEntry", "read"),
      memoryWrite:
        hasResourceRoot("MemoryEntry") || hasOperation("MemoryEntry", "write"),
      project: hasResource("Project"),
      projectObjectLink: hasResource("ProjectObjectLink"),
      swarmGraph: hasCustomOperation("/swarm-ops", "graph"),
      swarmOps: hasCustomResource("/swarm-ops"),
    };
  }

  async queryMemory(query: string | GrayMatterMemoryQuery): Promise<unknown> {
    const payload =
      typeof query === "string"
        ? {
            limit: 10,
            maxResults: 10,
            q: query,
            query,
          }
        : {
            limit: query.limit ?? 10,
            maxResults: query.limit ?? 10,
            q: query.query,
            query: query.query,
          };

    return this.request("/MemoryEntry/query", {
      body: JSON.stringify(payload),
      method: "POST",
    });
  }

  async listMemory(): Promise<unknown> {
    return this.request("/MemoryEntry");
  }

  async retrieveMemoryWithReceipt(
    query: string | GrayMatterRetrievalReceiptQuery,
  ): Promise<unknown> {
    const payload =
      typeof query === "string"
        ? {
            includeEvaluator: false,
            includeItems: true,
            includeText: true,
            qualityProfile: "DEFAULT",
            query,
            retrievalMode: "HYBRID",
            topK: 8,
          }
        : {
            includeEvaluator: query.includeEvaluator ?? false,
            includeItems: query.includeItems ?? true,
            includeText: query.includeText ?? true,
            qualityProfile: query.qualityProfile ?? "DEFAULT",
            query: query.query,
            retrievalMode: query.retrievalMode ?? "HYBRID",
            topK: query.topK ?? 8,
            ...(query.agentId ? { agentId: query.agentId } : {}),
            ...(query.filters ? { filters: query.filters } : {}),
            ...(query.tenantId ? { tenantId: query.tenantId } : {}),
            ...(query.workflowId ? { workflowId: query.workflowId } : {}),
          };

    return this.request("/graymatter-retrieval-receipts", {
      body: JSON.stringify(payload),
      method: "POST",
    });
  }

  async recallOmegaMemory(
    input: string | GrayMatterOmegaRecallInput,
  ): Promise<unknown> {
    const payload =
      typeof input === "string"
        ? { query: input }
        : {
            query: input.query,
            ...(input.mode ? { mode: input.mode } : {}),
            ...(input.idempotencyKey
              ? { idempotencyKey: input.idempotencyKey }
              : {}),
            ...(input.asOf ? { asOf: input.asOf } : {}),
            ...(input.budgets ? { budgets: input.budgets } : {}),
            ...(input.includeEvaluator === undefined
              ? {}
              : { includeEvaluator: input.includeEvaluator }),
          };

    return this.request("/graymatter/omega/recall", {
      body: JSON.stringify(payload),
      method: "POST",
    });
  }

  async planOmegaRetrieval(input: GrayMatterOmegaPlanInput): Promise<unknown> {
    return this.request("/graymatter/omega/plan", {
      body: JSON.stringify({
        query: input.query,
        ...(input.mode ? { mode: input.mode } : {}),
        ...(input.idempotencyKey
          ? { idempotencyKey: input.idempotencyKey }
          : {}),
        ...(input.asOf ? { asOf: input.asOf } : {}),
        ...(input.budgets ? { budgets: input.budgets } : {}),
        ...(input.includeEvaluator === undefined
          ? {}
          : { includeEvaluator: input.includeEvaluator }),
      }),
      method: "POST",
    });
  }

  async rememberOmegaMemory(
    input: GrayMatterOmegaRememberInput,
  ): Promise<unknown> {
    return this.request("/graymatter/omega/remember", {
      body: JSON.stringify({
        idempotencyKey: input.idempotencyKey,
        text: input.text,
        ...(input.type ? { type: input.type } : {}),
        ...(input.title ? { title: input.title } : {}),
        ...(input.tags ? { tags: input.tags } : {}),
        ...(input.sourceChannel ? { sourceChannel: input.sourceChannel } : {}),
      }),
      method: "POST",
    });
  }

  async forgetOmegaMemory(input: GrayMatterOmegaForgetInput): Promise<unknown> {
    return this.request("/graymatter/omega/forget", {
      body: JSON.stringify({
        idempotencyKey: input.idempotencyKey,
        memoryRef: input.memoryRef,
        ...(input.reason ? { reason: input.reason } : {}),
      }),
      method: "POST",
    });
  }

  async startOmegaIndexJob(
    input: GrayMatterOmegaIndexJobInput = {},
  ): Promise<unknown> {
    return this.request("/graymatter/omega/index-jobs", {
      body: JSON.stringify({
        mode: input.mode ?? "full",
        ...(input.dryRun === undefined ? {} : { dryRun: input.dryRun }),
        ...(input.idempotencyKey
          ? { idempotencyKey: input.idempotencyKey }
          : {}),
        ...(input.targetTypes ? { targetTypes: input.targetTypes } : {}),
      }),
      method: "POST",
    });
  }

  async estimateOmegaIndexJob(
    input: Omit<GrayMatterOmegaIndexJobInput, "dryRun" | "mode"> = {},
  ): Promise<unknown> {
    return this.startOmegaIndexJob({
      ...input,
      dryRun: true,
      mode: "estimate",
    });
  }

  async getOmegaIndexJob(jobId: string): Promise<unknown> {
    return this.request(
      `/graymatter/omega/index-jobs/${encodeURIComponent(jobId)}`,
      { method: "GET" },
    );
  }

  async cancelOmegaIndexJob(jobId: string): Promise<unknown> {
    return this.request(
      `/graymatter/omega/index-jobs/${encodeURIComponent(jobId)}/cancel`,
      { method: "POST" },
    );
  }

  async startOmegaRetrievalRun(
    input: GrayMatterOmegaRetrievalRunInput,
  ): Promise<unknown> {
    return this.request("/graymatter/omega/runs", {
      body: JSON.stringify({
        query: input.query,
        idempotencyKey: input.idempotencyKey,
        ...(input.mode ? { mode: input.mode } : {}),
        ...(input.asOf ? { asOf: input.asOf } : {}),
        ...(input.budgets ? { budgets: input.budgets } : {}),
        ...(input.includeEvaluator === undefined
          ? {}
          : { includeEvaluator: input.includeEvaluator }),
      }),
      method: "POST",
    });
  }

  async getOmegaRetrievalRun(runId: string): Promise<unknown> {
    return this.request(`/graymatter/omega/runs/${encodeURIComponent(runId)}`, {
      method: "GET",
    });
  }

  async cancelOmegaRetrievalRun(runId: string): Promise<unknown> {
    return this.request(
      `/graymatter/omega/runs/${encodeURIComponent(runId)}/cancel`,
      { method: "POST" },
    );
  }

  /**
   * Resumption requires query material again. api-0 verifies it against the
   * durable hash and never trusts a client-provided owner or tenant.
   */
  async resumeOmegaRetrievalRun(
    runId: string,
    query: string,
  ): Promise<unknown> {
    return this.request(
      `/graymatter/omega/runs/${encodeURIComponent(runId)}/resume`,
      {
        body: JSON.stringify({ query }),
        method: "POST",
      },
    );
  }

  async getOmegaTrajectory(trajectoryId: string): Promise<unknown> {
    return this.request(
      `/graymatter/omega/trajectories/${encodeURIComponent(trajectoryId)}`,
      { method: "GET" },
    );
  }

  async evaluateOmegaRetrieval(
    input: GrayMatterOmegaEvaluateInput,
  ): Promise<unknown> {
    return this.request("/graymatter/omega/evaluate", {
      body: JSON.stringify({
        trajectoryId: input.trajectoryId,
        ...(input.profile ? { profile: input.profile } : {}),
      }),
      method: "POST",
    });
  }

  async recordOmegaTrajectoryOutcome(
    input: GrayMatterOmegaOutcomeInput,
  ): Promise<unknown> {
    return this.request(
      `/graymatter/omega/trajectories/${encodeURIComponent(input.trajectoryId)}/outcome`,
      {
        body: JSON.stringify({
          outcome: input.outcome,
          ...(input.outcomeRef ? { outcomeRef: input.outcomeRef } : {}),
          ...(input.workflowExecutionRef
            ? { workflowExecutionRef: input.workflowExecutionRef }
            : {}),
          ...(input.actionRef ? { actionRef: input.actionRef } : {}),
          ...(input.testRef ? { testRef: input.testRef } : {}),
          ...(input.ratingScore === undefined
            ? {}
            : { ratingScore: input.ratingScore }),
          ...(input.correctionHash
            ? { correctionHash: input.correctionHash }
            : {}),
          ...(input.outcomeHash ? { outcomeHash: input.outcomeHash } : {}),
        }),
        method: "POST",
      },
    );
  }

  async compileContextPage(
    input: GrayMatterContextPageCompileInput,
  ): Promise<unknown> {
    return this.request("/graymatter_ops/context_page/compile", {
      body: JSON.stringify({
        taskIntent: input.taskIntent,
        ...(input.tokenBudget ? { tokenBudget: input.tokenBudget } : {}),
        ...(input.traceId ? { traceId: input.traceId } : {}),
        ...(input.includeProcedures === undefined
          ? {}
          : { includeProcedures: input.includeProcedures }),
        ...(input.includeRatings === undefined
          ? {}
          : { includeRatings: input.includeRatings }),
        ...(input.filters ? { filters: input.filters } : {}),
      }),
      method: "POST",
    });
  }

  async compileContextPagePrompt(
    input: GrayMatterContextPagePromptInput,
  ): Promise<unknown> {
    return this.request("/graymatter_ops/context_page/prompt", {
      body: JSON.stringify({
        contextPageRef: input.contextPageRef,
        surface: input.surface,
        ...(input.task ? { task: input.task } : {}),
        ...(input.maxTokens ? { maxTokens: input.maxTokens } : {}),
      }),
      method: "POST",
    });
  }

  async writeMemory(
    input: GrayMatterMemoryInput,
  ): Promise<GrayMatterMemoryWriteReceipt> {
    const metadata =
      input.metadata && Object.keys(input.metadata).length > 0
        ? JSON.stringify(input.metadata)
        : undefined;

    const session = await this.memoryWriteSession();
    let id: string | undefined;
    let acknowledged = false;
    try {
      const response = await this.request(
        "/MemoryEntry/write",
        {
          body: JSON.stringify({
            content: input.content,
            text: input.content,
            ...(metadata ? { metadata } : {}),
            ...(input.tags ? { tags: input.tags } : {}),
            type: input.type,
          }),
          method: "POST",
        },
        { session, statuses: [200, 201] },
      );
      acknowledged = true;
      if (memoryRecord(response) && memoryId(response.id)) id = response.id;
      if (
        !id ||
        !memoryRecord(response) ||
        response.type !== input.type ||
        typeof response.text !== "string" ||
        !response.text.trim()
      )
        throw new GrayMatterMemoryWriteUnverifiedError(id);
      const readback = await this.request(
        `/MemoryEntry/${id}`,
        {},
        { session, statuses: [200] },
      );
      await this.requireMemoryWriteSession(session);
      if (
        !memoryRecord(readback) ||
        readback.id !== id ||
        readback.type !== response.type ||
        readback.text !== response.text
      )
        throw new GrayMatterMemoryWriteUnverifiedError(id);
      return {
        id,
        type: input.type,
        verification: {
          status: "verified",
          purpose: "write_verification",
          contentHash: memoryHash(response.text),
          inputContentHash: memoryHash(input.content),
        },
      };
    } catch (error) {
      // A rejected POST can retain the existing auth/quota handling. Once a
      // response was accepted, even a later read denial leaves a possible write.
      if (
        !acknowledged &&
        error instanceof GrayMatterClientError &&
        ["unauthenticated", "quota", "forbidden"].includes(error.kind)
      )
        throw error;
      throw new GrayMatterMemoryWriteUnverifiedError(id);
    }
  }

  private async memoryWriteSession(): Promise<MemoryWriteSession> {
    const token = await this.options.getAuthToken();
    const tenantHeaders = JSON.stringify(
      buildTenantHeaders(await this.options.getTenantContext?.()),
    );
    if (!token)
      throw new GrayMatterClientError(
        "Sign in before writing GrayMatter memory.",
        "unauthenticated",
      );
    return { token, tenantHeaders };
  }

  private async requireMemoryWriteSession(
    expected: MemoryWriteSession,
  ): Promise<void> {
    const current = await this.memoryWriteSession();
    if (
      current.token !== expected.token ||
      current.tenantHeaders !== expected.tenantHeaders
    )
      throw new GrayMatterClientError(
        "The selected GrayMatter session changed.",
        "unauthenticated",
      );
  }

  async listProjects(): Promise<unknown> {
    return this.request("/Project");
  }

  async createProject(input: GrayMatterProjectInput): Promise<unknown> {
    return this.request("/Project", {
      body: JSON.stringify({
        sourceSurface: "valoride",
        ...input,
      }),
      method: "POST",
    });
  }

  async updateProject(
    id: string,
    input: GrayMatterProjectInput,
  ): Promise<unknown> {
    return this.request(`/Project/${encodeURIComponent(id)}`, {
      body: JSON.stringify({
        sourceSurface: "valoride",
        ...input,
      }),
      method: "PUT",
    });
  }

  private async request<T = unknown>(
    path: string,
    init: RequestInit = {},
    verification?: { session: MemoryWriteSession; statuses: number[] },
  ): Promise<T> {
    const token = await this.options.getAuthToken();
    const tenantContext = await this.options.getTenantContext?.();
    if (
      verification &&
      (token !== verification.session.token ||
        JSON.stringify(buildTenantHeaders(tenantContext)) !==
          verification.session.tenantHeaders)
    )
      throw new GrayMatterClientError(
        "The selected GrayMatter session changed.",
        "unauthenticated",
      );
    const headers = toHeaderRecord(init.headers);

    headers.accept = "application/json";
    if (init.body && !headers["content-type"]) {
      headers["content-type"] = "application/json";
    }
    if (token) {
      headers.authorization = `Bearer ${token}`;
    }
    applyHeaderRecord(headers, buildTenantHeaders(tenantContext));

    try {
      const response = await this.api.request<T>({
        body: init.body,
        headers,
        method: init.method,
        url: `${this.baseUrl}${path}`,
      });
      if (verification && !verification.statuses.includes(response.status))
        throw new GrayMatterMemoryWriteUnverifiedError();
      return response.data;
    } catch (error) {
      if (error instanceof ValkyrLabsApiError) {
        throw this.toClientError(error);
      }
      throw error;
    }
  }

  private toClientError(error: ValkyrLabsApiError): GrayMatterClientError {
    const message = readApiErrorMessage(error.data) || error.message;
    const status = typeof error.status === "number" ? error.status : undefined;

    switch (status) {
      case 401:
        return new GrayMatterClientError(
          message || "GrayMatter authentication is required.",
          "unauthenticated",
          status,
        );
      case 402:
        return new GrayMatterClientError(
          message || "ValorIDE account credits are required.",
          "quota",
          status,
        );
      case 403:
        return new GrayMatterClientError(
          message || "GrayMatter access was denied by RBAC or tenant context.",
          "forbidden",
          status,
        );
      default:
        return new GrayMatterClientError(
          message || "GrayMatter is unavailable.",
          "unavailable",
          status,
        );
    }
  }
}

const readApiErrorMessage = (data: unknown): string => {
  if (typeof data === "string") {
    return data;
  }
  if (!data || typeof data !== "object") {
    return "";
  }
  const body = data as Record<string, unknown>;
  return typeof body.message === "string"
    ? body.message
    : typeof body.error === "string"
      ? body.error
      : "";
};

const toHeaderRecord = (headers?: HeadersInit): HeaderRecord => {
  const record: HeaderRecord = {};

  if (!headers) {
    return record;
  }

  if (Array.isArray(headers)) {
    for (const [key, value] of headers) {
      record[key.toLowerCase()] = value;
    }
    return record;
  }

  const forEach = (headers as { forEach?: (callback: unknown) => void })
    .forEach;
  if (typeof forEach === "function") {
    (
      headers as {
        forEach: (callback: (value: string, key: string) => void) => void;
      }
    ).forEach((value, key) => {
      record[key.toLowerCase()] = value;
    });
    return record;
  }

  for (const [key, value] of Object.entries(headers)) {
    record[key.toLowerCase()] = String(value);
  }

  return record;
};

const applyHeaderRecord = (
  headers: HeaderRecord,
  additions: HeaderRecord,
): HeaderRecord => {
  for (const [key, value] of Object.entries(additions)) {
    const normalized = key.toLowerCase();
    if (value && !headers[normalized]) {
      headers[normalized] = value;
    }
  }
  return headers;
};

const capabilitiesFromControlSurface = (
  controlSurface: GrayMatterControlSurface,
): GrayMatterCapabilities => {
  const memoryEndpoints = controlSurface.endpoints?.memory ?? {};
  const swarmEndpoints = controlSurface.endpoints?.swarm ?? {};
  const agentEndpoints = controlSurface.endpoints?.agent ?? {};
  const memoryPrimitives = new Set(
    controlSurface.memory?.primitives?.map((value) => value.toLowerCase()) ??
      [],
  );
  const graphPrimitives = new Set(
    [
      ...(controlSurface.objectGraph?.memoryPrimitives ?? []),
      ...(controlSurface.objectGraph?.coordinationPrimitives ?? []),
      ...(controlSurface.objectGraph?.businessDomains ?? []),
    ].map((value) => value.toLowerCase()),
  );
  const valorideProfile = controlSurface.clients?.valoride;

  return {
    agent:
      Boolean(agentEndpoints.list || agentEndpoints.activate) ||
      graphPrimitives.has("agent"),
    grayMatter:
      controlSurface.suite?.memoryLayer?.toLowerCase() === "graymatter" ||
      memoryPrimitives.has("graymatter"),
    memoryEntry: memoryPrimitives.has("memoryentry"),
    memoryQuery: Boolean(memoryEndpoints.query),
    memoryRead: Boolean(memoryEndpoints.read || memoryEndpoints.query),
    memoryWrite: Boolean(memoryEndpoints.write),
    project:
      graphPrimitives.has("project") ||
      Boolean(controlSurface.endpoints?.projects?.list),
    projectObjectLink:
      graphPrimitives.has("projectobjectlink") ||
      Boolean(controlSurface.endpoints?.projects?.objectLinks),
    swarmGraph: Boolean(
      swarmEndpoints.graph ||
        controlSurface.swarm?.graphEndpoint ||
        valorideProfile?.endpoints?.swarmGraph,
    ),
    swarmOps: Boolean(
      swarmEndpoints.register ||
        controlSurface.swarm?.registrationEndpoint ||
        valorideProfile?.swarmAgent,
    ),
  };
};

const isMissingCriticalMemoryCapability = (
  capabilities: GrayMatterCapabilities,
) =>
  !capabilities.grayMatter ||
  !capabilities.memoryEntry ||
  !capabilities.memoryQuery ||
  !capabilities.memoryRead ||
  !capabilities.memoryWrite;

const mergeCapabilities = (
  primary: GrayMatterCapabilities,
  fallback: GrayMatterCapabilities,
): GrayMatterCapabilities => ({
  agent: primary.agent || fallback.agent,
  grayMatter: primary.grayMatter || fallback.grayMatter,
  memoryEntry: primary.memoryEntry || fallback.memoryEntry,
  memoryQuery: primary.memoryQuery || fallback.memoryQuery,
  memoryRead: primary.memoryRead || fallback.memoryRead,
  memoryWrite: primary.memoryWrite || fallback.memoryWrite,
  project: primary.project || fallback.project,
  projectObjectLink: primary.projectObjectLink || fallback.projectObjectLink,
  swarmGraph: primary.swarmGraph || fallback.swarmGraph,
  swarmOps: primary.swarmOps || fallback.swarmOps,
});

const normalizeOpenApiPath = (value: string) => {
  const withoutQuery = value.split("?")[0] || "";
  const normalized = withoutQuery.startsWith("/")
    ? withoutQuery
    : `/${withoutQuery}`;
  return normalized.replace(/^\/v\d+(?=\/)/iu, "").toLowerCase();
};
