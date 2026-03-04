/**
 * ToolRankingEngine — Auto-rank available tools by task relevance
 *
 * PRIORITY ORDER (dynamic scoring):
 * 1. PSR (Precision Search & Replace) for code edits
 *    - AST-first for TS/TSX files
 *    - Contextual regex fallback
 *    - Shell sed last resort
 * 2. Browser automation for UI/testing
 * 3. CLI tools (npm, mvn, pytest, etc.)
 * 4. MCP tools (discovered + installed on-demand)
 * 5. File I/O tools
 *
 * Scoring algorithm: relevance_score = (task_match * 0.5) + (recent_success_rate * 0.3) + (efficiency * 0.2)
 *
 * @see .valoride/memorybank/VALOR_PRD_2025.md § FR-3
 */

import * as vscode from "vscode";

export enum ToolType {
  PSR = "psr",
  FILE_IO = "file_io",
  BROWSER = "browser",
  CLI = "cli",
  MCP = "mcp",
  SEARCH = "search",
}

export enum TaskIntent {
  CODE_EDIT = "code-edit",
  BROWSER_WORK = "browser-work",
  CLI_TEST = "cli-test",
  FILE_OPERATION = "file-operation",
  SEARCH = "search",
  MCP_TOOL = "mcp-tool",
}

export interface Tool {
  id: string;
  type: ToolType;
  name: string;
  description: string;
  filePatterns?: string[]; // e.g., ['*.ts', '*.tsx', '*.java']
  supportedTaskIntents: TaskIntent[];
  isAvailable: boolean;
  successRate: number; // 0-1 (based on historical runs)
  avgExecutionTime: number; // milliseconds
  costScore: number; // 0-1 (higher = more expensive in tokens)
}

export interface RankedToolResult {
  tool: Tool;
  score: number; // 0-100
  rank: number; // 1, 2, 3...
  reason: string; // Why this tool was ranked
}

export class ToolRankingEngine {
  private tools: Map<string, Tool> = new Map();
  private toolHistory: Map<string, ToolExecution[]> = new Map();
  private logger: vscode.OutputChannel;

  constructor(logger: vscode.OutputChannel) {
    this.logger = logger;
    this.initializeTools();
  }

  /**
   * Initialize built-in tools with baseline metrics
   */
  private initializeTools(): void {
    // PSR Tool (High priority for code edits)
    this.tools.set("psr", {
      id: "psr",
      type: ToolType.PSR,
      name: "Precision Search & Replace",
      description: "Surgical code edits with AST + contextual regex fallback",
      filePatterns: ["*.ts", "*.tsx", "*.js", "*.jsx", "*.java", "*.py"],
      supportedTaskIntents: [TaskIntent.CODE_EDIT],
      isAvailable: true,
      successRate: 0.95,
      avgExecutionTime: 1200,
      costScore: 0.1,
    });

    // Browser Tool
    this.tools.set("browser", {
      id: "browser",
      type: ToolType.BROWSER,
      name: "Browser Automation",
      description: "Headless Chrome + Computer Use for UI testing",
      supportedTaskIntents: [TaskIntent.BROWSER_WORK],
      isAvailable: true,
      successRate: 0.9,
      avgExecutionTime: 3000,
      costScore: 0.3,
    });

    // CLI Tool
    this.tools.set("cli", {
      id: "cli",
      type: ToolType.CLI,
      name: "Terminal Execution",
      description: "Run npm, mvn, pytest, docker commands",
      supportedTaskIntents: [TaskIntent.CLI_TEST],
      isAvailable: true,
      successRate: 0.88,
      avgExecutionTime: 5000,
      costScore: 0.2,
    });

    // File I/O Tool
    this.tools.set("file_io", {
      id: "file_io",
      type: ToolType.FILE_IO,
      name: "File Operations",
      description: "Read, write, delete, search files",
      supportedTaskIntents: [TaskIntent.FILE_OPERATION, TaskIntent.SEARCH],
      isAvailable: true,
      successRate: 0.99,
      avgExecutionTime: 500,
      costScore: 0.05,
    });

    // Search Tool
    this.tools.set("search", {
      id: "search",
      type: ToolType.SEARCH,
      name: "Ripgrep Search",
      description: "Fast regex-based code search",
      supportedTaskIntents: [TaskIntent.SEARCH],
      isAvailable: true,
      successRate: 0.97,
      avgExecutionTime: 800,
      costScore: 0.08,
    });

    this.logger.appendLine(
      "[ToolRankingEngine] ✅ Initialized 5 built-in tools",
    );
  }

