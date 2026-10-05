import {
  evaluateGrayMatterReceiptPolicy,
  extractGrayMatterReceiptMetadata,
  redactGrayMatterPromptText,
  type GrayMatterReceiptMetadata as ReceiptMetadata,
} from "./GrayMatterReceiptPolicy";
import * as vscode from "vscode";
import {
  GrayMatterClientError,
  GrayMatterErrorKind,
  GrayMatterMemoryQuery,
  GrayMatterRetrievalReceiptQuery,
} from "./GrayMatterClient";

export type GrayMatterMemoryScope = "organization" | "project" | "user";

export interface GrayMatterContextConfig {
  enabled: boolean;
  maxTokens: number;
  queryMemory?: (query: GrayMatterMemoryQuery) => Promise<unknown>;
  retrieveMemoryWithReceipt?: (
    query: GrayMatterRetrievalReceiptQuery,
  ) => Promise<unknown>;
  scopes: GrayMatterMemoryScope[];
  seedQuery?: string;
}

export interface GrayMatterContextResult {
  durationMs: number;
  entriesUsed: number;
  formattedBlock: string;
  fromScopes: string[];
  retrievalReceiptIds: string[];
  retrievalTraceIds: string[];
  retrievalWarnings: string[];
  tokensEstimated: number;
}

interface MemoryEntryForPrompt {
  content: string;
  id: string;
  invariant: boolean;
  scope: GrayMatterMemoryScope;
  tags: string[];
  title?: string;
  type?: string;
}

type MemoryEntryLike = Record<string, unknown>;
type RetrievalKind = "context" | "invariant";

interface RetrievalResponse {
  metadata?: ReceiptMetadata;
  value?: unknown;
  warning?: string;
}

const DEFAULT_MAX_TOKENS = 2000;
const INVARIANT_QUERY_SUFFIX =
  "invariant decision methodology security rbac acl ThorAPI AspectJ generated-code vaix vai testing GrayMatter ValorIDE ValkyrAI";
const SCOPE_ORDER: GrayMatterMemoryScope[] = [
  "project",
  "organization",
  "user",
];

export class GrayMatterContextProvider {
  constructor(
    private readonly logger?: Pick<vscode.OutputChannel, "appendLine">,
    private readonly now: () => number = () => Date.now(),
  ) {}

  async getContextForPrompt(
    seedQuery: string,
    config: GrayMatterContextConfig,
  ): Promise<GrayMatterContextResult | null> {
    if (!config.enabled) {
      return null;
    }

    const query = (
      config.seedQuery ||
      seedQuery ||
      "ValorIDE session context"
    ).trim();
    const maxTokens = config.maxTokens || DEFAULT_MAX_TOKENS;
    const start = this.now();

    try {
      const invariantQuery = `${query} ${INVARIANT_QUERY_SUFFIX}`.trim();
      const [invariantResponse, contextResponse] = await Promise.allSettled([
        this.retrieveContext({
          config,
          kind: "invariant",
          query: {
            limit: 12,
            query: invariantQuery,
          },
        }),
        this.retrieveContext({
          config,
          kind: "context",
          query: {
            limit: 24,
            query,
          },
        }),
      ]);

      if (invariantResponse.status === "rejected") {
        this.logger?.appendLine(
          `[GrayMatterContextProvider] Invariant preflight degraded: ${formatReadError(invariantResponse.reason)}`,
        );
      }

      if (
        invariantResponse.status === "rejected" &&
        contextResponse.status === "rejected"
      ) {
        throw contextResponse.reason;
      }

      const responses = [invariantResponse, contextResponse]
        .filter(
          (response): response is PromiseFulfilledResult<RetrievalResponse> =>
            response.status === "fulfilled",
        )
        .map((response) => response.value);

      const receiptMetadata = responses
        .map((response) => response.metadata)
        .filter((metadata): metadata is ReceiptMetadata => Boolean(metadata));
      const retrievalWarnings = responses
        .map((response) => response.warning)
        .filter((warning): warning is string => Boolean(warning));

      const entries = dedupeEntries(
        responses.flatMap((response) => extractEntries(response.value)),
      )
        .map(normalizeEntry)
        .filter((entry): entry is MemoryEntryForPrompt => Boolean(entry))
        .filter((entry) => config.scopes.includes(entry.scope))
        .sort(
          (a, b) =>
            Number(b.invariant) - Number(a.invariant) ||
            SCOPE_ORDER.indexOf(a.scope) - SCOPE_ORDER.indexOf(b.scope),
        );

      const selected = fitEntriesToBudget(entries, maxTokens);
      if (!selected.length) {
        return null;
      }

      const formattedBlock = formatRememberedContextBlock(selected);
      const tokensEstimated = estimateTokens(formattedBlock);
      const fromScopes = Array.from(
        new Set(selected.map((entry) => entry.scope)),
      );
      const retrievalReceiptIds = uniqueStrings(
        receiptMetadata.map((metadata) => metadata.receiptId),
      );
      const retrievalTraceIds = uniqueStrings(
        receiptMetadata.map((metadata) => metadata.traceId),
      );

      return {
        durationMs: this.now() - start,
        entriesUsed: selected.length,
        formattedBlock,
        fromScopes,
        retrievalReceiptIds,
        retrievalTraceIds,
        retrievalWarnings,
        tokensEstimated,
      };
    } catch (error) {
      this.logger?.appendLine(
        `[GrayMatterContextProvider] Skipping context layer: ${formatReadError(error)}`,
      );
      return null;
    }
  }

