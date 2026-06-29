import {
  GrayMatterClient,
  GrayMatterClientError,
  GrayMatterErrorKind,
  GrayMatterMemoryQuery,
  GrayMatterRetrievalReceiptQuery,
} from "@services/graymatter/GrayMatterClient";
import type { GrayMatterSessionState } from "@services/graymatter/GrayMatterSessionService";
import type { TenantContext } from "@services/auth/tenantContext";

export type GrayMatterReadStatus =
  | "disabled"
  | "empty"
  | "forbidden"
  | "quota"
  | "ready"
  | "unauthenticated"
  | "unavailable";

export interface GrayMatterReadableClient {
  queryMemory: (query: GrayMatterMemoryQuery) => Promise<unknown>;
  retrieveMemoryWithReceipt?: (
    query: GrayMatterRetrievalReceiptQuery,
  ) => Promise<unknown>;
}

export interface GrayMatterContextCitation {
  excerpt: string;
  id: string;
  tags?: string[];
  title?: string;
  type?: string;
}

export interface GrayMatterTranscriptRead {
  at: string;
  citations: string[];
  error?: string;
  query: string;
  receiptIds?: string[];
  status: GrayMatterReadStatus;
  traceIds?: string[];
  warning?: string;
}

export interface AgentGrayMatterContext {
  citations: GrayMatterContextCitation[];
  error?: string;
  query?: string;
  reads: GrayMatterTranscriptRead[];
  status: GrayMatterReadStatus;
}

export interface AgentContextAssembly {
  grayMatter: AgentGrayMatterContext;
  promptSection: string;
}

export interface AgentContextAssemblerOptions {
  grayMatter?: GrayMatterReadableClient;
  now?: () => Date;
}

export interface AssembleAgentContextInput {
  cwd?: string;
  maxEntries?: number;
  maxEntryChars?: number;
  task: string;
}

type MemoryEntryLike = Record<string, unknown>;
type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

interface ReceiptMetadata {
  answerAllowed?: boolean;
  answerPolicy?: string;
  caveatRequired?: boolean;
  disposition?: string;
  receiptId?: string;
  recommendedAction?: string;
  retrievalStatus?: string;
  requiredActions?: string[];
  traceId?: string;
  warning?: string;
}

interface ContextReadResponse {
  metadata?: ReceiptMetadata;
  usedReceipt?: boolean;
  value?: unknown;
  warning?: string;
}

export interface CreateAgentContextSectionForTaskOptions
  extends AssembleAgentContextInput {
  baseUrl: string;
  fetch?: FetchLike;
  grayMatterSession?: GrayMatterSessionState;
  tenantContext?: TenantContext;
  token?: string;
}

const DEFAULT_MAX_ENTRIES = 8;
const DEFAULT_MAX_ENTRY_CHARS = 700;
const GRAYMATTER_INVARIANT_QUERY_CONTEXT = [
  "Required preflight memory: invariants, rules, instructions, decisions, methodology, preferences, prior session context, business truth, and organizational truth.",
  "Named platform anchors: ValkyrAI, ThorAPI, AspectJ, RBAC, ACL, api-0, ValorIDE, GrayMatter.",
  "Implementation anchors: generated ThorAPI TypeScript models, generated RTK Query services, project-specific commands, workflow invariants, and user preferences.",
].join("\n");

export class AgentContextAssembler {
  private readonly now: () => Date;

  constructor(private readonly options: AgentContextAssemblerOptions = {}) {
    this.now = options.now ?? (() => new Date());
  }

