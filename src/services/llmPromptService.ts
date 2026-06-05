import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { getAllExtensionState, getSecret } from "@core/storage/state";
import { normalizeValkyraiHost } from "@utils/serverValkyraiHost";
import type { LlmDetailsSummary } from "@shared/llm";

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

export interface ProjectStack {
  language: "java" | "python" | "nodejs" | "typescript" | "mixed" | "unknown";
  framework?: string;
  isThorAPI: boolean;
  isGenerated: boolean;
}

export interface LLMDetailsQuery {
  tags: string[];
  projectStack: ProjectStack | null;
}

export interface LLMDetailsService {
  queryByTags(query: LLMDetailsQuery): Promise<LlmDetailsSummary | null>;
}

type FetchLike = (
  input: string,
  init?: RequestInit,
) => Promise<{
  ok: boolean;
  status: number;
  statusText?: string;
  json(): Promise<unknown>;
}>;

const extractLLMDetailsList = (payload: unknown): LlmDetailsSummary[] => {
  if (Array.isArray(payload)) {
    return payload as LlmDetailsSummary[];
  }
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    for (const key of ["data", "content", "items", "results"]) {
      if (Array.isArray(record[key])) {
        return record[key] as LlmDetailsSummary[];
      }
    }
  }
  return [];
};

const parseMetadata = (
  llmDetails: LlmDetailsSummary & { metaData?: unknown },
): Record<string, unknown> => {
  const raw = llmDetails.metaData;
  if (!raw || typeof raw !== "string") {
    return {};
  }
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
};

const normalizeTags = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .filter((tag): tag is string => typeof tag === "string")
      .map((tag) => tag.toLowerCase().trim())
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[,\s]+/u)
      .map((tag) => tag.toLowerCase().trim())
      .filter(Boolean);
  }
  return [];
};

const scoreLLMDetails = (
  llmDetails: LlmDetailsSummary,
  queryTags: string[],
  projectStack: ProjectStack | null,
): number => {
  if (!llmDetails.initialPrompt?.trim()) {
    return -1;
  }

  const metadata = parseMetadata(llmDetails);
  const detailsTags = new Set([
    ...normalizeTags(llmDetails.tags),
    ...normalizeTags(metadata.tags),
    ...normalizeTags(metadata.stack),
    ...normalizeTags(metadata.promptTags),
  ]);
  const searchableText = [
    llmDetails.name,
    llmDetails.description,
    llmDetails.provider,
    llmDetails.version,
    metadata.intent,
    metadata.source,
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();

  const tagScore = queryTags.reduce((score, tag) => {
    const normalizedTag = tag.toLowerCase();
    if (detailsTags.has(normalizedTag)) {
      return score + 25;
    }
    if (searchableText.includes(normalizedTag)) {
      return score + 8;
    }
    return score;
  }, 0);

  const thorApiScore =
    projectStack?.isThorAPI &&
    (detailsTags.has("thorapi") || searchableText.includes("thorapi"))
      ? 20
      : 0;
  const ratingScore =
    typeof llmDetails.ratingScore === "number" ? llmDetails.ratingScore : 0;

  return tagScore + thorApiScore + ratingScore;
};

export class ExtensionHostLLMDetailsService implements LLMDetailsService {
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly logger: vscode.OutputChannel,
    private readonly fetchImpl: FetchLike = fetch as FetchLike,
  ) {}

  async queryByTags(query: LLMDetailsQuery): Promise<LlmDetailsSummary | null> {
    const { apiConfiguration } = await getAllExtensionState(this.context);
    const valkyraiHost = normalizeValkyraiHost(apiConfiguration?.valkyraiHost);
    const authToken =
      apiConfiguration?.valkyraiJwt ||
      (await getSecret(this.context, "jwtToken"));

    if (!authToken) {
      this.logger.appendLine(
        "[LLMPromptService] ThorAPI LLMDetails skipped: missing auth token",
      );
      return null;
    }

    const response = await this.fetchImpl(`${valkyraiHost}/LlmDetails`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const reason =
        response.status === 401
          ? "auth"
          : response.status === 402
            ? "credits"
            : response.status === 403
              ? "forbidden"
              : response.status >= 500
                ? "unavailable"
                : "request";
      throw new Error(
        `LLMDetails ${reason} failure (${response.status} ${response.statusText || ""})`.trim(),
      );
    }

    const llmDetails = extractLLMDetailsList(await response.json());
    const ranked = llmDetails
      .map((candidate) => ({
        candidate,
        score: scoreLLMDetails(
          candidate,
          query.tags,
          query.projectStack,
        ),
      }))
      .filter(({ score }) => score >= 0)
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }
        const rightDate = new Date(
          right.candidate.lastModifiedDate ?? 0,
        ).getTime();
        const leftDate = new Date(
          left.candidate.lastModifiedDate ?? 0,
        ).getTime();
        return rightDate - leftDate;
      });

    return ranked[0]?.candidate ?? null;
  }
}

export class LLMPromptService {
  private workspaceRoot: string;
  private logger: vscode.OutputChannel;
  private selectedPrompt: SelectedPrompt | null = null;
  private projectStack: ProjectStack | null = null;
  private llmDetailsService: LLMDetailsService | null = null;

  constructor(workspaceRoot: string, logger: vscode.OutputChannel) {
    this.workspaceRoot = workspaceRoot;
    this.logger = logger;
  }

  /**
   * Initialize — detect project stack and attempt ThorAPI load
   */
  async initialize(llmDetailsService?: LLMDetailsService): Promise<void> {
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
          "[LLMPromptService] LLMDetailsService not available, using fallback prompt",
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
        this.selectedPrompt = {
          source: "thorapi",
          llmDetailsId: llmDetails.id,
          name: llmDetails.name || "ThorAPI LLMDetails Prompt",
          prompt: llmDetails.initialPrompt,
          mode: llmDetails.promptType || "SYSTEM",
          tags: normalizeTags(llmDetails.tags),
          stackSpecific: true,
        };
        this.logger.appendLine(
          `[LLMPromptService] ✅ Loaded from ThorAPI: ${llmDetails.name}`,
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
    return (
      (await this.llmDetailsService?.queryByTags({
        tags,
        projectStack: this.projectStack,
      })) ?? null
    );
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
  llmDetailsService?: LLMDetailsService,
  manualSelection?: SelectedPrompt,
): Promise<void> {
  llmPromptService = new LLMPromptService(workspaceRoot, logger);
  await llmPromptService.initialize(llmDetailsService);
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