  private async retrieveContext({
    config,
    kind,
    query,
  }: {
    config: GrayMatterContextConfig;
    kind: RetrievalKind;
    query: GrayMatterMemoryQuery;
  }): Promise<RetrievalResponse> {
    if (!config.retrieveMemoryWithReceipt) {
      throw new Error(
        "Receipt-backed GrayMatter retrieval is unavailable; direct memory query is not authorized for prompt context.",
      );
    }

    try {
      const receiptResponse = await config.retrieveMemoryWithReceipt({
        includeEvaluator: false,
        includeItems: true,
        includeText: true,
        qualityProfile: "DEFAULT",
        query: query.query,
        retrievalMode: "HYBRID",
        topK: query.limit ?? 10,
      });
      const metadata = extractGrayMatterReceiptMetadata(receiptResponse);
      const policy = evaluateGrayMatterReceiptPolicy(metadata);
      const policyWarning =
        policy.state === "allowed" ? undefined : policy.warning;

      if (!policy.allowsContext) {
        this.logger?.appendLine(
          `[GrayMatterContextProvider] Receipt policy suppressed ${kind} context: ${policyWarning}`,
        );
        return {
          metadata,
          warning: policyWarning,
        };
      }

      return {
        metadata,
        value: receiptResponse,
      };
    } catch (error) {
      this.logger?.appendLine(
        `[GrayMatterContextProvider] Receipt retrieval unavailable for ${kind}; omitting prompt context: ${formatReadError(error)}`,
      );
      throw error;
    }
  }
}

