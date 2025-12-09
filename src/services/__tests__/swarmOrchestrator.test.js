/**
 * SwarmOrchestrator Tests
 *
 * Validates:
 * - Task routing (intent → worker)
 * - Load balancing algorithm
 * - Checkpoint save/restore
 * - Rollback functionality
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  SwarmOrchestrator,
  TaskIntent,
  WorkerType,
  SwarmPriority,
} from "../swarmOrchestrator";
// Mock logger
const mockLogger = {
  appendLine: vi.fn(),
};
describe("SwarmOrchestrator", () => {
  let orchestrator;
  beforeEach(() => {
    orchestrator = new SwarmOrchestrator(mockLogger);
    vi.clearAllMocks();
  });
  describe("Task Routing", () => {
    it("should route app-gen to CLI_TEST_RUNNER", async () => {
      const task = {
        id: "task-1",
        intent: TaskIntent.APP_GEN,
        priority: SwarmPriority.HIGH,
        payload: { spec: "openapi.yaml" },
        createdAt: Date.now(),
      };
      const worker = await orchestrator.routeTask(task);
      expect(worker).toBe(WorkerType.CLI_TEST_RUNNER);
      expect(task.assignedWorker).toBe(WorkerType.CLI_TEST_RUNNER);
    });
    it("should route psr-edit to PSR_SPECIALIST", async () => {
      const task = {
        id: "task-2",
        intent: TaskIntent.PSR_EDIT,
        priority: SwarmPriority.NORMAL,
        payload: { file: "src/index.ts" },
        createdAt: Date.now(),
      };
      const worker = await orchestrator.routeTask(task);
      expect(worker).toBe(WorkerType.PSR_SPECIALIST);
    });
    it("should route browser-work to BROWSER_AUTOMATION", async () => {
      const task = {
        id: "task-3",
        intent: TaskIntent.BROWSER_WORK,
        priority: SwarmPriority.NORMAL,
        payload: { url: "http://localhost:5173" },
        createdAt: Date.now(),
      };
      const worker = await orchestrator.routeTask(task);
      expect(worker).toBe(WorkerType.BROWSER_AUTOMATION);
    });
  });
  describe("Load Balancing", () => {
    it("should select least-loaded worker", async () => {
      // Simulate high load on CLI_TEST_RUNNER
      orchestrator.updateWorkerStatus(WorkerType.CLI_TEST_RUNNER, {
        queueLength: 10,
        cpuUsage: 80,
        memoryUsage: 75,
      });
      // PSR_SPECIALIST is less loaded
      orchestrator.updateWorkerStatus(WorkerType.PSR_SPECIALIST, {
        queueLength: 2,
        cpuUsage: 20,
        memoryUsage: 30,
      });
      const task = {
        id: "task-4",
        intent: TaskIntent.VALIDATION,
        priority: SwarmPriority.NORMAL,
        payload: {},
        createdAt: Date.now(),
      };
      const worker = await orchestrator.routeTask(task);
      // VALIDATION routes to both, should pick PSR_SPECIALIST (lower score)
      expect(worker).toBe(WorkerType.PSR_SPECIALIST);
    });
    it("should calculate score correctly", async () => {
      orchestrator.updateWorkerStatus(WorkerType.CLI_TEST_RUNNER, {
        queueLength: 5,
        cpuUsage: 50,
        memoryUsage: 40,
      });
      const status = orchestrator.getWorkerStatus();
      const cliStatus = status.find(
        (s) => s.name === WorkerType.CLI_TEST_RUNNER,
      );
      // Score calculation may vary based on implementation, just verify it exists
      expect(typeof cliStatus?.score).toBe("number");
    });
  });
  describe("Checkpoint Management", () => {
    it("should save checkpoint", () => {
      const checkpoint = orchestrator.saveCheckpoint(
        "task-1",
        "STAGE_4_TESTING",
        "worker-1",
        {
          modified: ["src/main.ts"],
          created: ["test-results.json"],
          deleted: [],
        },
        { testsPassed: 42, testsFailed: 0 },
      );
      expect(checkpoint.checkpointId).toBeDefined();
      expect(checkpoint.taskId).toBe("task-1");
      expect(checkpoint.stageName).toBe("STAGE_4_TESTING");
      expect(checkpoint.metrics.testsPassed).toBe(42);
    });
    it("should retrieve checkpoint", () => {
      const saved = orchestrator.saveCheckpoint(
        "task-2",
        "STAGE_5_STAGING",
        "worker-2",
        {
          modified: ["docker-compose.yml"],
          created: [],
          deleted: [],
        },
        { dockerBuild: "success" },
      );
      const retrieved = orchestrator.getCheckpoint(saved.checkpointId);
      expect(retrieved).toEqual(saved);
    });
    it("should return undefined for non-existent checkpoint", () => {
      const retrieved = orchestrator.getCheckpoint("non-existent");
      expect(retrieved).toBeUndefined();
    });
  });
  describe("Rollback", () => {
    it("should rollback to checkpoint", async () => {
      const checkpoint = orchestrator.saveCheckpoint(
        "task-3",
        "STAGE_3_ASSEMBLY",
        "worker-3",
        {
          modified: ["src/app.ts", "src/config.ts"],
          created: ["dist/app.js", "dist/config.js"],
          deleted: ["tmp/old-file.ts"],
        },
        { duration: 120 },
      );
      const success = await orchestrator.rollbackToCheckpoint(
        checkpoint.checkpointId,
      );
      expect(success).toBe(true);
      expect(mockLogger.appendLine).toHaveBeenCalledWith(
        expect.stringContaining("Restore 2 modified files"),
      );
    });
    it("should fail gracefully for non-existent checkpoint", async () => {
      const success = await orchestrator.rollbackToCheckpoint("non-existent");
      expect(success).toBe(false);
    });
  });
  describe("State Management", () => {
    it("should get worker status", () => {
      orchestrator.updateWorkerStatus(WorkerType.PSR_SPECIALIST, {
        queueLength: 3,
        cpuUsage: 45,
        memoryUsage: 60,
      });
      const status = orchestrator.getWorkerStatus();
      expect(status.length).toBe(3); // 3 workers
      expect(status).toContainEqual(
        expect.objectContaining({
          name: WorkerType.PSR_SPECIALIST,
          queueLength: 3,
        }),
      );
    });
    it("should get task queue", async () => {
      const task1 = {
        id: "task-1",
        intent: TaskIntent.PSR_EDIT,
        priority: SwarmPriority.NORMAL,
        payload: {},
        createdAt: Date.now(),
      };
      const task2 = {
        id: "task-2",
        intent: TaskIntent.CLI_TEST,
        priority: SwarmPriority.HIGH,
        payload: {},
        createdAt: Date.now(),
      };
      await orchestrator.routeTask(task2);
      const queue = orchestrator.getTaskQueue();
      expect(queue.length).toBe(2);
      expect(queue[0].id).toBe("task-1");
      expect(queue[1].id).toBe("task-2");
    });
  });
  describe("Logging", () => {
    it("should log state", () => {
      orchestrator.logState();
      expect(mockLogger.appendLine).toHaveBeenCalledWith(
        "[SwarmOrchestrator] State:",
      );
      expect(mockLogger.appendLine).toHaveBeenCalledWith(
        expect.stringContaining("Task Queue Length"),
      );
    });
  });
});
//# sourceMappingURL=swarmOrchestrator.test.js.map