  /**
   * Register external tool (MCP or custom)
   */
  registerTool(tool: Tool): void {
    this.tools.set(tool.id, tool);
    this.toolHistory.set(tool.id, []);
    this.logger.appendLine(`[ToolRankingEngine] Tool registered: ${tool.name}`);
  }

  /**
   * Rank tools by relevance to task
   */
  rankToolsForTask(
    intent: TaskIntent,
    context?: {
      fileName?: string;
      fileSize?: number;
      language?: string;
    },
  ): RankedToolResult[] {
    const candidates = Array.from(this.tools.values()).filter(
      (t) => t.supportedTaskIntents.includes(intent) && t.isAvailable,
    );

    const ranked = candidates
      .map((tool) => {
        const score = this.calculateToolScore(tool, intent, context);
        return { tool, score };
      })
      .sort((a, b) => b.score - a.score)
      .map((item, idx) => ({
        ...item,
        rank: idx + 1,
        reason: this.generateRankReason(item.tool, item.score, intent),
      }));

    this.logger.appendLine(
      `[ToolRankingEngine] Ranked ${ranked.length} tools for ${intent}: ${ranked
        .map((r) => `${r.rank}. ${r.tool.name} (${r.score.toFixed(1)})`)
        .join(", ")}`,
    );

    return ranked;
  }

