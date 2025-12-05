import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

/**
 * PromptService — Manages VALOR system prompts, ThorAPI catalog, and swarm rules
 * Loads from .valoride/prompts/ JSON configuration files
 */

export interface SystemPromptConfig {
  version: string;
  timestamp: string;
  description: string;
  sections: Array<{
    section: string;
    title: string;
    content: string;
  }>;
  llmDetails_integration?: {
    description: string;
    modes: Array<{ mode: string; description: string; useCase: string }>;
  };
  swarm_coordination?: {
    description: string;
    supervisor_logic: string[];
    worker_behavior: string[];
  };
  dogfood_mandate?: {
    priority_order: string[];
  };
}

export interface ThorAPICatalog {
  version: string;
  timestamp: string;
  description: string;
  services: Array<{
    name: string;
    path: string;
    category: string;
    description: string;
    operations: Array<{
      hook: string;
      method: string;
      endpoint: string;
      description: string;
      [key: string]: any;
    }>;
  }>;
  models: Array<{
    name: string;
    category: string;
    fields: Record<string, string>;
  }>;
  rbac_matrix?: Record<string, any>;
  deployment_targets?: Array<{
    name: string;
    description: string;
    config: string;
  }>;
  best_practices?: Record<string, string[]>;
}

export interface SwarmRules {
  version: string;
  timestamp: string;
  description: string;
  supervisor_agent: {
    role: string;
    responsibilities: string[];
    task_intent_detection: Record<string, any>;
  };
  worker_agents: Array<{
    name: string;
    role: string;
    specialization: string;
    responsibilities: string[];
    tools: string[];
    health_metrics: string[];
    prompt_tags: string[];
  }>;
  message_types: Record<string, any>;
  worker_selection_algorithm?: Record<string, any>;
  rating_feedback_loop?: Record<string, any>;
  quality_gates_per_agent?: Record<string, any>;
  priority_levels?: Record<string, any>;
}

export class PromptService {
  private systemPrompt: SystemPromptConfig | null = null;
  private thorapiCatalog: ThorAPICatalog | null = null;
  private swarmRules: SwarmRules | null = null;
  private workspaceRoot: string;
  private promptDir: string;
  private logger: vscode.OutputChannel;

  constructor(workspaceRoot: string, logger: vscode.OutputChannel) {
    this.workspaceRoot = workspaceRoot;
    this.promptDir = path.join(workspaceRoot, ".valoride", "prompts");
    this.logger = logger;
  }

  /**
   * Initialize prompt service — load all configs from disk
   */
  async initialize(): Promise<void> {
    this.logger.appendLine("[PromptService] Initializing...");

    try {
      await this.loadSystemPrompt();
      await this.loadThorAPICatalog();
      await this.loadSwarmRules();
      this.logger.appendLine("[PromptService] ✅ Initialization complete");
    } catch (error) {
      this.logger.appendLine(
        `[PromptService] ❌ Initialization failed: ${error}`,
      );
      throw error;
    }
  }

  /**
   * Load system.json from .valoride/prompts/
   */
  private async loadSystemPrompt(): Promise<void> {
    const filePath = path.join(this.promptDir, "system.json");
    this.logger.appendLine(
      `[PromptService] Loading system.json from ${filePath}`,
    );

    if (!fs.existsSync(filePath)) {
      throw new Error(`system.json not found at ${filePath}`);
    }

    const content = fs.readFileSync(filePath, "utf-8");
    this.systemPrompt = JSON.parse(content);
    this.logger.appendLine(
      `[PromptService] ✅ Loaded system.json (${this.systemPrompt.sections.length} sections)`,
    );
  }

  /**
   * Load thorapi-catalog.json from .valoride/prompts/
   */
  private async loadThorAPICatalog(): Promise<void> {
    const filePath = path.join(this.promptDir, "thorapi-catalog.json");
    this.logger.appendLine(
      `[PromptService] Loading thorapi-catalog.json from ${filePath}`,
    );

    if (!fs.existsSync(filePath)) {
      throw new Error(`thorapi-catalog.json not found at ${filePath}`);
    }

    const content = fs.readFileSync(filePath, "utf-8");
    this.thorapiCatalog = JSON.parse(content);
    this.logger.appendLine(
      `[PromptService] ✅ Loaded thorapi-catalog.json (${this.thorapiCatalog.services.length} services, ${this.thorapiCatalog.models.length} models)`,
    );
  }

