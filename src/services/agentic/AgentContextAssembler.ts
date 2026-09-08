import {
  GrayMatterClient,
  GrayMatterClientError,
  GrayMatterContextPageCompileInput,
  GrayMatterContextPagePromptInput,
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
  compileContextPage?: (
    input: GrayMatterContextPageCompileInput,
  ) => Promise<unknown>;
  compileContextPagePrompt?: (
    input: GrayMatterContextPagePromptInput,
  ) => Promise<unknown>;
  listMemory?: () => Promise<unknown>;
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
  bifrost?: {
    compilerVersion?: string;
    contextHash?: string;
    contextPageRef: string;
    contextTokenEstimate?: number;
    includedItemCount?: number;
    lineageHash?: string;
    promptHash?: string;
    promptTokenEstimate?: number;
    retrievalReceiptRef?: string;
    sourceHashCount?: number;
    traceId?: string;
  };
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
  tokenBudget?: number;
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
      const bifrost = await this.compileBifrostContext(input, query, readAt);
      if (bifrost) return bifrost;

      const response = await this.retrieveContext(
        {
          limit: input.maxEntries ?? DEFAULT_MAX_ENTRIES,
          query,
        },
        input,
      );
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
      const status: GrayMatterReadStatus = citations.length ? "ready" : "empty";
      const read: GrayMatterTranscriptRead = {
        at: readAt,
        citations: citations.map((citation) => `gm:${citation.id}`),
        query,
        status,
      };
      applyReceiptDetails(read, metadata, response.warning);

      return {
        grayMatter: {
          citations,
          query,
          reads: [read],
          status,
        },
        promptSection: formatGrayMatterPromptSection(status, citations),
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

  private async compileBifrostContext(
    input: AssembleAgentContextInput,
    query: string,
    readAt: string,
  ): Promise<AgentContextAssembly | undefined> {
    const grayMatter = this.options.grayMatter;
    if (
      !grayMatter?.compileContextPage ||
      !grayMatter.compileContextPagePrompt
    ) {
      return undefined;
    }

    try {
      const tokenBudget = Math.max(128, input.tokenBudget ?? 2_000);
      const compiled = await grayMatter.compileContextPage({
        filters: {
          sourceSurface: "valoride",
          ...(input.cwd ? { workspacePath: input.cwd } : {}),
        },
        includeProcedures: true,
        includeRatings: true,
        taskIntent: input.task.slice(0, 12_000),
        tokenBudget,
      });
      const compiledRecord = isRecord(compiled) ? compiled : {};
      const page = getRecordField(compiledRecord, "contextPage");
      const pageStatus = getStringField(page ?? {}, "status")?.toLowerCase();
      if (
        pageStatus &&
        ["blocked", "error", "expired", "failed", "rejected"].includes(
          pageStatus,
        )
      ) {
        // ContextPage reports policy/retrieval failures in a successful HTTP
        // response. Do not project its framing-only prompt as ready memory;
        // continue through the compatible scoped-memory/receipt fallback.
        return undefined;
      }
      const contextPageRef =
        getStringField(page ?? {}, "pageRef") ??
        getStringField(page ?? {}, "traceId") ??
        getStringField(compiledRecord, "contextPageRef");
      if (!contextPageRef) return undefined;

      const projected = await grayMatter.compileContextPagePrompt({
        contextPageRef,
        maxTokens: tokenBudget,
        surface: "code",
        task: input.task.slice(0, 12_000),
      });
      const projectedRecord = isRecord(projected) ? projected : {};
      const prompt = getStringField(projectedRecord, "prompt");
      if (!prompt) return undefined;

      const citations = extractContextPageCitations(page, {
        maxEntries: input.maxEntries ?? DEFAULT_MAX_ENTRIES,
        maxEntryChars: input.maxEntryChars ?? DEFAULT_MAX_ENTRY_CHARS,
      });
      const status: GrayMatterReadStatus = citations.length ? "ready" : "empty";
      const receipt = getRecordField(page ?? {}, "retrievalReceipt");
      const receiptId =
        getStringField(receipt ?? {}, "receiptId") ??
        getStringField(receipt ?? {}, "id");
      const traceId =
        getStringField(projectedRecord, "traceId") ??
        getStringField(page ?? {}, "traceId");
      const read: GrayMatterTranscriptRead = {
        at: readAt,
        citations: citations.map((citation) => `gm:${citation.id}`),
        query,
        receiptIds: receiptId ? [receiptId] : undefined,
        status,
        traceIds: traceId ? [traceId] : undefined,
      };

      return {
        bifrost: {
          compilerVersion: getStringField(projectedRecord, "compilerVersion"),
          contextHash: getStringField(projectedRecord, "contextHash"),
          contextPageRef,
          contextTokenEstimate:
            getNumberField(projectedRecord, "contextTokenEstimate") ??
            getNumberField(page ?? {}, "tokenEstimate"),
          includedItemCount: getStringArrayField(
            projectedRecord,
            "includedItemRefs",
          )?.length,
          lineageHash: getStringField(projectedRecord, "lineageHash"),
          promptHash: getStringField(projectedRecord, "promptHash"),
          promptTokenEstimate: getNumberField(projectedRecord, "tokenEstimate"),
          retrievalReceiptRef:
            getStringField(projectedRecord, "retrievalReceiptRef") ?? receiptId,
          sourceHashCount: getStringArrayField(projectedRecord, "sourceHashes")
            ?.length,
          traceId,
        },
        grayMatter: {
          citations,
          query,
          reads: [read],
          status,
        },
        promptSection: prompt,
      };
    } catch (error) {
      // ContextPage may not be deployed on older GrayMatter servers. Receipt-
      // backed retrieval remains the compatible, policy-checked fallback.
      if (
        error instanceof GrayMatterClientError &&
        error.kind === "unavailable" &&
        (error.status === 404 || error.status === 405)
      ) {
        return undefined;
      }
      throw error;
    }
  }

  private async retrieveContext(
    query: GrayMatterMemoryQuery,
    input: AssembleAgentContextInput,
  ): Promise<ContextReadResponse> {
    const grayMatter = this.options.grayMatter;

    if (grayMatter?.listMemory) {
      try {
        const listedMemory = await grayMatter.listMemory();
        const relevantEntries = rankRelevantMemoryEntries(listedMemory, input);
        if (relevantEntries.length || !grayMatter.retrieveMemoryWithReceipt) {
          return { value: relevantEntries };
        }
      } catch (error) {
        if (
          error instanceof GrayMatterClientError &&
          error.kind !== "unavailable"
        ) {
          throw error;
        }
        if (!grayMatter.retrieveMemoryWithReceipt) {
          throw error;
        }
      }
    }

    if (!grayMatter?.retrieveMemoryWithReceipt) {
      return {
        warning:
          "graymatter_acl_scoped_memory_read_unavailable:direct_query_not_authorized",
      };
    }

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
  }
}

export const createAgentContextSectionForTask = async ({
  ...options
}: CreateAgentContextSectionForTaskOptions): Promise<string | undefined> => {
  const context = await createAgentContextForTask(options);
  return context?.promptSection || undefined;
};

export const createAgentContextForTask = async ({
  baseUrl,
  fetch,
  grayMatterSession,
  tenantContext,
  token,
  ...input
}: CreateAgentContextSectionForTaskOptions): Promise<
  AgentContextAssembly | undefined
> => {
  if (
    !token ||
    grayMatterSession?.status !== "ready" ||
    (!grayMatterSession.capabilities.memoryRead &&
      !grayMatterSession.capabilities.memoryQuery)
  ) {
    return undefined;
  }

  const client = new GrayMatterClient({
    baseUrl,
    fetch,
    getAuthToken: () => token,
    getTenantContext: () => tenantContext,
  });
  return new AgentContextAssembler({
    grayMatter: {
      compileContextPage: (input) => client.compileContextPage(input),
      compileContextPagePrompt: (input) =>
        client.compileContextPagePrompt(input),
      listMemory: () => client.listMemory(),
      queryMemory: (query) => client.queryMemory(query),
      retrieveMemoryWithReceipt: (query) =>
        client.retrieveMemoryWithReceipt(query),
    },
  }).assemble(input);
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

const extractContextPageCitations = (
  page: MemoryEntryLike | undefined,
  options: { maxEntries: number; maxEntryChars: number },
): GrayMatterContextCitation[] => {
  if (!page || !Array.isArray(page.items)) return [];
  const citations: GrayMatterContextCitation[] = [];
  for (const rawItem of page.items) {
    if (!isRecord(rawItem)) continue;
    const id =
      getStringField(rawItem, "itemRef") ??
      getStringField(rawItem, "sourceId") ??
      getStringField(rawItem, "memoryId") ??
      getStringField(rawItem, "entityId") ??
      getStringField(rawItem, "id");
    const excerpt =
      getStringField(rawItem, "summary") ??
      getStringField(rawItem, "textPreview") ??
      getStringField(rawItem, "text") ??
      getStringField(rawItem, "content") ??
      getStringField(rawItem, "body");
    if (!id || !excerpt) continue;
    citations.push({
      excerpt: truncate(redactSensitive(excerpt), options.maxEntryChars),
      id,
      type: getStringField(rawItem, "sourceType") ?? "context",
    });
    if (citations.length >= options.maxEntries) break;
  }
  return citations;
};

const extractEntries = (response: unknown): MemoryEntryLike[] => {
  if (Array.isArray(response)) {
    return response.flatMap((entry) => normalizeEntryRecords(entry));
  }

  if (!isRecord(response)) {
    return [];
  }

  const receipt = response.receipt;
  if (isRecord(receipt) && Array.isArray(receipt.items)) {
    return receipt.items.flatMap((entry) => normalizeEntryRecords(entry));
  }

  for (const key of [
    "results",
    "items",
    "data",
    "content",
    "records",
    "memoryEntries",
    "entries",
  ]) {
    const candidate = response[key];
    if (Array.isArray(candidate)) {
      return candidate.flatMap((entry) => normalizeEntryRecords(entry));
    }
  }

  return [];
};

const INVARIANT_MARKERS = new Set([
  "acl",
  "decision",
  "instruction",
  "invariant",
  "methodology",
  "preference",
  "rbac",
  "rule",
  "security",
  "standard",
]);

const tokenizeForRelevance = (value: string) =>
  new Set(
    value
      .toLowerCase()
      .split(/[^a-z0-9_-]+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 4),
  );

const rankRelevantMemoryEntries = (
  response: unknown,
  input: AssembleAgentContextInput,
): MemoryEntryLike[] => {
  const thor_taskTokens = tokenizeForRelevance(
    `${input.task} ${input.cwd ?? ""} valoride graymatter`,
  );

  return extractEntries(response)
    .map((entry, index) => {
      const thor_tags = getStringArrayField(entry, "tags") ?? [];
      const thor_type = getStringField(entry, "type") ?? "";
      const thor_title =
        getStringField(entry, "title") ??
        getStringField(entry, "name") ??
        getMetadataTitle(entry) ??
        "";
      const thor_content = getCitationContent(entry) ?? "";
      const thor_searchable =
        `${thor_type} ${thor_title} ${thor_tags.join(" ")} ${thor_content}`.toLowerCase();
      const thor_entryTokens = tokenizeForRelevance(thor_searchable);
      const thor_invariantScore = Array.from(INVARIANT_MARKERS).some(
        (marker) =>
          thor_type.toLowerCase() === marker ||
          thor_tags.some((tag) => tag.toLowerCase().includes(marker)),
      )
        ? 50
        : 0;
      const thor_taskScore = Array.from(thor_taskTokens).reduce(
        (score, token) => score + (thor_entryTokens.has(token) ? 8 : 0),
        0,
      );
      const thor_workspaceScore = thor_searchable.includes("valoride") ? 12 : 0;

      return {
        entry,
        index,
        score: thor_invariantScore + thor_taskScore + thor_workspaceScore,
      };
    })
    .filter(
      ({ entry, score }) => score > 0 && Boolean(getCitationContent(entry)),
    )
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, input.maxEntries ?? DEFAULT_MAX_ENTRIES)
    .map(({ entry }) => entry);
};

const normalizeEntryRecords = (entry: unknown): MemoryEntryLike[] => {
  if (!isRecord(entry)) {
    return [];
  }

  for (const key of [
    "memoryEntry",
    "entry",
    "record",
    "source",
    "entity",
    "object",
    "item",
  ]) {
    const nestedEntry = entry[key];
    if (isRecord(nestedEntry)) {
      return [mergeEntryWrapper(nestedEntry, entry)];
    }
  }

  return [entry];
};

const mergeEntryWrapper = (
  nestedEntry: MemoryEntryLike,
  wrapper: MemoryEntryLike,
): MemoryEntryLike => ({
  ...wrapper,
  ...nestedEntry,
  id:
    getStringField(nestedEntry, "id") ??
    getStringField(wrapper, "memoryId") ??
    getStringField(wrapper, "sourceId") ??
    getStringField(wrapper, "entityId") ??
    getStringField(wrapper, "id"),
});

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

const getNumberField = (
  record: MemoryEntryLike,
  key: string,
): number | undefined => {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
};

const getRecordField = (
  record: MemoryEntryLike,
  key: string,
): MemoryEntryLike | undefined => {
  const value = record[key];
  return isRecord(value) ? value : undefined;
};

const getStringArrayField = (
  record: MemoryEntryLike,
  key: string,
): string[] | undefined => {
  const value = record[key];
  if (!Array.isArray(value)) {
    return undefined;
  }
  const strings = value
    .map((item) => {
      if (typeof item === "string") {
        return item.trim();
      }
      if (isRecord(item)) {
        return (
          getStringField(item, "name") ??
          getStringField(item, "label") ??
          getStringField(item, "id")
        );
      }
      return undefined;
    })
    .filter((item): item is string => Boolean(item));
  return strings.length ? strings : undefined;
};

const parseMaybeJsonRecord = (value: unknown): MemoryEntryLike | undefined => {
  if (isRecord(value)) {
    return value;
  }
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(value);
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

const getMetadataTitle = (record: MemoryEntryLike): string | undefined => {
  const metadata = parseMaybeJsonRecord(record.metadata);
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
    answerAllowed: policy
      ? getBooleanField(policy, "answerAllowed")
      : undefined,
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
  Array.from(
    new Set(values.filter((value): value is string => Boolean(value))),
  );

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
