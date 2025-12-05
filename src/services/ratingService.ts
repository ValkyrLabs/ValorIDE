/**
 * RatingService — Prompt Self-Improvement Loop for VALOR IDE
 *
 * Tracks task outcomes and enables continuous prompt enhancement:
 * - Record task success/failure, token cost, duration, user rating
 * - Analyze ratings to identify prompt weaknesses
 * - Generate enhancement suggestions
 * - Integrate improvements back into system prompt
 *
 * @see .valoride/memorybank/VALOR_PRD_2025.md § FR-5.5
 */

import * as vscode from "vscode";

export interface TaskMetrics {
  taskId: string;
  taskType: string; // 'app-gen', 'psr-edit', 'browser-work', etc.
  llmDetailsId?: string; // Which prompt variant was used
  success: boolean;
  tokensCost: number; // Total tokens * pricing
  duration: number; // Seconds elapsed
  userRating?: number; // User feedback (1-5 stars)
  feedback?: string; // User comments
  timestamp: number;
}

export interface ToolFailure {
  toolName: string; // 'psrTool', 'fileIoTool', 'terminalTool', etc.
  error: string;
  retryCount: number;
  resolvedAt?: number; // When did the tool eventually succeed?
}

export interface Rating {
  ratingId: string;
  taskId: string;
  llmDetailsId?: string;
  success: boolean;
  tokensCost: number;
  duration: number; // seconds
  userRating?: number; // 1-5 stars
  feedback?: string;
  toolFailures: ToolFailure[];
  createdAt: number;
}

export interface PromptWeakness {
  category: string; // 'psr-failures', 'high-cost', 'low-rating', etc.
  description: string;
  frequency: number; // How often does this occur?
  affectedPrompts: string[]; // Which LLM prompts show this weakness?
  suggestion: string; // How to fix it?
  impact: "high" | "medium" | "low";
}

export class RatingServiceImpl {
  private ratings: Map<string, Rating> = new Map();
  private logger: vscode.OutputChannel;

  constructor(logger: vscode.OutputChannel) {
    this.logger = logger;
  }

