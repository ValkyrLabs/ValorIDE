/**
 * SwarmPromptBroadcaster — Real-time prompt selection broadcast to worker agents
 *
 * Allows Supervisor to:
 * - Select LLMDetails by task intent + tags
 * - Broadcast to all workers or filtered subset
 * - Workers auto-reload without restart
 *
 * @see .valoride/memorybank/VALOR_PRD_2025.md § D.3
 */
export class SwarmPromptBroadcaster {
    logger;
    registeredWorkers = new Map();
    broadcastHistory = [];
    pendingPromptChanges = new Map(); // workerId -> llmDetailsId
    constructor(logger) {
        this.logger = logger;
    }
    /**
     * Register a worker agent
     */
    registerWorker(workerId, tags = []) {
        this.registeredWorkers.set(workerId, {
            workerId,
            tags,
            lastHeartbeat: Date.now(),
        });
        this.logger.appendLine(`[SwarmPromptBroadcaster] Worker registered: ${workerId}`);
    }
    /**
     * Unregister a worker agent
     */
    unregisterWorker(workerId) {
        this.registeredWorkers.delete(workerId);
        this.pendingPromptChanges.delete(workerId);
        this.logger.appendLine(`[SwarmPromptBroadcaster] Worker unregistered: ${workerId}`);
    }
    /**
     * Update worker heartbeat
     */
    updateWorkerHeartbeat(workerId) {
        const worker = this.registeredWorkers.get(workerId);
        if (worker) {
            worker.lastHeartbeat = Date.now();
        }
    }
    /**
     * Select and broadcast prompt to workers
     */
    selectPromptForTask(supervisorId, taskIntent, llmDetailsId, tags = []) {
        const message = {
            type: "PROMPT_SELECT",
            supervisorId,
            selectedLlmDetailsId: llmDetailsId,
            scope: tags.length > 0 ? "TAG_FILTER" : "ALL_WORKERS",
            tags: tags.length > 0 ? tags : undefined,
            timestamp: Date.now(),
        };
        this.logger.appendLine(`[SwarmPromptBroadcaster] Task intent: ${taskIntent} → LLMDetails: ${llmDetailsId}`);
        return message;
    }
    /**
     * Broadcast prompt selection to workers
     */
    broadcastPromptSelection(message) {
        const targetWorkers = [];
        for (const [workerId, worker] of this.registeredWorkers) {
            let shouldTarget = false;
            if (message.scope === "ALL_WORKERS") {
                shouldTarget = true;
            }
            else if (message.scope === "TAG_FILTER" && message.tags) {
                // Match if worker has any of the filtered tags
                shouldTarget = message.tags.some((tag) => worker.tags.includes(tag));
            }
            if (shouldTarget) {
                targetWorkers.push(workerId);
                this.pendingPromptChanges.set(workerId, message.selectedLlmDetailsId);
            }
        }
        this.broadcastHistory.push(message);
        this.logger.appendLine(`[SwarmPromptBroadcaster] Broadcast to ${targetWorkers.length} workers: ${message.selectedLlmDetailsId}`);
        return targetWorkers;
    }
    /**
     * Worker acknowledges prompt reload (no restart)
     */
    acknowledgePromptReload(workerId, llmDetailsId) {
        const pending = this.pendingPromptChanges.get(workerId);
        if (pending === llmDetailsId) {
            const worker = this.registeredWorkers.get(workerId);
            if (worker) {
                worker.promptId = llmDetailsId;
            }
            this.pendingPromptChanges.delete(workerId);
            this.logger.appendLine(`[SwarmPromptBroadcaster] Worker ${workerId} loaded prompt: ${llmDetailsId}`);
            return true;
        }
        return false;
    }
    /**
     * Check for pending prompt changes for worker
     */
    getPendingPromptChange(workerId) {
        return this.pendingPromptChanges.get(workerId);
    }
    /**
     * Get all registered workers
     */
    getRegisteredWorkers() {
        return Array.from(this.registeredWorkers.values());
    }
    /**
     * Get workers with specific tags
     */
    getWorkersByTags(tags) {
        return Array.from(this.registeredWorkers.values()).filter((worker) => tags.some((tag) => worker.tags.includes(tag)));
    }
    /**
     * Get broadcast history
     */
    getBroadcastHistory() {
        return [...this.broadcastHistory];
    }
    /**
     * Get worker status
     */
    getWorkerStatus(workerId) {
        return this.registeredWorkers.get(workerId);
    }
    /**
     * Log swarm state
     */
    logSwarmState() {
        this.logger.appendLine("[SwarmPromptBroadcaster] Swarm State:");
        this.logger.appendLine(`  Workers: ${this.registeredWorkers.size}`);
        this.logger.appendLine(`  Pending prompt changes: ${this.pendingPromptChanges.size}`);
        this.logger.appendLine(`  Broadcast history: ${this.broadcastHistory.length}`);
        for (const [workerId, worker] of this.registeredWorkers) {
            const timeSinceHeartbeat = Date.now() - worker.lastHeartbeat;
            this.logger.appendLine(`  - ${workerId}: tags=${worker.tags.join(",")}, prompt=${worker.promptId || "none"}, heartbeat=${timeSinceHeartbeat}ms`);
        }
    }
}
let swarmPromptBroadcaster = null;
/**
 * Initialize global SwarmPromptBroadcaster
 */
export function initializeSwarmPromptBroadcaster(logger) {
    swarmPromptBroadcaster = new SwarmPromptBroadcaster(logger);
    logger.appendLine("[SwarmPromptBroadcaster] Initialized successfully");
    return swarmPromptBroadcaster;
}
/**
 * Get global SwarmPromptBroadcaster
 */
export function getSwarmPromptBroadcaster() {
    if (!swarmPromptBroadcaster) {
        throw new Error("SwarmPromptBroadcaster not initialized");
    }
    return swarmPromptBroadcaster;
}
//# sourceMappingURL=swarmPromptBroadcaster.js.map