import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import axios, { AxiosInstance } from "axios";
import { LlmDetailsSummary, LlmPromptMode } from "@shared/llm";

/**
 * LLMPromptService — ThorAPI-FIRST prompt loading
 *
 * PRIORITY ORDER:
 * 1. ThorAPI LLMDetails service (PRIMARY) - query by task intent + project stack
 * 2. src/assets/prompts/system.json (fallback) - base system prompt
 * 3. Fail gracefully with error message
 *
 * STACK-AWARE LOADING:
 * - Detect project stack (Java/Spring, Python/Flask, Node.js, etc.)
 * - Load stack-specific prompts (Java rules only for Java projects)
 * - Skip ThorAPI/non-matching stacks to save tokens
 */

export interface SelectedPrompt {
  source: "thorapi" | "fallback";
  llmDetailsId?: string;
  name: string;
  prompt: string;
  mode: "SYSTEM" | "APPEND";
  tags: string[];
  stackSpecific: boolean;
}

export interface LlmDetailsQuery {
  tags: string[];
  limit?: number;
}

export interface LlmDetailsClient {
  query(query: LlmDetailsQuery): Promise<LlmDetailsSummary[]>;
}

export interface ProjectStack {
  language: "java" | "python" | "nodejs" | "typescript" | "mixed" | "unknown";
  framework?: string;
  isThorAPI: boolean;
  isGenerated: boolean;
}

export class LLMPromptService {
  private workspaceRoot: string;
  private logger: vscode.OutputChannel;
  private selectedPrompt: SelectedPrompt | null = null;
  private projectStack: ProjectStack | null = null;
  private llmDetailsService: LlmDetailsClient | null = null;

  constructor(workspaceRoot: string, logger: vscode.OutputChannel) {
    this.workspaceRoot = workspaceRoot;
    this.logger = logger;
  }

  /**
   * Initialize — detect project stack and attempt ThorAPI load
   */
  async initialize(llmDetailsService?: LlmDetailsClient): Promise<void> {
    this.logger.appendLine("[LLMPromptService] Initializing...");

    try {
      // Detect project tech stack
      this.projectStack = this.detectProjectStack();
      this.logger.appendLine(
        `[LLMPromptService] Detected stack: ${this.projectStack.language} (ThorAPI: ${this.projectStack.isThorAPI})`,
      );

      // Try ThorAPI first
      if (llmDetailsService) {
        this.llmDetailsService = llmDetailsService;
        await this.loadFromThorAPI();
      } else {
        this.logger.appendLine(
          "[LLMPromptService] LLMDetails client not available, skipping ThorAPI load",
        );
      }

      // Fall back to local if needed
      if (!this.selectedPrompt) {
        await this.loadFromFallback();
      }

      if (this.selectedPrompt) {
        this.logger.appendLine(
          `[LLMPromptService] ✅ Loaded prompt from ${this.selectedPrompt.source} (${this.selectedPrompt.name})`,
        );
      } else {
        this.logger.appendLine(
          "[LLMPromptService] ❌ No prompt available (ThorAPI failed, fallback missing)",
        );
      }
    } catch (error) {
      this.logger.appendLine(
        `[LLMPromptService] ❌ Initialization failed: ${error}`,
      );
    }
  }

  /**
   * Detect project tech stack by scanning workspace
   */
  private detectProjectStack(): ProjectStack {
    const stack: ProjectStack = {
      language: "unknown",
      isThorAPI: false,
      isGenerated: false,
    };

    try {
      // Check for Java/Spring Boot (ThorAPI)
      if (
        fs.existsSync(path.join(this.workspaceRoot, "pom.xml")) &&
        fs.existsSync(path.join(this.workspaceRoot, "src/main/java"))
      ) {
        stack.language = "java";
        stack.framework = "spring-boot";
        // Check if it's ThorAPI-generated (has /generated/spring)
        if (
          fs.existsSync(
            path.join(this.workspaceRoot, "valkyrai/generated/spring"),
          )
        ) {
          stack.isThorAPI = true;
          stack.isGenerated = true;
        }
      }

      // Check for Python
      if (
        fs.existsSync(path.join(this.workspaceRoot, "setup.py")) ||
        fs.existsSync(path.join(this.workspaceRoot, "pyproject.toml")) ||
        fs.existsSync(path.join(this.workspaceRoot, "requirements.txt"))
      ) {
        stack.language = "python";
      }

      // Check for Node.js
      if (fs.existsSync(path.join(this.workspaceRoot, "package.json"))) {
        stack.language = "nodejs";
        if (fs.existsSync(path.join(this.workspaceRoot, "tsconfig.json"))) {
          stack.language = "typescript";
        }
      }

      // Check for /generated, /, /thorapi (ThorAPI artifacts)
      if (
        fs.existsSync(path.join(this.workspaceRoot, "generated")) ||
        fs.existsSync(path.join(this.workspaceRoot, "webview-ui/src/"))
      ) {
        stack.isThorAPI = true;
        stack.isGenerated = true;
      }
    } catch (error) {
      this.logger.appendLine(
        `[LLMPromptService] Error detecting stack: ${error}`,
      );
    }

    return stack;
  }