  /**
   * Record task outcome (success/failure + metrics)
   */
  recordRating(metrics: TaskMetrics, toolFailures: ToolFailure[] = []): Rating {
    const rating: Rating = {
      ratingId: `rating-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      taskId: metrics.taskId,
      llmDetailsId: metrics.llmDetailsId,
      success: metrics.success,
      tokensCost: metrics.tokensCost,
      duration: metrics.duration,
      userRating: metrics.userRating,
      feedback: metrics.feedback,
      toolFailures,
      createdAt: Date.now(),
    };

    this.ratings.set(rating.ratingId, rating);

    this.logger.appendLine(
      `[RatingService] Recorded rating: ${rating.ratingId} (${metrics.taskType}, success=${metrics.success})`,
    );

    return rating;
  }

  /**
   * Analyze ratings to identify prompt weaknesses
   */
  analyzePromptWeaknesses(): PromptWeakness[] {
    const weaknesses: PromptWeakness[] = [];

    // Count PSR failures
    let psrFailures = 0;
    let psrTotal = 0;
    const psrFailedPrompts = new Set<string>();

    // Count high-cost tasks
    let highCostTasks = 0;
    const highCostPrompts = new Set<string>();

    // Count low-rated tasks
    let lowRatedTasks = 0;
    const lowRatedPrompts = new Set<string>();

    this.ratings.forEach((rating) => {
      // PSR failures
      const psrFail = rating.toolFailures.find((f) => f.toolName === "psrTool");
      if (psrFail) {
        psrFailures++;
        if (rating.llmDetailsId) psrFailedPrompts.add(rating.llmDetailsId);
      }
      psrTotal++;

      // High cost (>$10 worth of tokens)
      if (rating.tokensCost > 10) {
        highCostTasks++;
        if (rating.llmDetailsId) highCostPrompts.add(rating.llmDetailsId);
      }

      // Low rating (<3 stars)
      if (rating.userRating && rating.userRating < 3) {
        lowRatedTasks++;
        if (rating.llmDetailsId) lowRatedPrompts.add(rating.llmDetailsId);
      }
    });

    // PSR weakness
    if (psrTotal > 0 && psrFailures / psrTotal > 0.1) {
      weaknesses.push({
        category: "psr-failures",
        description: `PSR tool failures detected (${((psrFailures / psrTotal) * 100).toFixed(1)}%)`,
        frequency: psrFailures,
        affectedPrompts: Array.from(psrFailedPrompts),
        suggestion:
          "Strengthen AST-first protocol; add more contextual regex examples",
        impact: "high",
      });
    }

    // High cost weakness
    if (highCostTasks > 0) {
      weaknesses.push({
        category: "high-cost",
        description: `High token costs detected (${highCostTasks} tasks >$10)`,
        frequency: highCostTasks,
        affectedPrompts: Array.from(highCostPrompts),
        suggestion:
          "Reduce prompt verbosity; use cheaper models for QA stages; add prompt caching",
        impact: "medium",
      });
    }

    // Low rating weakness
    if (lowRatedTasks > 0) {
      weaknesses.push({
        category: "low-rating",
        description: `Low user ratings detected (${lowRatedTasks} tasks <3 stars)`,
        frequency: lowRatedTasks,
        affectedPrompts: Array.from(lowRatedPrompts),
        suggestion:
          "Gather user feedback; analyze which sections caused issues; refine examples",
        impact: "high",
      });
    }

    this.logger.appendLine(
      `[RatingService] Identified ${weaknesses.length} prompt weaknesses`,
    );

    return weaknesses;
  }

  /**
   * Get prompt performance stats
   */
  getPromptStats(llmDetailsId: string): {
    successRate: number;
    avgCost: number;
    avgDuration: number;
    avgRating: number;
    totalTasks: number;
  } {
    const promptRatings = Array.from(this.ratings.values()).filter(
      (r) => r.llmDetailsId === llmDetailsId,
    );

    if (promptRatings.length === 0) {
      return {
        successRate: 0,
        avgCost: 0,
        avgDuration: 0,
        avgRating: 0,
        totalTasks: 0,
      };
    }

    const successCount = promptRatings.filter((r) => r.success).length;
    const totalCost = promptRatings.reduce((sum, r) => sum + r.tokensCost, 0);
    const totalDuration = promptRatings.reduce((sum, r) => sum + r.duration, 0);
    const ratingsWithScore = promptRatings.filter(
      (r) => r.userRating !== undefined,
    );
    const avgRating =
      ratingsWithScore.length > 0
        ? ratingsWithScore.reduce((sum, r) => sum + (r.userRating || 0), 0) /
          ratingsWithScore.length
        : 0;

    return {
      successRate: successCount / promptRatings.length,
      avgCost: totalCost / promptRatings.length,
      avgDuration: totalDuration / promptRatings.length,
      avgRating,
      totalTasks: promptRatings.length,
    };
  }

  /**
   * Get all ratings (for export/analysis)
   */
  getAllRatings(): Rating[] {
    return Array.from(this.ratings.values());
  }

  /**
   * Get ratings by time range (for weekly analysis)
   */
  getRatingsByTimeRange(startTime: number, endTime: number): Rating[] {
    return Array.from(this.ratings.values()).filter(
      (r) => r.createdAt >= startTime && r.createdAt <= endTime,
    );
  }

  /**
   * Log summary statistics
   */
  logSummary(): void {
    const all = Array.from(this.ratings.values());
    if (all.length === 0) {
      this.logger.appendLine("[RatingService] No ratings recorded yet");
      return;
    }

    const successCount = all.filter((r) => r.success).length;
    const totalCost = all.reduce((sum, r) => sum + r.tokensCost, 0);
    const avgCost = totalCost / all.length;
    const withRating = all.filter((r) => r.userRating !== undefined);
    const avgRating =
      withRating.length > 0
        ? withRating.reduce((sum, r) => sum + (r.userRating || 0), 0) /
          withRating.length
        : 0;

    this.logger.appendLine("[RatingService] Summary:");
    this.logger.appendLine(`  Total ratings: ${all.length}`);
    this.logger.appendLine(
      `  Success rate: ${((successCount / all.length) * 100).toFixed(1)}%`,
    );
    this.logger.appendLine(`  Avg cost per task: $${avgCost.toFixed(2)}`);
    this.logger.appendLine(`  Avg user rating: ${avgRating.toFixed(2)}/5`);
    this.logger.appendLine(
      `  Tool failures: ${all.filter((r) => r.toolFailures.length > 0).length}`,
    );
  }
}

export let ratingService: RatingServiceImpl | null = null;

/**
 * Initialize global RatingService instance
 */
export function initializeRatingService(logger: vscode.OutputChannel): void {
  ratingService = new RatingServiceImpl(logger);
}

/**
 * Get global RatingService instance
 */
export function getRatingService(): RatingServiceImpl {
  if (!ratingService) {
    throw new Error("RatingService not initialized");
  }
  return ratingService;
}