  async assemble(
    input: AssembleAgentContextInput,
  ): Promise<AgentContextAssembly> {
    if (!this.options.grayMatter) {
      return {
        grayMatter: {
          citations: [],
          reads: [],
          status: "disabled",
        },
        promptSection: "",
      };
    }

    const query = buildGrayMatterQuery(input.task, input.cwd);
    const readAt = this.now().toISOString();

    try {
      const response = await this.retrieveContext({
        limit: input.maxEntries ?? DEFAULT_MAX_ENTRIES,
        query,
      });
      const metadata = response.metadata;
      if (response.warning && !response.value) {
        const status: GrayMatterReadStatus = "unavailable";
        const read: GrayMatterTranscriptRead = {
          at: readAt,
          citations: [],
          query,
          status,
        };
        applyReceiptDetails(read, metadata, response.warning);

        return {
          grayMatter: {
            citations: [],
            error: response.warning,
            query,
            reads: [read],
            status,
          },
          promptSection: formatGrayMatterPromptSection(
            status,
            [],
            response.warning,
          ),
        };
      }
      const citations = extractCitations(response, {
        maxEntries: input.maxEntries ?? DEFAULT_MAX_ENTRIES,
        maxEntryChars: input.maxEntryChars ?? DEFAULT_MAX_ENTRY_CHARS,
      });
      const fallback =
        citations.length === 0 && response.usedReceipt
          ? await this.queryMemoryFallback(query, {
              maxEntries: input.maxEntries ?? DEFAULT_MAX_ENTRIES,
              maxEntryChars: input.maxEntryChars ?? DEFAULT_MAX_ENTRY_CHARS,
            })
          : undefined;
      const effectiveCitations = fallback?.citations.length
        ? fallback.citations
        : citations;
      const status: GrayMatterReadStatus = effectiveCitations.length
        ? "ready"
        : "empty";
      const read: GrayMatterTranscriptRead = {
        at: readAt,
        citations: effectiveCitations.map((citation) => `gm:${citation.id}`),
        query,
        status,
      };
      applyReceiptDetails(read, metadata, response.warning);
      if (fallback?.warning) {
        read.warning = read.warning
          ? `${read.warning}; ${fallback.warning}`
          : fallback.warning;
      }

      return {
        grayMatter: {
          citations: effectiveCitations,
          query,
          reads: [read],
          status,
        },
        promptSection: formatGrayMatterPromptSection(
          status,
          effectiveCitations,
        ),
      };
    } catch (error) {
      const status = getReadFailureStatus(error);
      const message =
        error instanceof Error ? error.message : "GrayMatter read failed.";
      return {
        grayMatter: {
          citations: [],
          error: message,
          query,
          reads: [
            {
              at: readAt,
              citations: [],
              error: message,
              query,
              status,
            },
          ],
          status,
        },
        promptSection: formatGrayMatterPromptSection(status, [], message),
      };
    }
  }

  private async retrieveContext(
    query: GrayMatterMemoryQuery,
  ): Promise<ContextReadResponse> {
    const grayMatter = this.options.grayMatter;
    if (!grayMatter?.retrieveMemoryWithReceipt) {
      return {
        value: await grayMatter?.queryMemory(query),
      };
    }

    try {
      const receiptResponse = await grayMatter.retrieveMemoryWithReceipt({
        includeEvaluator: false,
        includeItems: true,
        includeText: true,
        qualityProfile: "DEFAULT",
        query: query.query,
        retrievalMode: "HYBRID",
        topK: query.limit ?? DEFAULT_MAX_ENTRIES,
      });
      const metadata = extractReceiptMetadata(receiptResponse);
      const policyWarning = receiptPolicyWarning(metadata);

      if (receiptPolicyBlocks(metadata)) {
        return {
          metadata,
          warning: policyWarning,
        };
      }

      return {
        metadata,
        usedReceipt: true,
        value: receiptResponse,
      };
    } catch (error) {
      return {
        value: await grayMatter.queryMemory(query),
        warning: `receipt_fallback:${formatReadError(error)}`,
      };
    }
  }

  private async queryMemoryFallback(
    query: string,
    options: { maxEntries: number; maxEntryChars: number },
  ): Promise<
    | { citations: GrayMatterContextCitation[]; warning?: string }
    | undefined
  > {
    try {
      const value = await this.options.grayMatter?.queryMemory({
        limit: options.maxEntries,
        query,
      });
      const citations = extractCitations(value, options);
      return {
        citations,
        warning: citations.length
          ? "receipt_empty_fallback:direct_memory_query_used"
          : "receipt_empty_fallback:direct_memory_query_empty",
      };
    } catch (error) {
      return {
        citations: [],
        warning: `receipt_empty_fallback_failed:${formatReadError(error)}`,
      };
    }
  }
}

export const createAgentContextSectionForTask = async ({
  baseUrl,
  fetch,
  grayMatterSession,
  tenantContext,
  token,
  ...input
}: CreateAgentContextSectionForTaskOptions): Promise<string | undefined> => {
  if (
    !token ||
    grayMatterSession?.status !== "ready" ||
    !grayMatterSession.capabilities.memoryQuery
  ) {
    return undefined;
  }

  const client = new GrayMatterClient({
    baseUrl,
    fetch,
    getAuthToken: () => token,
    getTenantContext: () => tenantContext,
  });
  const context = await new AgentContextAssembler({
    grayMatter: client,
  }).assemble(input);

  return context.promptSection || undefined;
};