  /**
   * Load from ThorAPI LLMDetails service (PRIMARY)
   */
  private async loadFromThorAPI(): Promise<void> {
    if (!this.llmDetailsService) {
      return;
    }

    try {
      this.logger.appendLine(
        "[LLMPromptService] Attempting ThorAPI LLMDetails load...",
      );

      // Build tags for query: task intent + stack
      const tags = this.buildQueryTags();
      this.logger.appendLine(
        `[LLMPromptService] Query tags: ${tags.join(", ")}`,
      );

      const llmDetails = await this.queryLLMDetails(tags);

      if (llmDetails) {
        if (!llmDetails.initialPrompt) {
          this.logger.appendLine(
            `[LLMPromptService] ThorAPI prompt ${llmDetails.id} has no initialPrompt; skipping`,
          );
          return;
        }

        this.selectedPrompt = {
          source: "thorapi",
          llmDetailsId: llmDetails.id,
          name: llmDetails.name,
          prompt: llmDetails.initialPrompt,
          mode: llmDetails.promptType || "SYSTEM",
          tags: llmDetails.tags || [],
          stackSpecific: true,
        };
        this.logger.appendLine(
          `[LLMPromptService] ✅ Loaded from ThorAPI: ${llmDetails.name}`,
        );
      } else {
        this.logger.appendLine(
          "[LLMPromptService] ThorAPI returned no matching LLMDetails prompts",
        );
      }
    } catch (error) {
      this.logger.appendLine(
        `[LLMPromptService] ⚠️ ThorAPI load failed: ${error}`,
      );
    }
  }

  private async queryLLMDetails(
    tags: string[],
  ): Promise<LlmDetailsSummary | null> {
    const matches = await this.llmDetailsService?.query({ tags, limit: 10 });
    return matches?.[0] ?? null;
  }

  /**
   * Build query tags based on task intent + project stack
   */
  private buildQueryTags(): string[] {
    const tags = [];

    // Add stack-specific tag
    if (this.projectStack?.language === "java") {
      tags.push("java", "spring");
    } else if (this.projectStack?.language === "python") {
      tags.push("python");
    } else if (
      this.projectStack?.language === "typescript" ||
      this.projectStack?.language === "nodejs"
    ) {
      tags.push("typescript", "nodejs");
    }

    // Add ThorAPI tag if applicable
    if (this.projectStack?.isThorAPI) {
      tags.push("thorapi");
    }

    // Add default tags
    tags.push("system", "production");

    return [...new Set(tags)]; // Deduplicate
  }

  /**
   * Load from local fallback (src/assets/prompts/system.json)
   */
  private async loadFromFallback(): Promise<void> {
    try {
      const fallbackCandidates = [
        path.join(this.workspaceRoot, ".valoride", "prompts", "system.json"),
        path.join(this.workspaceRoot, "src/assets/prompts/system.json"),
      ];
      const fallbackPath = fallbackCandidates.find((candidate) =>
        fs.existsSync(candidate),
      );

      if (!fallbackPath) {
        this.logger.appendLine(
          "[LLMPromptService] Fallback prompt not found in expected locations",
        );
        return;
      }

      const content = fs.readFileSync(fallbackPath, "utf-8");
      const config = JSON.parse(content);

      this.selectedPrompt = {
        source: "fallback",
        name: config.name || "system.json (fallback)",
        prompt: this.compilePrompt(config),
        mode: "SYSTEM",
        tags: ["fallback"],
        stackSpecific: false,
      };

      this.logger.appendLine(
        `[LLMPromptService] ✅ Loaded from fallback: ${fallbackPath}`,
      );
    } catch (error) {
      this.logger.appendLine(
        `[LLMPromptService] ❌ Fallback load failed: ${error}`,
      );
    }
  }

