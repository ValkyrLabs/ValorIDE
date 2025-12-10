/**
 * ThorAPIModelRegistry Test Suite
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { ThorAPIModelRegistry } from "../thorapiModelRegistry";
describe("ThorAPIModelRegistry", () => {
    let registry;
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
        registry = new ThorAPIModelRegistry("/test", mockLogger);
    });
    it("should initialize with empty registry", () => {
        expect(registry.getAllModels()).toHaveLength(0);
        expect(registry.getAllServices()).toHaveLength(0);
    });
    it("should export registry as JSON", () => {
        const json = registry.exportAsJSON();
        const parsed = JSON.parse(json);
        expect(parsed.timestamp).toBeDefined();
        expect(Array.isArray(parsed.models)).toBe(true);
        expect(Array.isArray(parsed.services)).toBe(true);
    });
    it("should export registry as Markdown", () => {
        const md = registry.exportAsMarkdown();
        expect(md).toContain("# ThorAPI Model Registry");
        expect(md).toContain("## Models");
        expect(md).toContain("## Services");
    });
    it("should log summary", () => {
        registry.logSummary();
        expect(mockLogger.appendLine).toHaveBeenCalledWith(expect.stringContaining("Summary"));
    });
    it("should handle model queries", () => {
        const model = registry.getModel("nonexistent");
        expect(model).toBeUndefined();
    });
    it("should handle service queries", () => {
        const service = registry.getService("nonexistent");
        expect(service).toBeUndefined();
    });
});
//# sourceMappingURL=thorapiModelRegistry.test.js.map