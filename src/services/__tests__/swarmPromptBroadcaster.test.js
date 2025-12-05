/**
 * SwarmPromptBroadcaster Test Suite
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { SwarmPromptBroadcaster } from "../swarmPromptBroadcaster";
describe("SwarmPromptBroadcaster", () => {
    let broadcaster;
    let mockLogger;
    beforeEach(() => {
        mockLogger = {
            append: vi.fn(),
            appendLine: vi.fn(),
            clear: vi.fn(),
            show: vi.fn(),
            hide: vi.fn(),
            dispose: vi.fn(),
            name: "test",
            replace: vi.fn(),
        };
        broadcaster = new SwarmPromptBroadcaster(mockLogger);
    });
    it("should register and retrieve workers", () => {
        broadcaster.registerWorker("worker-1", ["psr"]);
        const workers = broadcaster.getRegisteredWorkers();
        expect(workers).toHaveLength(1);
        expect(workers[0].workerId).toBe("worker-1");
    });
    it("should broadcast prompt to all workers", () => {
        broadcaster.registerWorker("w1");
        broadcaster.registerWorker("w2");
        const msg = broadcaster.selectPromptForTask("supervisor-1", "app-gen", "llm-1");
        const targets = broadcaster.broadcastPromptSelection(msg);
        expect(targets).toHaveLength(2);
    });
    it("should acknowledge prompt reload", () => {
        broadcaster.registerWorker("w1");
        const msg = broadcaster.selectPromptForTask("sup", "task", "llm-1");
        broadcaster.broadcastPromptSelection(msg);
        const acked = broadcaster.acknowledgePromptReload("w1", "llm-1");
        expect(acked).toBe(true);
    });
    it("should track broadcast history", () => {
        const msg = broadcaster.selectPromptForTask("sup", "task", "llm-1");
        broadcaster.broadcastPromptSelection(msg);
        const history = broadcaster.getBroadcastHistory();
        expect(history).toHaveLength(1);
    });
});
//# sourceMappingURL=swarmPromptBroadcaster.test.js.map