  /**
   * Apply manual selection (e.g., from UI dropdown)
   */
  applyManualSelection(selection: {
    llmDetailsId?: string;
    name: string;
    prompt: string;
    mode?: "SYSTEM" | "APPEND";
    tags?: string[];
    source?: SelectedPrompt["source"];
    stackSpecific?: boolean;
  }): void {
    this.selectedPrompt = {
      source: selection.source ?? "thorapi",
      llmDetailsId: selection.llmDetailsId,
      name: selection.name,
      prompt: selection.prompt,
      mode: selection.mode ?? "SYSTEM",
      tags: selection.tags ?? [],
      stackSpecific: selection.stackSpecific ?? true,
    };

    this.logger.appendLine(
      `[LLMPromptService] 🔁 Manual prompt override applied: ${this.selectedPrompt.name} (${this.selectedPrompt.mode})`,
    );
  }

  /**
   * Compile prompt config (sections) into string
   */
  private compilePrompt(config: any): string {
    if (typeof config === "string") {
      return config;
    }

    if (config.sections && Array.isArray(config.sections)) {
      return config.sections
        .map((s: any) => `${s.section}: ${s.title}\n${s.content}`)
        .join("\n\n---\n\n");
    }

    return JSON.stringify(config, null, 2);
  }

  /**
   * Get selected prompt
   */
  getSelectedPrompt(): SelectedPrompt | null {
    return this.selectedPrompt;
  }

  /**
   * Get prompt text
   */
  getPromptText(): string {
    if (!this.selectedPrompt) {
      throw new Error("No prompt loaded");
    }
    return this.selectedPrompt.prompt;
  }

  /**
   * Get project stack
   */
  getProjectStack(): ProjectStack | null {
    return this.projectStack;
  }

  /**
   * Log state
   */
  logState(): void {
    this.logger.appendLine("[LLMPromptService] Current state:");
    this.logger.appendLine(
      `  - Project stack: ${this.projectStack?.language || "unknown"}`,
    );
    this.logger.appendLine(
      `  - ThorAPI detected: ${this.projectStack?.isThorAPI || false}`,
    );
    this.logger.appendLine(
      `  - Selected prompt: ${this.selectedPrompt?.source || "none"}`,
    );
    this.logger.appendLine(
      `  - Prompt name: ${this.selectedPrompt?.name || "N/A"}`,
    );
  }
}

export let llmPromptService: LLMPromptService | null = null;

/**
 * Initialize global LLMPromptService instance
 */
export async function initializeLLMPromptService(
  workspaceRoot: string,
  logger: vscode.OutputChannel,
  llmDetailsService?: LlmDetailsClient,
  manualSelection?: SelectedPrompt,
): Promise<void> {
  llmPromptService = new LLMPromptService(workspaceRoot, logger);
  await llmPromptService.initialize(
    manualSelection ? undefined : llmDetailsService,
  );
  if (manualSelection) {
    llmPromptService.applyManualSelection(manualSelection);
  }
}

/**
 * Get global LLMPromptService instance
 */
export function getLLMPromptService(): LLMPromptService {
  if (!llmPromptService) {
    throw new Error("LLMPromptService not initialized");
  }
  return llmPromptService;
}

const normalizeApiBase = (basePath: string): string => {
  const trimmed = basePath.replace(/\/+$/, "");
  return /\/v\d+$/i.test(trimmed) ? trimmed : `${trimmed}/v1`;
};

const parsePromptTags = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((tag): tag is string => typeof tag === "string");
  }
  if (typeof value !== "string" || !value.trim()) {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((tag): tag is string => typeof tag === "string");
    }
    if (Array.isArray(parsed?.tags)) {
      return parsed.tags.filter(
        (tag: unknown): tag is string => typeof tag === "string",
      );
    }
    if (Array.isArray(parsed?.promptTags)) {
      return parsed.promptTags.filter(
        (tag: unknown): tag is string => typeof tag === "string",
      );
    }
  } catch {
    return value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  return [];
};