  /**
   * Load swarm-rules.json from .valoride/prompts/
   */
  private async loadSwarmRules(): Promise<void> {
    const filePath = path.join(this.promptDir, "swarm-rules.json");
    this.logger.appendLine(
      `[PromptService] Loading swarm-rules.json from ${filePath}`,
    );

    if (!fs.existsSync(filePath)) {
      throw new Error(`swarm-rules.json not found at ${filePath}`);
    }

    const content = fs.readFileSync(filePath, "utf-8");
    this.swarmRules = JSON.parse(content);
    this.logger.appendLine(
      `[PromptService] ✅ Loaded swarm-rules.json (${this.swarmRules.worker_agents.length} workers)`,
    );
  }

  /**
   * Get compiled system prompt (all sections merged)
   */
  getSystemPrompt(): string {
    if (!this.systemPrompt) {
      throw new Error("System prompt not loaded");
    }

    return this.systemPrompt.sections
      .map((s) => `${s.section}: ${s.title}\n${s.content}`)
      .join("\n\n---\n\n");
  }

  /**
   * Get system prompt config object
   */
  getSystemPromptConfig(): SystemPromptConfig {
    if (!this.systemPrompt) {
      throw new Error("System prompt not loaded");
    }
    return this.systemPrompt;
  }

  /**
   * Get ThorAPI catalog
   */
  getThorAPICatalog(): ThorAPICatalog {
    if (!this.thorapiCatalog) {
      throw new Error("ThorAPI catalog not loaded");
    }
    return this.thorapiCatalog;
  }

  /**
   * Get swarm rules
   */
  getSwarmRules(): SwarmRules {
    if (!this.swarmRules) {
      throw new Error("Swarm rules not loaded");
    }
    return this.swarmRules;
  }

  /**
   * Get all configs as JSON (for injection into prompts)
   */
  getAllConfigs(): {
    systemPrompt: SystemPromptConfig;
    thorapiCatalog: ThorAPICatalog;
    swarmRules: SwarmRules;
  } {
    return {
      systemPrompt: this.getSystemPromptConfig(),
      thorapiCatalog: this.getThorAPICatalog(),
      swarmRules: this.getSwarmRules(),
    };
  }

  /**
   * Check if prompt configs exist
   */
  promptsExist(): boolean {
    return (
      fs.existsSync(path.join(this.promptDir, "system.json")) &&
      fs.existsSync(path.join(this.promptDir, "thorapi-catalog.json")) &&
      fs.existsSync(path.join(this.promptDir, "swarm-rules.json"))
    );
  }

  /**
   * Get prompt directory path
   */
  getPromptDir(): string {
    return this.promptDir;
  }

  /**
   * Log current state
   */
  logState(): void {
    this.logger.appendLine("[PromptService] Current state:");
    this.logger.appendLine(
      `  - System prompt: ${this.systemPrompt ? "✅" : "❌"}`,
    );
    this.logger.appendLine(
      `  - ThorAPI catalog: ${this.thorapiCatalog ? "✅" : "❌"}`,
    );
    this.logger.appendLine(`  - Swarm rules: ${this.swarmRules ? "✅" : "❌"}`);
  }
}

export let promptService: PromptService | null = null;

/**
 * Initialize global prompt service instance
 */
export async function initializePromptService(
  workspaceRoot: string,
  logger: vscode.OutputChannel,
): Promise<void> {
  promptService = new PromptService(workspaceRoot, logger);
  await promptService.initialize();
}

/**
 * Get global prompt service instance
 */
export function getPromptService(): PromptService {
  if (!promptService) {
    throw new Error("PromptService not initialized");
  }
  return promptService;
}
