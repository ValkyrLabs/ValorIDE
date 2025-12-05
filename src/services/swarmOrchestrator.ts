/**
 * SwarmOrchestrator — Supervisor Agent for VALOR IDE
 *
 * Responsible for:
 * - Intent analysis and task decomposition
 * - Worker agent routing (PSR_SPECIALIST, CLI_TEST_RUNNER, BROWSER_AUTOMATION)
 * - Load balancing (assign tasks to least-loaded worker)
 * - Checkpoint management (save/restore state)
 * - Distributed rollback (reverse file diffs on errors)
 *
 * @see .valoride/memorybank/VALOR_PRD_2025.md § Milestone 2
 */

import * as vscode from "vscode";
import {
  SwarmMessage,
  SwarmMessageType,
  SwarmEntity,
  SwarmPriority,
  buildSwarmMessage,
  buildAck,
  buildNack,
} from "@shared/swarm-protocol";
import {
  getSwarmPromptBroadcaster,
  SwarmPromptBroadcaster,
} from "./swarmPromptBroadcaster";

export enum TaskIntent {
  APP_GEN = "app-gen", // OpenAPI → full-stack app
  PSR_EDIT = "psr-edit", // Code edits (TS/TSX/Java)
  BROWSER_WORK = "browser-work", // UI testing, error capture
  CLI_TEST = "cli-test", // npm, mvn, docker commands
  VALIDATION = "validation", // Spec validation, tests
}

export enum WorkerType {
  PSR_SPECIALIST = "PSR_SPECIALIST",
  CLI_TEST_RUNNER = "CLI_TEST_RUNNER",
  BROWSER_AUTOMATION = "BROWSER_AUTOMATION",
}

export interface WorkerStatus {
  name: WorkerType;
  queueLength: number;
  cpuUsage: number; // 0-100
  memoryUsage: number; // 0-100
  lastActivity: number; // timestamp
  score: number; // load score (lower = more available)
}

export interface Task {
  id: string;
  intent: TaskIntent;
  priority: SwarmPriority;
  payload: Record<string, any>;
  assignedWorker?: WorkerType;
  createdAt: number;
  completedAt?: number;
  success?: boolean;
  error?: string;
}

export interface Checkpoint {
  checkpointId: string;
  taskId: string;
  stageName: string;
  timestamp: number;
  workerId: string;
  fileDiff: {
    modified: string[];
    created: string[];
    deleted: string[];
  };
  metrics: Record<string, any>;
  success: boolean;
}

export class SwarmOrchestrator {
  private workers: Map<WorkerType, WorkerStatus> = new Map();
  private taskQueue: Task[] = [];
  private checkpoints: Map<string, Checkpoint> = new Map();
  private logger: vscode.OutputChannel;

  constructor(logger: vscode.OutputChannel) {
    this.logger = logger;
    this.initializeWorkers();
  }

  /**
   * Initialize worker status tracking
   */
  private initializeWorkers(): void {
    [
      WorkerType.PSR_SPECIALIST,
      WorkerType.CLI_TEST_RUNNER,
      WorkerType.BROWSER_AUTOMATION,
    ].forEach((workerType) => {
      this.workers.set(workerType, {
        name: workerType,
        queueLength: 0,
        cpuUsage: 0,
        memoryUsage: 0,
        lastActivity: Date.now(),
        score: 0,
      });
    });
    this.logger.appendLine(
      "[SwarmOrchestrator] ✅ Initialized 3 worker agents",
    );

    try {
      const broadcaster = getSwarmPromptBroadcaster();
      this.registerWorkersWithBroadcaster(broadcaster);
    } catch (error) {
      this.logger.appendLine(
        `[SwarmOrchestrator] ⚠️ Swarm prompt broadcaster unavailable: ${error}`,
      );
    }
  }

  /**
   * Analyze task intent and route to appropriate worker
   */
  async routeTask(task: Task): Promise<WorkerType> {
    const intentMap: Record<TaskIntent, WorkerType[]> = {
      [TaskIntent.APP_GEN]: [WorkerType.CLI_TEST_RUNNER],
      [TaskIntent.PSR_EDIT]: [WorkerType.PSR_SPECIALIST],
      [TaskIntent.BROWSER_WORK]: [WorkerType.BROWSER_AUTOMATION],
      [TaskIntent.CLI_TEST]: [WorkerType.CLI_TEST_RUNNER],
      [TaskIntent.VALIDATION]: [
        WorkerType.CLI_TEST_RUNNER,
        WorkerType.PSR_SPECIALIST,
      ],
    };

    const candidateWorkers = intentMap[task.intent] || [
      WorkerType.PSR_SPECIALIST,
    ];
    const selectedWorker = this.selectLeastLoadedWorker(candidateWorkers);

    task.assignedWorker = selectedWorker;
    this.taskQueue.push(task);

    this.logger.appendLine(
      `[SwarmOrchestrator] Task ${task.id} (${task.intent}) routed to ${selectedWorker}`,
    );

    return selectedWorker;
  }