const normalizePromptMode = (value: unknown): LlmPromptMode => {
  return typeof value === "string" && value.toUpperCase() === "APPEND"
    ? "APPEND"
    : "SYSTEM";
};

const toPromptSummary = (record: any): LlmDetailsSummary | null => {
  if (!record?.id || !record?.name || !record?.initialPrompt) {
    return null;
  }

  let metadata: any = {};
  if (typeof record.metaData === "string" && record.metaData.trim()) {
    try {
      metadata = JSON.parse(record.metaData);
    } catch {
      metadata = {};
    }
  }

  return {
    id: String(record.id),
    name: String(record.name),
    description: record.description,
    initialPrompt: record.initialPrompt,
    promptType: normalizePromptMode(record.promptType ?? metadata.promptType),
    tags: [
      ...new Set([
        ...parsePromptTags(record.tags),
        ...parsePromptTags(record.promptTags),
        ...parsePromptTags(metadata.tags),
        ...parsePromptTags(metadata.promptTags),
      ]),
    ],
    ratingScore: Number(record.ratingScore ?? metadata.ratingScore ?? 0),
    provider: record.provider,
    version: record.version,
    lastModifiedDate: record.lastModifiedDate,
  };
};

const extractLlmDetailsRows = (payload: any): any[] => {
  if (Array.isArray(payload)) {
    return payload;
  }

  for (const key of ["content", "items", "records", "data"]) {
    if (Array.isArray(payload?.[key])) {
      return payload[key];
    }
  }

  if (payload?.data && typeof payload.data === "object") {
    return extractLlmDetailsRows(payload.data);
  }

  return [];
};

const scorePrompt = (prompt: LlmDetailsSummary, tags: string[]): number => {
  const promptTags = new Set(
    (prompt.tags ?? []).map((tag) => tag.toLowerCase()),
  );
  const tagScore = tags.reduce(
    (score, tag) => score + (promptTags.has(tag.toLowerCase()) ? 1 : 0),
    0,
  );
  return tagScore * 100 + (prompt.ratingScore ?? 0);
};

const classifyThorApiQueryError = (error: any): Error => {
  const status = error?.response?.status;
  if (status === 401) {
    return new Error(
      "ThorAPI LLMDetails query requires refreshed sign-in auth",
    );
  }
  if (status === 403) {
    return new Error("ThorAPI LLMDetails query was denied by RBAC policy");
  }
  if (status === 429) {
    return new Error("ThorAPI LLMDetails query was rate limited");
  }
  if (error?.request && !error?.response) {
    return new Error("ThorAPI LLMDetails query is offline or unreachable");
  }
  return error instanceof Error
    ? error
    : new Error("ThorAPI LLMDetails query failed");
};

export class ThorApiLlmDetailsClient implements LlmDetailsClient {
  private readonly http: AxiosInstance;
  private readonly hasAuth: boolean;

  constructor(authToken?: string, basePath = "https://api-0.valkyrlabs.com") {
    this.hasAuth = Boolean(authToken);
    this.http = axios.create({
      baseURL: normalizeApiBase(basePath),
      timeout: 10000,
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
    });
  }

  async query(query: LlmDetailsQuery): Promise<LlmDetailsSummary[]> {
    if (!this.hasAuth) {
      throw new Error("ThorAPI LLMDetails query requires signed-in auth");
    }

    const example = encodeURIComponent(
      JSON.stringify({
        trashed: false,
      }),
    );
    let response;
    try {
      response = await this.http.get(`/LlmDetails?example=${example}`);
    } catch (error) {
      throw classifyThorApiQueryError(error);
    }
    const rows = extractLlmDetailsRows(response.data);

    return rows
      .map(toPromptSummary)
      .filter((prompt): prompt is LlmDetailsSummary => Boolean(prompt))
      .filter((prompt) => scorePrompt(prompt, query.tags) > 0)
      .sort(
        (left, right) =>
          scorePrompt(right, query.tags) - scorePrompt(left, query.tags),
      )
      .slice(0, query.limit ?? 1);
  }
}