const buildGrayMatterQuery = (task: string, cwd?: string) =>
  [
    `ValorIDE task context: ${task.trim() || "Current task"}`,
    cwd ? `Workspace: ${cwd}` : undefined,
    GRAYMATTER_INVARIANT_QUERY_CONTEXT,
  ]
    .filter(Boolean)
    .join("\n");

const extractCitations = (
  response: ContextReadResponse | unknown,
  options: { maxEntries: number; maxEntryChars: number },
): GrayMatterContextCitation[] => {
  const entries = isContextReadResponse(response)
    ? extractEntries(response.value)
    : extractEntries(response);
  const seen = new Set<string>();
  const citations: GrayMatterContextCitation[] = [];

  for (const entry of entries) {
    const id = getCitationId(entry);
    const content = getCitationContent(entry);

    if (!id || !content || seen.has(id)) {
      continue;
    }

    seen.add(id);
    citations.push({
      excerpt: truncate(redactSensitive(content), options.maxEntryChars),
      id,
      tags: getStringArrayField(entry, "tags"),
      title:
        getStringField(entry, "title") ??
        getStringField(entry, "name") ??
        getStringField(entry, "fieldName") ??
        getMetadataTitle(entry),
      type:
        getStringField(entry, "type") ??
        getStringField(entry, "sourceType") ??
        getStringField(entry, "entityType") ??
        "context",
    });

    if (citations.length >= options.maxEntries) {
      break;
    }
  }

  return citations;
};

const extractEntries = (response: unknown): MemoryEntryLike[] => {
  if (Array.isArray(response)) {
    return response.filter(isRecord);
  }

  if (!isRecord(response)) {
    return [];
  }

  const receipt = response.receipt;
  if (isRecord(receipt) && Array.isArray(receipt.items)) {
    return receipt.items.filter(isRecord);
  }

  for (const key of ["results", "items", "data", "memoryEntries", "entries"]) {
    const candidate = response[key];
    if (Array.isArray(candidate)) {
      return candidate.filter(isRecord);
    }
  }

  return [];
};

const getCitationId = (entry: MemoryEntryLike) =>
  getStringField(entry, "id") ??
  getStringField(entry, "uid") ??
  getStringField(entry, "memoryId") ??
  getStringField(entry, "sourceId") ??
  getStringField(entry, "entityId");

const getCitationContent = (entry: MemoryEntryLike) =>
  getStringField(entry, "content") ??
  getStringField(entry, "summary") ??
  getStringField(entry, "textPreview") ??
  getStringField(entry, "text") ??
  getStringField(entry, "body");

const getReadFailureStatus = (error: unknown): GrayMatterReadStatus => {
  if (error instanceof GrayMatterClientError) {
    return mapGrayMatterErrorKind(error.kind);
  }
  return "unavailable";
};

const mapGrayMatterErrorKind = (
  kind: GrayMatterErrorKind,
): GrayMatterReadStatus => kind;

const formatGrayMatterPromptSection = (
  status: GrayMatterReadStatus,
  citations: GrayMatterContextCitation[],
  error?: string,
) => {
  if (status === "ready") {
    return [
      "Use this RBAC-scoped GrayMatter context as cited operational memory.",
      "Cite bracket ids when the memory affects a decision. Do not invent memory beyond these entries.",
      "",
      ...citations.map(formatCitation),
    ].join("\n");
  }

  if (status === "empty") {
    return "GrayMatter status: no relevant RBAC-scoped memories returned. Continue with local project context.";
  }

  return [
    `GrayMatter status: ${status}. Continue with local project context only.`,
    error ? `Read error: ${redactSensitive(error)}` : undefined,
  ]
    .filter(Boolean)
    .join("\n");
};

const formatCitation = (citation: GrayMatterContextCitation) => {
  const parts = [
    `[gm:${citation.id}]`,
    citation.type,
    citation.title ? `"${citation.title}"` : undefined,
    citation.tags?.length ? `(${citation.tags.join(", ")})` : undefined,
  ].filter(Boolean);

  return `- ${parts.join(" ")}: ${citation.excerpt}`;
};

const getStringField = (
  record: MemoryEntryLike,
  key: string,
): string | undefined => {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value : undefined;
};