  /**
   * Select least-loaded worker using scoring algorithm
   * Score = (queue_length * 2) + (cpu_usage / 10) + (memory_usage / 20)
   * Lower score = more available
   */
  private selectLeastLoadedWorker(candidates: WorkerType[]): WorkerType {
    let lowestScore = Infinity;
    let selectedWorker = candidates[0];

    candidates.forEach((workerType) => {
      const status = this.workers.get(workerType);
      if (status) {
        const score =
          status.queueLength * 2 +
          status.cpuUsage / 10 +
          status.memoryUsage / 20;
        status.score = score;

        if (score < lowestScore) {
          lowestScore = score;
          selectedWorker = workerType;
        }
      }
    });

    return selectedWorker;
  }

  /**
   * Update worker metrics (CPU, memory, queue depth)
   */
  updateWorkerStatus(worker: WorkerType, metrics: Partial<WorkerStatus>): void {
    const status = this.workers.get(worker);
    if (status) {
      Object.assign(status, metrics);
      status.lastActivity = Date.now();
      this.logger.appendLine(
        `[SwarmOrchestrator] Updated ${worker}: q=${status.queueLength} cpu=${status.cpuUsage}% mem=${status.memoryUsage}% score=${status.score.toFixed(1)}`,
      );
    }
  }

  /**
   * Save checkpoint (after each major stage)
   */
  saveCheckpoint(
    taskId: string,
    stageName: string,
    workerId: string,
    fileDiff: Checkpoint["fileDiff"],
    metrics: Record<string, any>,
  ): Checkpoint {
    const checkpoint: Checkpoint = {
      checkpointId: `${taskId}-cp-${Date.now()}`,
      taskId,
      stageName,
      timestamp: Date.now(),
      workerId,
      fileDiff,
      metrics,
      success: true,
    };

    this.checkpoints.set(checkpoint.checkpointId, checkpoint);
    this.logger.appendLine(
      `[SwarmOrchestrator] Checkpoint saved: ${checkpoint.checkpointId} (${stageName})`,
    );

    return checkpoint;
  }

  /**
   * Rollback to checkpoint (reverse file diffs)
   */
  async rollbackToCheckpoint(checkpointId: string): Promise<boolean> {
    const checkpoint = this.checkpoints.get(checkpointId);
    if (!checkpoint) {
      this.logger.appendLine(
        `[SwarmOrchestrator] ❌ Checkpoint not found: ${checkpointId}`,
      );
      return false;
    }

    this.logger.appendLine(
      `[SwarmOrchestrator] Rollback to ${checkpointId} (${checkpoint.stageName})`,
    );
    this.logger.appendLine(
      `  - Restore ${checkpoint.fileDiff.modified.length} modified files`,
    );
    this.logger.appendLine(
      `  - Delete ${checkpoint.fileDiff.created.length} created files`,
    );
    this.logger.appendLine(
      `  - Recreate ${checkpoint.fileDiff.deleted.length} deleted files`,
    );

    // TODO: Implement file diff reversal via PSR tool
    // For now, just log the intention

    return true;
  }

  /**
   * Get worker status (for dashboard)
   */
  getWorkerStatus(): WorkerStatus[] {
    return Array.from(this.workers.values());
  }

  /**
   * Get task queue
   */
  getTaskQueue(): Task[] {
    return [...this.taskQueue];
  }

  /**
   * Get checkpoint by ID
   */
  getCheckpoint(checkpointId: string): Checkpoint | undefined {
    return this.checkpoints.get(checkpointId);
  }

  /**
   * Log orchestrator state
   */
  logState(): void {
    this.logger.appendLine("[SwarmOrchestrator] State:");
    this.workers.forEach((status) => {
      this.logger.appendLine(
        `  ${status.name}: q=${status.queueLength} score=${status.score.toFixed(1)}`,
      );
    });
    this.logger.appendLine(`  Task Queue Length: ${this.taskQueue.length}`);
    this.logger.appendLine(`  Checkpoints: ${this.checkpoints.size}`);
  }

  private registerWorkersWithBroadcaster(
    broadcaster: SwarmPromptBroadcaster,
  ): void {
    broadcaster.registerWorker("psr-specialist", [
      "psr-edit",
      "code",
      "typescript",
    ]);
    broadcaster.registerWorker("cli-test-runner", [
      "cli-test",
      "app-gen",
      "pipeline",
    ]);
    broadcaster.registerWorker("browser-automation", [
      "browser-work",
      "ui",
      "verification",
    ]);
  }
}

export let swarmOrchestrator: SwarmOrchestrator | null = null;

/**
 * Initialize global SwarmOrchestrator instance
 */
export function initializeSwarmOrchestrator(
  logger: vscode.OutputChannel,
): void {
  swarmOrchestrator = new SwarmOrchestrator(logger);
}

/**
 * Get global SwarmOrchestrator instance
 */
export function getSwarmOrchestrator(): SwarmOrchestrator {
  if (!swarmOrchestrator) {
    throw new Error("SwarmOrchestrator not initialized");
  }
  return swarmOrchestrator;
}

export { SwarmPriority };
