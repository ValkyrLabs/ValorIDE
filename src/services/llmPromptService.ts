import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { getAllExtensionState, getSecret } from "@core/storage/state";
import { normalizeValkyraiHost } from "@utils/serverValkyraiHost";

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
  stack: ProjectStack;
  limit: number;
}

export interface LLMDetailsPromptCandidate {
  id?: string;
  name?: string;
  initialPrompt?: string;
  prompt?: string;
  systemPrompt?: string;
  promptType?: "SYSTEM" | "APPEND" | string;
  tags?: string[] | string;
  ratingScore?: number;
  rating?: number;
  updatedDate?: string;
  lastModifiedDate?: string;
  isPremium?: boolean;
  accessStatus?: string;
}

export interface LLMDetailsPromptService {
  query(input: LLMDetailsQuery): Promise<LLMDetailsPromptCandidate | null>;
}

export class LLMPromptService {
  private workspaceRoot: string;
  private logger: vscode.OutputChannel;
  private selectedPrompt: SelectedPrompt | null = null;
  private projectStack: ProjectStack | null = null;
  private llmDetailsService: LLMDetailsPromptService | null = null;

  constructor(workspaceRoot: string, logger: vscode.OutputChannel) {
    this.workspaceRoot = workspaceRoot;
    this.logger = logger;
  }

  /**
   * Initialize — detect project stack and attempt ThorAPI load
   */
  async initialize(llmDetailsService?: LLMDetailsPromptService): Promise<void> {
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
          "[LLMPromptService] LLMDetailsService not available, skipping ThorAPI load",
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

      // Query LLMDetailsService by tag (highest-rated first)
      // This is a mock call - actual implementation requires webview RTK Query integration
      const llmDetails = await this.queryLLMDetails(tags);

      if (llmDetails) {
        this.selectedPrompt = {
          source: "thorapi",
          llmDetailsId: llmDetails.id,
          name: llmDetails.name,
          prompt: llmDetails.initialPrompt,
          mode: normalizePromptMode(llmDetails.promptType),
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

  /**
   * Query LLMDetails by tags through the injected extension-host client.
   */
  private async queryLLMDetails(
    tags: string[],
  ): Promise<LLMDetailsPromptCandidate | null> {
    if (!this.llmDetailsService || !this.projectStack) {
      return null;
    }
    return await this.llmDetailsService.query({
      tags,
      stack: this.projectStack,
      limit: 1,
    });
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

export function createExtensionHostLLMDetailsService(
  context: vscode.ExtensionContext,
  logger: vscode.OutputChannel,
): LLMDetailsPromptService {
  return {
    async query(input: LLMDetailsQuery) {
      const { apiConfiguration } = await getAllExtensionState(context);
      if (!apiConfiguration?.valkyraiHost) {
        logger.appendLine(
          "[LLMPromptService] ThorAPI query skipped: ValkyrAI host is not configured",
        );
        return null;
      }

      const endpoint = new URL(
        `${normalizeValkyraiHost(apiConfiguration.valkyraiHost)}/LlmDetails`,
      );
      endpoint.searchParams.set("limit", String(Math.max(input.limit, 10)));
      endpoint.searchParams.set("sort", "ratingScore,desc");
      for (const tag of input.tags) {
        endpoint.searchParams.append("tags", tag);
      }

      const headers: Record<string, string> = {
        Accept: "application/json",
      };
      const authToken =
        apiConfiguration.valkyraiJwt || (await getSecret(context, "jwtToken"));
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }

      const response = await fetch(endpoint.toString(), { headers });
      if (response.status === 401 || response.status === 403) {
        logger.appendLine(
          `[LLMPromptService] ThorAPI query denied by RBAC (${response.status}); using fallback prompt`,
        );
        return null;
      }
      if (!response.ok) {
        throw new Error(`LlmDetails query failed with HTTP ${response.status}`);
      }

      const payload = await response.json();
      return selectBestLlmDetailsPrompt(payload, input.tags);
    },
  };
}

export function selectBestLlmDetailsPrompt(
  payload: unknown,
  tags: string[],
): LLMDetailsPromptCandidate | null {
  const candidates = extractLlmDetails(payload).filter((candidate) => {
    const prompt =
      candidate.initialPrompt || candidate.prompt || candidate.systemPrompt;
    if (!prompt || typeof prompt !== "string") {
      return false;
    }
    const accessStatus = `${candidate.accessStatus || ""}`.toLowerCase();
    return !candidate.isPremium && accessStatus !== "blocked";
  });

  if (candidates.length === 0) {
    return null;
  }

  const queryTags = new Set(tags.map((tag) => tag.toLowerCase()));
  return candidates
    .map((candidate) => ({
      candidate,
      tagScore: normalizeTags(candidate.tags).filter((tag) =>
        queryTags.has(tag.toLowerCase()),
      ).length,
      rating:
        typeof candidate.ratingScore === "number"
          ? candidate.ratingScore
          : typeof candidate.rating === "number"
            ? candidate.rating
            : 0,
      recency:
        Date.parse(candidate.updatedDate || candidate.lastModifiedDate || "") ||
        0,
    }))
    .sort(
      (a, b) =>
        b.tagScore - a.tagScore ||
        b.rating - a.rating ||
        b.recency - a.recency,
    )[0].candidate;
}

function extractLlmDetails(payload: unknown): LLMDetailsPromptCandidate[] {
  if (Array.isArray(payload)) {
    return payload as LLMDetailsPromptCandidate[];
  }
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    for (const key of ["content", "items", "data", "results"]) {
      if (Array.isArray(record[key])) {
        return record[key] as LLMDetailsPromptCandidate[];
      }
    }
  }
  return [];
}

function normalizePromptMode(mode: unknown): "SYSTEM" | "APPEND" {
  return mode === "APPEND" ? "APPEND" : "SYSTEM";
}

function normalizeTags(tags: unknown): string[] {
  if (Array.isArray(tags)) {
    return tags
      .map((tag) => `${tag}`.trim())
      .filter((tag) => tag.length > 0);
  }
  if (typeof tags === "string") {
    return tags
      .split(/[,\s]+/)
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
  }
  return [];
}

/**
 * Initialize global LLMPromptService instance
 */
export async function initializeLLMPromptService(
  workspaceRoot: string,
  logger: vscode.OutputChannel,
  llmDetailsService?: LLMDetailsPromptService,
  manualSelection?: SelectedPrompt,
): Promise<void> {
  llmPromptService = new LLMPromptService(workspaceRoot, logger);
  if (manualSelection) {
    llmPromptService.applyManualSelection(manualSelection);
  } else {
    await llmPromptService.initialize(llmDetailsService);
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
