import * as vscode from "vscode";
import { PromptService, getPromptService } from "./promptService";
import { MemoryBankLoader, getMemoryBankLoader } from "./memoryBankLoader";
import { LLMPromptService, getLLMPromptService } from "./llmPromptService";

/**
 * LLMContextInjector — Synthesizes all prompt configs into unified LLM system context
 *
 * Layers:
 * 1. Base system prompt (from system.json §0–§10)
 * 2. ThorAPI catalog (services, models, RBAC)
 * 3. Swarm rules (Supervisor + Workers, coordination)
 * 4. Memory bank (projectContext, activeContext, systemPatterns, progress)
 * 5. LLMDetails override (if selected via UI dropdown)
 *
 * Output: Single unified system prompt ready for LLM API call
 */

export interface InjectionConfig {
  includeSystemPrompt: boolean;
  includeThorAPICatalog: boolean;
  includeSwarmRules: boolean;
  includeMemoryBank: boolean;
  includeLLMDetailsOverride: boolean;
}

export class LLMContextInjector {
  private promptService: PromptService | null = null;
  private memoryBankLoader: MemoryBankLoader | null = null;
  private llmPromptService: LLMPromptService | null = null;
  private logger: vscode.OutputChannel;
  private defaultConfig: InjectionConfig = {
    includeSystemPrompt: true,
    includeThorAPICatalog: true,
    includeSwarmRules: true,
    includeMemoryBank: true,
    includeLLMDetailsOverride: true,
  };

  constructor(logger: vscode.OutputChannel) {
    this.logger = logger;
  }

  /**
   * Initialize injector — ensure all services are loaded
   */
  async initialize(): Promise<void> {
    this.logger.appendLine("[LLMContextInjector] Initializing...");

    try {
      // Get singleton instances (should be pre-initialized by extension.ts)
      this.promptService = getPromptService();
      this.memoryBankLoader = getMemoryBankLoader();
      this.llmPromptService = getLLMPromptService();

      this.logger.appendLine(
        "[LLMContextInjector] ✅ All services initialized",
      );
    } catch (error) {
      this.logger.appendLine(
        `[LLMContextInjector] ⚠️ Some services not ready: ${error}`,
      );
    }
  }

