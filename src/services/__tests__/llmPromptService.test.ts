import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  initializeLLMPromptService,
  getLLMPromptService,
  refreshLLMPromptServiceAfterAuthentication,
  LLMPromptService,
  selectBestLlmDetailsPrompt,
} from "../llmPromptService";
import * as vscode from "vscode";
import * as fs from "node:fs";
import * as path from "node:path";
import { tmpdir } from "node:os";

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

  it("leaves the built-in task prompt active when a fresh workspace has no optional selection", async () => {
    const root = fs.mkdtempSync(
      path.join(tmpdir(), "valoride-default-prompt-"),
    );
    const lines: string[] = [];
    try {
      const fresh = new LLMPromptService(root, {
        ...mockLogger,
        appendLine: (line) => lines.push(line),
      });
      await fresh.initialize({ query: async () => null });
      expect(fresh.getSelectedPrompt()).toBeNull();
      expect(lines.join("\n")).toContain("built-in ValorIDE system prompt");
      expect(lines.join("\n")).not.toMatch(
        /No prompt available|Fallback prompt not found|Initialization failed/,
      );
      expect(fs.readdirSync(root)).toEqual([]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
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

  it("accepts ThorAPI prompt fields when initialPrompt is absent", async () => {
    service = new LLMPromptService(process.cwd(), mockLogger);

    await service.initialize({
      async query() {
        return {
          id: "llm-prompt-body",
          name: "Prompt Body Field",
          prompt: "Use the marketplace-selected prompt body.",
          promptType: "SYSTEM",
          tags: ["typescript", "system"],
        };
      },
    });

    expect(service.getSelectedPrompt()?.prompt).toBe(
      "Use the marketplace-selected prompt body.",
    );
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

  it("selects systemPrompt candidates from paged ThorAPI responses", () => {
    const selected = selectBestLlmDetailsPrompt(
      {
        content: [
          {
            id: "system-prompt",
            name: "System Prompt",
            systemPrompt: "Follow ThorAPI contracts first.",
            tags: ["thorapi", "system"],
          },
        ],
      },
      ["thorapi", "system"],
    );

    expect(selected?.id).toBe("system-prompt");
  });

  it("refreshes after sign-in without replacing the instance held by prompt consumers", async () => {
    await initializeLLMPromptService(process.cwd(), mockLogger, {
      query: async () => null,
    });
    const original = getLLMPromptService();
    await refreshLLMPromptServiceAfterAuthentication({
      query: async () => ({ id: "restored", prompt: "Authenticated prompt" }),
    });
    expect(getLLMPromptService()).toBe(original);
    expect(original.getSelectedPrompt()?.llmDetailsId).toBe("restored");
  });

  it("preserves the user's selection when authentication is restored", async () => {
    const query = vi.fn();
    service.applyManualSelection({
      name: "User prompt",
      prompt: "Keep my edit",
    });
    await service.initialize({ query });
    expect(query).not.toHaveBeenCalled();
    expect(service.getSelectedPrompt()?.prompt).toBe("Keep my edit");
  });

  it("does not let a pending startup response overwrite a newly selected manual prompt", async () => {
    let complete!: (value: any) => void;
    const pending = service.initialize({
      query: () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    });
    service.applyManualSelection({
      name: "User prompt",
      prompt: "Keep the newer selection",
    });
    complete({ id: "stale", prompt: "Old startup reply" });
    await pending;
    expect(service.getSelectedPrompt()?.prompt).toBe(
      "Keep the newer selection",
    );
  });

  it("a newer authenticated query wins over an earlier startup response", async () => {
    let complete!: (value: any) => void;
    const pending = service.initialize({
      query: () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    });
    await service.initialize({
      query: async () => ({ id: "current", prompt: "New session" }),
    });
    complete({ id: "stale", prompt: "Old startup reply" });
    await pending;
    expect(service.getSelectedPrompt()?.llmDetailsId).toBe("current");
  });

  it("does not retain a previous automatic account prompt after a denied refresh", async () => {
    const root = fs.mkdtempSync(
      path.join(tmpdir(), "valoride-prompt-refresh-"),
    );
    try {
      const fresh = new LLMPromptService(root, mockLogger);
      await fresh.initialize({
        query: async () => ({
          id: "previous-account",
          prompt: "Previous account prompt",
        }),
      });
      await fresh.initialize({ query: async () => null });
      expect(fresh.getSelectedPrompt()).toBeNull();
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it.each(["error", "empty", "missing-body"])(
    "uses the local fallback when a remote response is %s",
    async (outcome) => {
      const root = fs.mkdtempSync(
        path.join(tmpdir(), "valoride-prompt-fallback-"),
      );
      try {
        fs.mkdirSync(path.join(root, ".valoride/prompts"), { recursive: true });
        fs.writeFileSync(
          path.join(root, ".valoride/prompts/system.json"),
          JSON.stringify("Local prompt"),
        );
        const fresh = new LLMPromptService(root, mockLogger);
        await fresh.initialize({
          query: async () => {
            if (outcome === "error") throw new Error("Unavailable");
            return outcome === "empty"
              ? null
              : { id: "no-body", initialPrompt: " " };
          },
        });
        expect(fresh.getSelectedPrompt()?.prompt).toBe("Local prompt");
        expect(fresh.getSelectedPrompt()?.source).toBe("fallback");
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
    },
  );

  it("accepts nested records with JSON prompt tags and metadata while excluding premium records", () => {
    const selected = selectBestLlmDetailsPrompt(
      {
        data: {
          data: {
            records: [
              null,
              "invalid",
              {
                id: "blocked",
                prompt: "Private",
                metaData: '{"accessStatus":"BLOCKED"}',
              },
              {
                id: "premium",
                prompt: "Private",
                metaData: '{"isPremium":true}',
              },
              {
                id: "generic",
                prompt: "Generic",
                tags: ["system"],
                ratingScore: 5,
              },
              {
                id: "stack",
                systemPrompt: "Stack prompt",
                promptTags: '["typescript"]',
                metaData:
                  '{"tags":["thorapi"],"promptType":"append","ratingScore":4.8}',
              },
            ],
          },
        },
      },
      ["typescript", "thorapi", "system"],
    );
    expect(selected?.id).toBe("stack");
    expect(selected?.tags).toEqual(["typescript", "thorapi"]);
    expect(selected?.ratingScore).toBe(4.8);
  });

  it("handles malformed records and bounds cyclic wrapper traversal", () => {
    const cyclic: any = {};
    cyclic.data = cyclic;
    expect(selectBestLlmDetailsPrompt(cyclic, [])).toBeNull();
    expect(
      selectBestLlmDetailsPrompt(
        [null, false, "string", [], { initialPrompt: 7 }],
        [],
      ),
    ).toBeNull();
    const selected = selectBestLlmDetailsPrompt(
      [
        {
          id: "valid",
          initialPrompt: " ",
          systemPrompt: "Usable",
          metaData: "invalid json",
        },
      ],
      [],
    );
    expect(selected?.id).toBe("valid");
  });
});
