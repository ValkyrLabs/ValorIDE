import * as fs from "fs";
import * as path from "path";
export class PromptService {
  systemPrompt = null;
  thorapiCatalog = null;
  swarmRules = null;
  workspaceRoot;
  promptDir;
  logger;
  constructor(workspaceRoot, logger) {
    this.workspaceRoot = workspaceRoot;
    this.promptDir = path.join(workspaceRoot, ".valoride", "prompts");
    this.logger = logger;
  }
  /**
   * Initialize prompt service — load all configs from disk
   */
  async initialize() {
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
  async loadSystemPrompt() {
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
  async loadThorAPICatalog() {
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
  async loadSwarmRules() {
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
  getSystemPrompt() {
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
  getSystemPromptConfig() {
    if (!this.systemPrompt) {
      throw new Error("System prompt not loaded");
    }
    return this.systemPrompt;
  }
  /**
   * Get ThorAPI catalog
   */
  getThorAPICatalog() {
    if (!this.thorapiCatalog) {
      throw new Error("ThorAPI catalog not loaded");
    }
    return this.thorapiCatalog;
  }
  /**
   * Get swarm rules
   */
  getSwarmRules() {
    if (!this.swarmRules) {
      throw new Error("Swarm rules not loaded");
    }
    return this.swarmRules;
  }
  /**
   * Get all configs as JSON (for injection into prompts)
   */
  getAllConfigs() {
    return {
      systemPrompt: this.getSystemPromptConfig(),
      thorapiCatalog: this.getThorAPICatalog(),
      swarmRules: this.getSwarmRules(),
    };
  }
  /**
   * Check if prompt configs exist
   */
  promptsExist() {
    return (
      fs.existsSync(path.join(this.promptDir, "system.json")) &&
      fs.existsSync(path.join(this.promptDir, "thorapi-catalog.json")) &&
      fs.existsSync(path.join(this.promptDir, "swarm-rules.json"))
    );
  }
  /**
   * Get prompt directory path
   */
  getPromptDir() {
    return this.promptDir;
  }
  /**
   * Log current state
   */
  logState() {
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
export let promptService = null;
/**
 * Initialize global prompt service instance
 */
export async function initializePromptService(workspaceRoot, logger) {
  promptService = new PromptService(workspaceRoot, logger);
  await promptService.initialize();
}
/**
 * Get global prompt service instance
 */
export function getPromptService() {
  if (!promptService) {
    throw new Error("PromptService not initialized");
  }
  return promptService;
}
//# sourceMappingURL=promptService.js.map