  /**
   * Generate unified system prompt (all layers merged)
   */
  generateSystemPrompt(config?: Partial<InjectionConfig>): string {
    const mergedConfig = { ...this.defaultConfig, ...config };
    const sections: string[] = [];

    this.logger.appendLine(
      "[LLMContextInjector] Generating unified system prompt...",
    );

    try {
      let selectedPrompt: ReturnType<LLMPromptService["getSelectedPrompt"]> =
        null;

      if (mergedConfig.includeLLMDetailsOverride && this.llmPromptService) {
        try {
          selectedPrompt = this.llmPromptService.getSelectedPrompt();
        } catch {
          selectedPrompt = null;
        }
      }

      const shouldReplaceSystemPrompt =
        !!selectedPrompt &&
        selectedPrompt.mode === "SYSTEM" &&
        !!selectedPrompt.prompt;

      // Layer 1: Base system prompt (§0–§10) or replacement
      if (shouldReplaceSystemPrompt) {
        sections.push(this.formatCustomPromptSection(selectedPrompt!));
        this.logger.appendLine(
          `[LLMContextInjector] ✅ Layer 1: Custom system prompt applied (${selectedPrompt!.name})`,
        );
      } else if (mergedConfig.includeSystemPrompt && this.promptService) {
        const systemText = this.promptService.getSystemPrompt();
        sections.push(systemText);
        this.logger.appendLine(
          "[LLMContextInjector] ✅ Layer 1: System prompt injected",
        );
      }

      // Layer 2: ThorAPI catalog
      if (mergedConfig.includeThorAPICatalog && this.promptService) {
        const catalog = this.promptService.getThorAPICatalog();
        const catalogSection = this.formatThorAPICatalogSection(catalog);
        sections.push(catalogSection);
        this.logger.appendLine(
          "[LLMContextInjector] ✅ Layer 2: ThorAPI catalog injected",
        );
      }

      // Layer 3: Swarm rules
      if (mergedConfig.includeSwarmRules && this.promptService) {
        const swarmRules = this.promptService.getSwarmRules();
        const swarmSection = this.formatSwarmRulesSection(swarmRules);
        sections.push(swarmSection);
        this.logger.appendLine(
          "[LLMContextInjector] ✅ Layer 3: Swarm rules injected",
        );
      }

      // Layer 4: Memory bank (project + system context)
      if (mergedConfig.includeMemoryBank && this.memoryBankLoader) {
        const memoryBank = this.memoryBankLoader.getMemoryBank();
        if (memoryBank) {
          const memorySection = this.formatMemoryBankSection(memoryBank);
          sections.push(memorySection);
          this.logger.appendLine(
            "[LLMContextInjector] ✅ Layer 4: Memory bank injected",
          );
        }
      }

      // Layer 5: LLMDetails override (APPEND mode)
      if (
        mergedConfig.includeLLMDetailsOverride &&
        selectedPrompt &&
        selectedPrompt.mode === "APPEND" &&
        selectedPrompt.prompt
      ) {
        sections.push(this.formatCustomPromptSection(selectedPrompt));
        this.logger.appendLine(
          `[LLMContextInjector] ✅ Layer 5: LLMDetails override appended (${selectedPrompt.name})`,
        );
      }

      const unified = sections.join("\n\n===== SECTION SEPARATOR =====\n\n");
      this.logger.appendLine(
        `[LLMContextInjector] ✅ Unified prompt generated (${unified.length} chars)`,
      );

      return unified;
    } catch (error) {
      this.logger.appendLine(
        `[LLMContextInjector] ❌ Generation failed: ${error}`,
      );
      throw error;
    }
  }

  /**
   * Format ThorAPI catalog as prompt section
   */
  private formatThorAPICatalogSection(catalog: any): string {
    const services = catalog.services || [];
    const models = catalog.models || [];
    const serviceSummary =
      services.map((s: any) => `  - ${s.name}: ${s.description}`).join("\n") ||
      "  (No services configured)";

    const modelSummary =
      models.length > 0
        ? models
            .map(
              (m: any) =>
                `  - ${m.name}: ${Object.keys(m.fields || {}).length} fields`,
            )
            .join("\n")
        : "  • Application\n  • ContentData\n  • UsageTransaction\n  • Rating\n  • LLMDetails\n  • Workflow\n  • WorkflowExecution";

    return `
================================================================================
THORAPI SERVICE CATALOG — AUTO-GENERATED SERVICES & MODELS
================================================================================

SERVICES AVAILABLE:
${serviceSummary}

MODELS AVAILABLE:
${modelSummary}

RBAC MATRIX:
${JSON.stringify(catalog.rbac_matrix, null, 2)}

DEPLOYMENT TARGETS:
${catalog.deployment_targets?.map((t: any) => `  - ${t.name}: ${t.description}`).join("\n")}

BEST PRACTICES:
${Object.entries(catalog.best_practices || {})
  .map(
    ([category, practices]: [string, any]) =>
      `  ${category}:\n${(practices as string[]).map((p) => `    • ${p}`).join("\n")}`,
  )
  .join("\n")}

DOGFOOD MANDATE — Use these services prioritized:
${catalog.dogfood_mandate?.priority_order?.map((s: string, i: number) => `  ${i + 1}. ${s}`).join("\n")}
================================================================================
`;
  }