  /**
   * Calculate tool score (0-100) based on:
   * - Task match (50%)
   * - Success rate (30%)
   * - Efficiency (20%)
   */
  private calculateToolScore(
    tool: Tool,
    intent: TaskIntent,
    context?: any,
  ): number {
    let taskMatch = 0.5;

    // File pattern matching (if applicable)
    if (context?.fileName && tool.filePatterns) {
      const matches = tool.filePatterns.some((pattern) =>
        this.matchFilePattern(context.fileName, pattern),
      );
      taskMatch = matches ? 0.9 : 0.5;
    }

    // PSR-first for code edits
    if (intent === TaskIntent.CODE_EDIT && tool.type === ToolType.PSR) {
      taskMatch = 1.0;
    }

    // Success rate component (30% weight)
    const successRateScore = tool.successRate * 100 * 0.3;

    // Efficiency component (inverse of cost + execution time) (20% weight)
    const timeNormalized = Math.max(0, 1 - tool.avgExecutionTime / 10000);
    const costNormalized = 1 - tool.costScore;
    const efficiencyScore = ((timeNormalized + costNormalized) / 2) * 100 * 0.2;

    // Total score (0-100): 50% task match + 30% success rate + 20% efficiency
    const score = taskMatch * 100 * 0.5 + successRateScore + efficiencyScore;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Match file pattern (e.g., "*.ts" matches "foo.ts")
   */
  private matchFilePattern(fileName: string, pattern: string): boolean {
    const regex = new RegExp(
      "^" + pattern.replace(/\*/g, ".*").replace(/\./g, "\\.") + "$",
    );
    return regex.test(fileName);
  }

  /**
   * Generate human-readable rank reason
   */
  private generateRankReason(
    tool: Tool,
    score: number,
    intent: TaskIntent,
  ): string {
    if (tool.type === ToolType.PSR && intent === TaskIntent.CODE_EDIT) {
      return `PSR-first mandate for ${intent}. Success rate: ${(tool.successRate * 100).toFixed(0)}%`;
    }

    if (score >= 90) {
      return `Best match for ${intent}. High success rate (${(tool.successRate * 100).toFixed(0)}%).`;
    }

    if (score >= 70) {
      return `Good fit. Success: ${(tool.successRate * 100).toFixed(0)}%, Cost: ${(tool.costScore * 10).toFixed(1)}/10`;
    }

    return `Fallback option. Try higher-ranked tools first.`;
  }

  /**
   * Record tool execution for historical analysis
   */
  recordExecution(
    toolId: string,
    success: boolean,
    duration: number,
    tokensUsed?: number,
  ): void {
    if (!this.toolHistory.has(toolId)) {
      this.toolHistory.set(toolId, []);
    }

    const execution: ToolExecution = {
      toolId,
      success,
      duration,
      tokensUsed,
      timestamp: Date.now(),
    };

    const history = this.toolHistory.get(toolId)!;
    history.push(execution);

    // Keep last 100 executions per tool
    if (history.length > 100) {
      history.shift();
    }

    // Update tool metrics (running average)
    const tool = this.tools.get(toolId);
    if (tool) {
      const recentRuns = history.slice(-10); // Last 10 runs
      const successCount = recentRuns.filter((e) => e.success).length;
      tool.successRate = successCount / recentRuns.length;
      tool.avgExecutionTime =
        recentRuns.reduce((sum, e) => sum + e.duration, 0) / recentRuns.length;

      this.logger.appendLine(
        `[ToolRankingEngine] ${tool.name}: ${success ? "✅" : "❌"} (${duration}ms, success rate: ${(tool.successRate * 100).toFixed(0)}%)`,
      );
    }
  }

  /**
   * Get tool by ID
   */
  getTool(id: string): Tool | undefined {
    return this.tools.get(id);
  }

  /**
   * Get all tools
   */
  getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tool execution history
   */
  getToolHistory(toolId: string): ToolExecution[] {
    return this.toolHistory.get(toolId) || [];
  }

  /**
   * Get tool performance stats
   */
  getToolStats(toolId: string): ToolStats | null {
    const tool = this.tools.get(toolId);
    const history = this.toolHistory.get(toolId) || [];

    if (!tool || history.length === 0) {
      return null;
    }

    const successCount = history.filter((e) => e.success).length;
    const totalDuration = history.reduce((sum, e) => sum + e.duration, 0);
    const totalTokens = history.reduce(
      (sum, e) => sum + (e.tokensUsed || 0),
      0,
    );

    return {
      toolId,
      toolName: tool.name,
      totalExecutions: history.length,
      successCount,
      failureCount: history.length - successCount,
      successRate: successCount / history.length,
      avgDuration: totalDuration / history.length,
      totalTokens,
      avgTokens: totalTokens / history.length,
    };
  }

  /**
   * Log comprehensive stats
   */
  logStats(): void {
    this.logger.appendLine("[ToolRankingEngine] Performance Stats:");

    this.tools.forEach((tool) => {
      const stats = this.getToolStats(tool.id);
      if (stats) {
        this.logger.appendLine(
          `  ${tool.name}: ${stats.successCount}/${stats.totalExecutions} success (${(stats.successRate * 100).toFixed(0)}%), avg ${stats.avgDuration.toFixed(0)}ms, ${stats.totalTokens} tokens`,
        );
      }
    });
  }
}

export interface ToolExecution {
  toolId: string;
  success: boolean;
  duration: number; // milliseconds
  tokensUsed?: number;
  timestamp: number;
}

export interface ToolStats {
  toolId: string;
  toolName: string;
  totalExecutions: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  avgDuration: number;
  totalTokens: number;
  avgTokens: number;
}

export let toolRankingEngine: ToolRankingEngine | null = null;

/**
 * Initialize global ToolRankingEngine
 */
export function initializeToolRankingEngine(
  logger: vscode.OutputChannel,
): void {
  toolRankingEngine = new ToolRankingEngine(logger);
}

/**
 * Get global ToolRankingEngine
 */
export function getToolRankingEngine(): ToolRankingEngine {
  if (!toolRankingEngine) {
    throw new Error("ToolRankingEngine not initialized");
  }
  return toolRankingEngine;
}