export const getGrayMatterContextConfigFromSettings = (
  queryMemory: GrayMatterContextConfig["queryMemory"],
  seedQuery?: string,
  retrieveMemoryWithReceipt?: GrayMatterContextConfig["retrieveMemoryWithReceipt"],
): GrayMatterContextConfig => {
  const config = vscode.workspace.getConfiguration("valoride.graymatter");
  return {
    enabled: config.get<boolean>("enabled", true),
    maxTokens: config.get<number>("contextMaxTokens", DEFAULT_MAX_TOKENS),
    queryMemory,
    retrieveMemoryWithReceipt,
    scopes: ["project", "organization", "user"],
    seedQuery,
  };
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

const normalizeEntry = (
  entry: MemoryEntryLike,
): MemoryEntryForPrompt | undefined => {
  const id =
    getString(entry, "id") ??
    getString(entry, "uid") ??
    getString(entry, "memoryId") ??
    getString(entry, "sourceId") ??
    getString(entry, "entityId");
  const content =
    getString(entry, "content") ??
    getString(entry, "summary") ??
    getString(entry, "textPreview") ??
    getString(entry, "excerpt") ??
    getString(entry, "text") ??
    getString(entry, "body");
  if (!id || !content) {
    return undefined;
  }

  const tags = getStringArray(entry, "tags") ?? [];
  return {
    content: redactSensitive(content),
    id,
    invariant: isInvariantEntry(
      getString(entry, "type") ?? "context",
      tags,
      content,
    ),
    scope: getScope(tags),
    tags,
    title:
      getString(entry, "title") ??
      getString(entry, "name") ??
      getString(entry, "fieldName") ??
      getMetadataTitle(entry),
    type:
      getString(entry, "type") ??
      getString(entry, "sourceType") ??
      getString(entry, "entityType") ??
      "context",
  };
};

const dedupeEntries = (entries: MemoryEntryLike[]): MemoryEntryLike[] => {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const id = getString(entry, "id") ?? getString(entry, "uid");
    const key = id ?? JSON.stringify(entry);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const getScope = (tags: string[]): GrayMatterMemoryScope => {
  if (tags.some((tag) => tag === "scope:organization" || tag === "scope:org")) {
    return "organization";
  }
  if (tags.includes("scope:user")) {
    return "user";
  }
  return "project";
};

const isInvariantEntry = (
  type: string,
  tags: string[],
  content: string,
): boolean => {
  if (type !== "decision") {
    return false;
  }

  const normalizedTags = tags.map((tag) => tag.toLowerCase());
  const normalizedContent = content.toLowerCase();
  return (
    [
      "invariant",
      "agent-policy",
      "mandatory-preflight",
      "fail-closed",
      "security",
      "rbac",
      "acl",
      "generated-code",
      "aspectj",
      "vaix",
      "vai",
      "testing",
      "thorapi",
      "valkyrai",
      "valoride",
      "graymatter",
    ].some((tag) => normalizedTags.includes(tag)) ||
    normalizedContent.includes("invariant") ||
    content.startsWith("Rule:")
  );
};

const fitEntriesToBudget = (
  entries: MemoryEntryForPrompt[],
  maxTokens: number,
): MemoryEntryForPrompt[] => {
  const selected: MemoryEntryForPrompt[] = [];
  let used = estimateTokens("## Remembered Context\n");

  for (const entry of entries) {
    const projected = estimateTokens(formatEntry(entry));
    if (used + projected > maxTokens) {
      continue;
    }
    selected.push(entry);
    used += projected;
  }

  return selected;
};

const formatRememberedContextBlock = (entries: MemoryEntryForPrompt[]) => {
  const lines = ["## Remembered Context", ""];
  for (const scope of SCOPE_ORDER) {
    const scoped = entries.filter((entry) => entry.scope === scope);
    if (!scoped.length) {
      continue;
    }
    lines.push(`### ${scope}`);
    lines.push(...scoped.map(formatEntry));
    lines.push("");
  }
  return lines.join("\n").trim();
};

const formatEntry = (entry: MemoryEntryForPrompt) => {
  const label = [
    `[gm:${entry.id}]`,
    entry.type,
    entry.title ? `"${entry.title}"` : undefined,
  ]
    .filter(Boolean)
    .join(" ");
  const tags = entry.tags.length ? ` (${entry.tags.join(", ")})` : "";
  return redactSensitive(`- ${label}${tags}: ${truncate(entry.content, 700)}`);
};

const getString = (
  record: MemoryEntryLike,
  key: string,
): string | undefined => {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value : undefined;
};

const getStringArray = (
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

const getBoolean = (
  record: MemoryEntryLike,
  key: string,
): boolean | undefined => {
  const value = record[key];
  return typeof value === "boolean" ? value : undefined;
};

const getMetadataTitle = (record: MemoryEntryLike): string | undefined => {
  const metadata = record.metadata;
  if (!isRecord(metadata)) {
    return undefined;
  }
  return getString(metadata, "title");
};

const uniqueStrings = (values: Array<string | undefined>) =>
  Array.from(
    new Set(values.filter((value): value is string => Boolean(value))),
  );

const estimateTokens = (value: string) => Math.ceil(value.length / 4);

const truncate = (value: string, maxChars: number) => {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxChars) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(0, maxChars - 3)).trim()}...`;
};

const redactSensitive = redactGrayMatterPromptText;

const formatReadError = (error: unknown) => {
  if (error instanceof GrayMatterClientError) {
    return `${mapErrorKind(error.kind)} (${error.status ?? "no status"})`;
  }
  return error instanceof Error ? error.message : "unknown error";
};

const mapErrorKind = (kind: GrayMatterErrorKind) => kind;

const isRecord = (value: unknown): value is MemoryEntryLike =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);
