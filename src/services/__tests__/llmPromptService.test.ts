import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  initializeLLMPromptService,
  LLMPromptService,
  selectBestLlmDetailsPrompt,
} from "../llmPromptService";
import * as vscode from "vscode";

describe("LLMPromptService", () => {
  let service: LLMPromptService;
  const mockLogger: vscode.OutputChannel = {
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

  it("loads a matching ThorAPI LLMDetails prompt from the injected extension service", async () => {
    const queries: any[] = [];
    service = new LLMPromptService(process.cwd(), mockLogger);

    await service.initialize({
      async query(input) {
        queries.push(input);
        return {
          id: "llm-1",
          name: "ThorAPI TypeScript Prompt",
          initialPrompt: "Use the generated ThorAPI clients.",
          promptType: "SYSTEM",
          tags: ["typescript", "thorapi", "system"],
          ratingScore: 4.9,
        };
      },
    });

    expect(queries).toHaveLength(1);
    expect(queries[0].tags).toContain("typescript");
    const selected = service.getSelectedPrompt();
    expect(selected?.source).toBe("thorapi");
    expect(selected?.llmDetailsId).toBe("llm-1");
    expect(selected?.prompt).toBe("Use the generated ThorAPI clients.");
  });

  it("keeps manual selection from querying ThorAPI during global startup", async () => {
    const query = vi.fn();

    await initializeLLMPromptService(
      process.cwd(),
      mockLogger,
      { query },
      {
        source: "thorapi",
        llmDetailsId: "manual-1",
        name: "Manual Prompt",
        prompt: "Pinned by user.",
        mode: "APPEND",
        tags: ["manual"],
        stackSpecific: true,
      },
    );

    expect(query).not.toHaveBeenCalled();
  });

  it("selects the best accessible prompt by tag match and rating", () => {
    const selected = selectBestLlmDetailsPrompt(
      {
        content: [
          {
            id: "blocked-premium",
            name: "Premium",
            initialPrompt: "Premium prompt",
            tags: ["typescript", "thorapi"],
            ratingScore: 5,
            isPremium: true,
          },
          {
            id: "generic",
            name: "Generic",
            initialPrompt: "Generic prompt",
            tags: ["system"],
            ratingScore: 4.8,
          },
          {
            id: "stack",
            name: "Stack",
            initialPrompt: "Stack prompt",
            tags: "typescript,thorapi,system",
            ratingScore: 4.2,
          },
        ],
      },
      ["typescript", "thorapi", "system"],
    );

    expect(selected?.id).toBe("stack");
  });
});
