/**
 * Test suite: ToolRankingEngine
 * Validates tool ranking and PSR-first behavior
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { ToolRankingEngine, TaskIntent, ToolType } from "../toolRankingEngine";
describe("ToolRankingEngine", () => {
    let engine;
    let mockLogger;
    beforeEach(() => {
        mockLogger = {
            name: "test",
            append: vi.fn(),
            appendLine: vi.fn(),
            replace: vi.fn(),
            clear: vi.fn(),
            show: vi.fn(),
            hide: vi.fn(),
            dispose: vi.fn(),
        };
        engine = new ToolRankingEngine(mockLogger);
    });
    describe("Tool initialization", () => {
        it("should initialize built-in tools", () => {
            const tools = engine.getAllTools();
            expect(tools.length).toBe(5);
            expect(tools.some((t) => t.type === ToolType.PSR)).toBe(true);
            expect(tools.some((t) => t.type === ToolType.BROWSER)).toBe(true);
            expect(tools.some((t) => t.type === ToolType.CLI)).toBe(true);
        });
        it("should register external tools", () => {
            engine.registerTool({
                id: "custom-mcp",
                type: ToolType.MCP,
                name: "Custom MCP Tool",
                description: "Test tool",
                supportedTaskIntents: [TaskIntent.MCP_TOOL],
                isAvailable: true,
                successRate: 0.92,
                avgExecutionTime: 2000,
                costScore: 0.15,
            });
            const tools = engine.getAllTools();
            expect(tools.some((t) => t.id === "custom-mcp")).toBe(true);
        });
    });
    describe("PSR-first behavior", () => {
        it("should rank PSR first for code edits", () => {
            const ranked = engine.rankToolsForTask(TaskIntent.CODE_EDIT, {
                fileName: "test.ts",
            });
            expect(ranked[0].tool.type).toBe(ToolType.PSR);
            expect(ranked[0].score).toBeGreaterThan(90);
        });
        it("should consider file patterns", () => {
            const ranked = engine.rankToolsForTask(TaskIntent.CODE_EDIT, {
                fileName: "app.java",
            });
            expect(ranked[0].tool.type).toBe(ToolType.PSR);
            expect(ranked[0].reason).toContain("PSR-first");
        });
        it("should rank browser tool first for browser work", () => {
            const ranked = engine.rankToolsForTask(TaskIntent.BROWSER_WORK);
            expect(ranked[0].tool.type).toBe(ToolType.BROWSER);
        });
    });
    describe("Tool performance tracking", () => {
        it("should record successful tool execution", () => {
            engine.recordExecution("psr", true, 1500, 100);
            const stats = engine.getToolStats("psr");
            expect(stats?.successCount).toBe(1);
            expect(stats?.totalExecutions).toBe(1);
        });
        it("should track success rate", () => {
            engine.recordExecution("psr", true, 1000, 50);
            engine.recordExecution("psr", true, 1200, 60);
            engine.recordExecution("psr", false, 800, 40);
            const stats = engine.getToolStats("psr");
            expect(stats?.successCount).toBe(2);
            expect(stats?.failureCount).toBe(1);
            expect(stats?.successRate).toBeCloseTo(0.67, 1);
        });
        it("should maintain execution history", () => {
            engine.recordExecution("cli", true, 5000, 200);
            engine.recordExecution("cli", true, 4500, 180);
            const history = engine.getToolHistory("cli");
            expect(history.length).toBe(2);
            expect(history[0].success).toBe(true);
        });
    });
    describe("Tool scoring", () => {
        it("should calculate scores based on success rate and efficiency", () => {
            const ranked1 = engine.rankToolsForTask(TaskIntent.CODE_EDIT);
            const psr = ranked1.find((r) => r.tool.type === ToolType.PSR);
            expect(psr?.score).toBeGreaterThan(85);
        });
        it("should provide ranking reasons", () => {
            const ranked = engine.rankToolsForTask(TaskIntent.CODE_EDIT);
            ranked.forEach((result) => {
                expect(result.reason).toBeDefined();
                expect(result.reason.length).toBeGreaterThan(0);
            });
        });
    });
    describe("Tool stats and reporting", () => {
        it("should generate performance stats", () => {
            engine.recordExecution("file_io", true, 400, 10);
            engine.recordExecution("file_io", true, 450, 15);
            const stats = engine.getToolStats("file_io");
            expect(stats?.toolName).toBe("File Operations");
            expect(stats?.totalExecutions).toBe(2);
            expect(stats?.avgDuration).toBeCloseTo(425, 0);
        });
        it("should handle tools with no history", () => {
            const stats = engine.getToolStats("non-existent");
            expect(stats).toBeNull();
        });
    });
});
//# sourceMappingURL=toolRankingEngine.test.js.map