const getStringArrayField = (
  record: MemoryEntryLike,
  key: string,
): string[] | undefined => {
  const value = record[key];
  if (!Array.isArray(value)) {
    return undefined;
  }
  const strings = value.filter(
    (item): item is string => typeof item === "string" && Boolean(item.trim()),
  );
  return strings.length ? strings : undefined;
};

const getMetadataTitle = (record: MemoryEntryLike): string | undefined => {
  const metadata = record.metadata;
  if (!isRecord(metadata)) {
    return undefined;
  }
  return getStringField(metadata, "title");
};

const extractReceiptMetadata = (
  response: unknown,
): ReceiptMetadata | undefined => {
  if (!isRecord(response)) {
    return undefined;
  }
  const receipt = isRecord(response.receipt) ? response.receipt : undefined;
  const policy = extractGrayMatterPolicy(response, receipt);
  if (!receipt && !policy) {
    return undefined;
  }

  const metadata: ReceiptMetadata = {
    answerAllowed: policy ? getBooleanField(policy, "answerAllowed") : undefined,
    answerPolicy:
      getStringField(policy ?? {}, "answerPolicy") ??
      getStringField(receipt ?? {}, "answerPolicy"),
    caveatRequired: policy
      ? getBooleanField(policy, "caveatRequired")
      : undefined,
    disposition: policy ? getStringField(policy, "disposition") : undefined,
    receiptId:
      getStringField(policy ?? {}, "receiptId") ??
      getStringField(receipt ?? {}, "receiptId"),
    recommendedAction:
      getStringField(policy ?? {}, "recommendedAction") ??
      getStringField(receipt ?? {}, "recommendedAction"),
    retrievalStatus:
      getStringField(policy ?? {}, "retrievalStatus") ??
      getStringField(receipt ?? {}, "retrievalStatus"),
    requiredActions: policy
      ? getStringArrayField(policy, "requiredActions")
      : undefined,
    traceId:
      getStringField(policy ?? {}, "traceId") ??
      getStringField(receipt ?? {}, "traceId"),
    warning: policy ? getStringField(policy, "warning") : undefined,
  };

  return Object.values(metadata).some((value) => value !== undefined)
    ? metadata
    : undefined;
};

const extractGrayMatterPolicy = (
  response: MemoryEntryLike,
  receipt?: MemoryEntryLike,
): MemoryEntryLike | undefined => {
  const topLevelPolicy = response.graymatterPolicy;
  if (isRecord(topLevelPolicy)) {
    return topLevelPolicy;
  }

  const receiptPolicy = receipt?.graymatterPolicy;
  return isRecord(receiptPolicy) ? receiptPolicy : undefined;
};

const getBooleanField = (
  record: MemoryEntryLike,
  key: string,
): boolean | undefined => {
  const value = record[key];
  return typeof value === "boolean" ? value : undefined;
};

const receiptPolicyBlocks = (metadata?: ReceiptMetadata): boolean => {
  if (!metadata) {
    return false;
  }

  const disposition = metadata.disposition?.toLowerCase();
  if (metadata.answerAllowed === false && metadata.caveatRequired !== true) {
    return true;
  }
  if (
    disposition &&
    [
      "deny",
      "denied",
      "do_not_answer",
      "do_not_answer_from_memory",
      "require_clarification",
      "require_retry",
      "retry",
      "clarify",
    ].includes(disposition)
  ) {
    return true;
  }

  const answerPolicy = metadata.answerPolicy;
  const retrievalStatus = metadata.retrievalStatus;
  const recommendedAction = metadata.recommendedAction;
  return (
    [
      "DENY",
      "DO_NOT_ANSWER_CONFIDENTLY",
      "REQUIRE_CLARIFICATION",
      "REQUIRE_RETRY",
    ].includes(answerPolicy ?? "") ||
    [
      "ACCESS_DENIED",
      "CONFLICTING_CONTEXT",
      "ERROR",
      "EVALUATOR_REJECTED",
      "LOW_CONFIDENCE",
      "PARTIAL_COVERAGE",
      "POLICY_REDACTED",
      "RETRY_REQUIRED",
      "STALE_CONTEXT",
    ].includes(retrievalStatus ?? "") ||
    [
      "ASK_CLARIFYING_QUESTION",
      "DO_NOT_ANSWER",
      "ESCALATE_TO_USER",
      "RETRY_SAME_QUERY",
      "RETRY_WITH_EXPANDED_QUERY",
      "RETRY_WITH_RECENCY_BIAS",
      "RETRY_WITH_SCHEMA_FILTER",
      "RUN_EVALUATOR",
    ].includes(recommendedAction ?? "")
  );
};

