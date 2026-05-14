import {
  GrayMatterClient,
  GrayMatterClientError,
  GrayMatterErrorKind,
  GrayMatterMemoryQuery,
} from "@services/graymatter/GrayMatterClient";
import type { GrayMatterSessionState } from "@services/graymatter/GrayMatterSessionService";

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
  status: GrayMatterReadStatus;
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

export interface CreateAgentContextSectionForTaskOptions
  extends AssembleAgentContextInput {
  baseUrl: string;
  fetch?: FetchLike;
  grayMatterSession?: GrayMatterSessionState;
  token?: string;
}

const DEFAULT_MAX_ENTRIES = 5;
const DEFAULT_MAX_ENTRY_CHARS = 700;

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
      const response = await this.options.grayMatter.queryMemory({
        limit: input.maxEntries ?? DEFAULT_MAX_ENTRIES,
        query,
      });
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
}

export const createAgentContextSectionForTask = async ({
  baseUrl,
  fetch,
  grayMatterSession,
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
  ]
    .filter(Boolean)
    .join("\n");

const extractCitations = (
  response: unknown,
  options: { maxEntries: number; maxEntryChars: number },
): GrayMatterContextCitation[] => {
  const entries = extractEntries(response);
  const seen = new Set<string>();
  const citations: GrayMatterContextCitation[] = [];

  for (const entry of entries) {
    const id = getStringField(entry, "id") ?? getStringField(entry, "uid");
    const content =
      getStringField(entry, "content") ??
      getStringField(entry, "summary") ??
      getStringField(entry, "text") ??
      getStringField(entry, "body");

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
        getMetadataTitle(entry),
      type: getStringField(entry, "type") ?? "context",
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

  for (const key of ["results", "items", "data", "memoryEntries", "entries"]) {
    const candidate = response[key];
    if (Array.isArray(candidate)) {
      return candidate.filter(isRecord);
    }
  }

  return [];
};

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