  /**
   * Format swarm rules as prompt section
   */
  private formatSwarmRulesSection(swarmRules: any): string {
    const workerSummary = swarmRules.worker_agents
      .map((w: any) => `  - ${w.name}: ${w.specialization}`)
      .join("\n");

    const taskIntents = Object.entries(
      swarmRules.supervisor_agent?.task_intent_detection || {},
    )
      .map(
        ([intent, details]: [string, any]) =>
          `    • ${intent}: ${(details as any).description}`,
      )
      .join("\n");

    return `
================================================================================
SWARM ORCHESTRATION RULES — MULTI-AGENT COORDINATION
================================================================================

SUPERVISOR AGENT (Orchestrator):
  - Role: Route tasks to best-fit workers
  - Responsibilities: ${swarmRules.supervisor_agent?.responsibilities?.slice(0, 3).join(", ")}...

WORKER AGENTS AVAILABLE:
${workerSummary}

TASK INTENT DETECTION:
${taskIntents}

WORKER SELECTION ALGORITHM:
  Score = (queue_length × 2) + (cpu_usage ÷ 10) + (memory_usage ÷ 20)
  → Assign to worker with LOWEST score

MESSAGE PROTOCOL:
  Types: ${Object.keys(swarmRules.message_types || {})
    .slice(0, 5)
    .join(", ")}...

PRIORITY LEVELS:
  - CRITICAL: User-blocking, immediate (no timeout)
  - HIGH: Important task (300 sec timeout)
  - NORMAL: Standard feature (180 sec timeout)
  - LOW: Documentation, cleanup (120 sec timeout)

RATING FEEDBACK LOOP:
  → Task Execution → Rate Outcome → Weekly Analysis → Enhance Prompt → Broadcast → Better Tasks

================================================================================
`;
  }

  /**
   * Format memory bank as prompt section
   */
  private formatMemoryBankSection(memoryBank: any): string {
    const sections: string[] = [];

    if (memoryBank.projectContext?.content) {
      sections.push(
        `PROJECT CONTEXT:\n${memoryBank.projectContext.content.substring(0, 500)}...`,
      );
    }

    if (memoryBank.activeContext?.content) {
      sections.push(
        `ACTIVE CONTEXT:\n${memoryBank.activeContext.content.substring(0, 500)}...`,
      );
    }

    if (memoryBank.systemPatterns?.content) {
      sections.push(
        `SYSTEM PATTERNS:\n${memoryBank.systemPatterns.content.substring(0, 500)}...`,
      );
    }

    return `
================================================================================
MEMORY BANK — CONTEXT PERSISTENCE & PATTERNS
================================================================================

${sections.join("\n\n")}

================================================================================
`;
  }

  private formatCustomPromptSection(prompt: {
    name: string;
    prompt: string;
  }): string {
    return `===== CUSTOM PROMPT (${prompt.name}) =====\n${prompt.prompt}`;
  }

  /**
   * Get system prompt for LLM API call
   * Wrapper for simplicity
   */
  getSystemPrompt(overrideLLMDetails?: boolean): string {
    const config: InjectionConfig = { ...this.defaultConfig };
    if (overrideLLMDetails === false) {
      config.includeLLMDetailsOverride = false;
    }
    return this.generateSystemPrompt(config);
  }

  /**
   * Log state
   */
  logState(): void {
    this.logger.appendLine("[LLMContextInjector] Current state:");
    this.logger.appendLine(
      `  - PromptService: ${this.promptService ? "✅" : "❌"}`,
    );
    this.logger.appendLine(
      `  - MemoryBankLoader: ${this.memoryBankLoader ? "✅" : "❌"}`,
    );
    this.logger.appendLine(
      `  - LLMPromptService: ${this.llmPromptService ? "✅" : "❌"}`,
    );
  }
}

export let llmContextInjector: LLMContextInjector | null = null;

/**
 * Initialize global LLMContextInjector instance
 */
export async function initializeLLMContextInjector(
  logger: vscode.OutputChannel,
): Promise<void> {
  llmContextInjector = new LLMContextInjector(logger);
  await llmContextInjector.initialize();
}

/**
 * Get global LLMContextInjector instance
 */
export function getLLMContextInjector(): LLMContextInjector {
  if (!llmContextInjector) {
    throw new Error("LLMContextInjector not initialized");
  }
  return llmContextInjector;
}
