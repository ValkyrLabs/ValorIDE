import { describe, it, expect, beforeEach, vi } from "vitest";
import { LLMPromptService } from "../llmPromptService";
describe("LLMPromptService", () => {
    let service;
    const mockLogger = {
        append: vi.fn(),
        appendLine: vi.fn(),
        clear: vi.fn(),
        dispose: vi.fn(),
        hide: vi.fn(),
        show: vi.fn(),
        replace: vi.fn(),
        name: "test",
    };
    beforeEach(async () => {
        service = new LLMPromptService(process.cwd(), mockLogger);
        await service.initialize();
    });
    it("applies manual selection overrides from UI", () => {
        service.applyManualSelection({
            llmDetailsId: "prompt-1",
            name: "Test Prompt",
            prompt: "You are ValorIDE.",
            mode: "APPEND",
            tags: ["app-gen"],
        });
        const selected = service.getSelectedPrompt();
        expect(selected?.name).toBe("Test Prompt");
        expect(selected?.mode).toBe("APPEND");
        expect(selected?.tags).toContain("app-gen");
    });
});
//# sourceMappingURL=llmPromptService.test.js.map