const receiptPolicyWarning = (
  metadata?: ReceiptMetadata,
): string | undefined => {
  if (!metadata) {
    return undefined;
  }

  const answerPolicy = metadata.answerPolicy;
  const retrievalStatus = metadata.retrievalStatus;
  const recommendedAction = metadata.recommendedAction;
  const blockedPolicy = [
    "DENY",
    "DO_NOT_ANSWER_CONFIDENTLY",
    "REQUIRE_CLARIFICATION",
    "REQUIRE_RETRY",
  ].includes(answerPolicy ?? "");
  const blockedStatus = [
    "ACCESS_DENIED",
    "CONFLICTING_CONTEXT",
    "ERROR",
    "EVALUATOR_REJECTED",
    "LOW_CONFIDENCE",
    "PARTIAL_COVERAGE",
    "POLICY_REDACTED",
    "RETRY_REQUIRED",
    "STALE_CONTEXT",
  ].includes(retrievalStatus ?? "");
  const blockedAction = [
    "ASK_CLARIFYING_QUESTION",
    "DO_NOT_ANSWER",
    "ESCALATE_TO_USER",
    "RETRY_SAME_QUERY",
    "RETRY_WITH_EXPANDED_QUERY",
    "RETRY_WITH_RECENCY_BIAS",
    "RETRY_WITH_SCHEMA_FILTER",
    "RUN_EVALUATOR",
  ].includes(recommendedAction ?? "");

  const policyDisposition = metadata.disposition;
  const policyActions = metadata.requiredActions?.join(",");
  const policyWarning = metadata.warning;
  const policyAnswerAllowed =
    metadata.answerAllowed === undefined
      ? undefined
      : `answerAllowed=${metadata.answerAllowed}`;
  const policyCaveatRequired =
    metadata.caveatRequired === undefined
      ? undefined
      : `caveatRequired=${metadata.caveatRequired}`;
  const policyCaveat = metadata.caveatRequired === true;
  const policyBlocked = receiptPolicyBlocks(metadata);

  if (
    !blockedPolicy &&
    !blockedStatus &&
    !blockedAction &&
    !policyBlocked &&
    !policyCaveat &&
    !policyWarning
  ) {
    return undefined;
  }

  return [
    metadata.receiptId ? `receiptId=${metadata.receiptId}` : undefined,
    metadata.traceId ? `traceId=${metadata.traceId}` : undefined,
    answerPolicy ? `answerPolicy=${answerPolicy}` : undefined,
    retrievalStatus ? `retrievalStatus=${retrievalStatus}` : undefined,
    recommendedAction ? `recommendedAction=${recommendedAction}` : undefined,
    policyAnswerAllowed,
    policyCaveatRequired,
    policyDisposition ? `disposition=${policyDisposition}` : undefined,
    policyActions ? `requiredActions=${policyActions}` : undefined,
    policyWarning,
  ]
    .filter(Boolean)
    .join(" ");
};

const uniqueStrings = (values: Array<string | undefined>) =>
  Array.from(new Set(values.filter((value): value is string => Boolean(value))));

const applyReceiptDetails = (
  read: GrayMatterTranscriptRead,
  metadata?: ReceiptMetadata,
  warning?: string,
) => {
  const receiptIds = uniqueStrings([metadata?.receiptId]);
  const traceIds = uniqueStrings([metadata?.traceId]);
  if (receiptIds.length) {
    read.receiptIds = receiptIds;
  }
  if (traceIds.length) {
    read.traceIds = traceIds;
  }
  if (warning) {
    read.warning = warning;
  }
};

const isContextReadResponse = (
  response: ContextReadResponse | unknown,
): response is ContextReadResponse =>
  isRecord(response) &&
  ("value" in response || "metadata" in response || "warning" in response);

const formatReadError = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const redactSensitive = (value: string) =>
  value
    .replace(/(authorization\s*:\s*bearer\s+)[^\s,;]+/gi, "$1[REDACTED]")
    .replace(/\b(bearer\s+)[^\s,;]+/gi, "$1[REDACTED]")
    .replace(
      /\b[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{8,}\b/g,
      "[REDACTED_JWT]",
    );

const truncate = (value: string, maxChars: number) => {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxChars) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(0, maxChars - 1)).trim()}...`;
};

const isRecord = (value: unknown): value is MemoryEntryLike =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);
