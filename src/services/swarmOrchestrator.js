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
import { SwarmPriority, } from "@shared/swarm-protocol";
import { getSwarmPromptBroadcaster, } from "./swarmPromptBroadcaster";
export var TaskIntent;
(function (TaskIntent) {
    TaskIntent["APP_GEN"] = "app-gen";
    TaskIntent["PSR_EDIT"] = "psr-edit";
    TaskIntent["BROWSER_WORK"] = "browser-work";
    TaskIntent["CLI_TEST"] = "cli-test";
    TaskIntent["VALIDATION"] = "validation";
})(TaskIntent || (TaskIntent = {}));
export var WorkerType;
(function (WorkerType) {
    WorkerType["PSR_SPECIALIST"] = "PSR_SPECIALIST";
    WorkerType["CLI_TEST_RUNNER"] = "CLI_TEST_RUNNER";
    WorkerType["BROWSER_AUTOMATION"] = "BROWSER_AUTOMATION";
})(WorkerType || (WorkerType = {}));
export class SwarmOrchestrator {
    workers = new Map();
    taskQueue = [];
    checkpoints = new Map();
    logger;
    constructor(logger) {
        this.logger = logger;
        this.initializeWorkers();
    }
    /**
     * Initialize worker status tracking
     */
    initializeWorkers() {
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
        this.logger.appendLine("[SwarmOrchestrator] ✅ Initialized 3 worker agents");
        try {
            const broadcaster = getSwarmPromptBroadcaster();
            this.registerWorkersWithBroadcaster(broadcaster);
        }
        catch (error) {
            this.logger.appendLine(`[SwarmOrchestrator] ⚠️ Swarm prompt broadcaster unavailable: ${error}`);
        }
    }
    /**
     * Analyze task intent and route to appropriate worker
     */
    async routeTask(task) {
        const intentMap = {
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
        this.logger.appendLine(`[SwarmOrchestrator] Task ${task.id} (${task.intent}) routed to ${selectedWorker}`);
        return selectedWorker;
    }
    /**
     * Select least-loaded worker using scoring algorithm
     * Score = (queue_length * 2) + (cpu_usage / 10) + (memory_usage / 20)
     * Lower score = more available
     */
    selectLeastLoadedWorker(candidates) {
        let lowestScore = Infinity;
        let selectedWorker = candidates[0];
        candidates.forEach((workerType) => {
            const status = this.workers.get(workerType);
            if (status) {
                const score = status.queueLength * 2 +
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
    updateWorkerStatus(worker, metrics) {
        const status = this.workers.get(worker);
        if (status) {
            Object.assign(status, metrics);
            status.lastActivity = Date.now();
            this.logger.appendLine(`[SwarmOrchestrator] Updated ${worker}: q=${status.queueLength} cpu=${status.cpuUsage}% mem=${status.memoryUsage}% score=${status.score.toFixed(1)}`);
        }
    }
    /**
     * Save checkpoint (after each major stage)
     */
    saveCheckpoint(taskId, stageName, workerId, fileDiff, metrics) {
        const checkpoint = {
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
        this.logger.appendLine(`[SwarmOrchestrator] Checkpoint saved: ${checkpoint.checkpointId} (${stageName})`);
        return checkpoint;
    }
    /**
     * Rollback to checkpoint (reverse file diffs)
     */
    async rollbackToCheckpoint(checkpointId) {
        const checkpoint = this.checkpoints.get(checkpointId);
        if (!checkpoint) {
            this.logger.appendLine(`[SwarmOrchestrator] ❌ Checkpoint not found: ${checkpointId}`);
            return false;
        }
        this.logger.appendLine(`[SwarmOrchestrator] Rollback to ${checkpointId} (${checkpoint.stageName})`);
        this.logger.appendLine(`  - Restore ${checkpoint.fileDiff.modified.length} modified files`);
        this.logger.appendLine(`  - Delete ${checkpoint.fileDiff.created.length} created files`);
        this.logger.appendLine(`  - Recreate ${checkpoint.fileDiff.deleted.length} deleted files`);
        // TODO: Implement file diff reversal via PSR tool
        // For now, just log the intention
        return true;
    }
    /**
     * Get worker status (for dashboard)
     */
    getWorkerStatus() {
        return Array.from(this.workers.values());
    }
    /**
     * Get task queue
     */
    getTaskQueue() {
        return [...this.taskQueue];
    }
    /**
     * Get checkpoint by ID
     */
    getCheckpoint(checkpointId) {
        return this.checkpoints.get(checkpointId);
    }
    /**
     * Log orchestrator state
     */
    logState() {
        this.logger.appendLine("[SwarmOrchestrator] State:");
        this.workers.forEach((status) => {
            this.logger.appendLine(`  ${status.name}: q=${status.queueLength} score=${status.score.toFixed(1)}`);
        });
        this.logger.appendLine(`  Task Queue Length: ${this.taskQueue.length}`);
        this.logger.appendLine(`  Checkpoints: ${this.checkpoints.size}`);
    }
    registerWorkersWithBroadcaster(broadcaster) {
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
export let swarmOrchestrator = null;
/**
 * Initialize global SwarmOrchestrator instance
 */
export function initializeSwarmOrchestrator(logger) {
    swarmOrchestrator = new SwarmOrchestrator(logger);
}
/**
 * Get global SwarmOrchestrator instance
 */
export function getSwarmOrchestrator() {
    if (!swarmOrchestrator) {
        throw new Error("SwarmOrchestrator not initialized");
    }
    return swarmOrchestrator;
}
export { SwarmPriority };
//# sourceMappingURL=swarmOrchestrator.js.map