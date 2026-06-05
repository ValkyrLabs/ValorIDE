import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  ExtensionHostLLMDetailsService,
  LLMPromptService,
  LLMDetailsService,
} from "../llmPromptService";
import * as vscode from "vscode";

const storageMocks = vi.hoisted(() => ({
  getAllExtensionState: vi.fn(),
  getSecret: vi.fn(),
}));

vi.mock("@core/storage/state", () => ({
  getAllExtensionState: storageMocks.getAllExtensionState,
  getSecret: storageMocks.getSecret,
}));

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
    storageMocks.getAllExtensionState.mockResolvedValue({
      apiConfiguration: {
        valkyraiHost: "https://api-0.valkyrlabs.com/v1",
        valkyraiJwt: undefined,
      },
    });
    storageMocks.getSecret.mockResolvedValue(undefined);
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

  it("loads a stack-aware prompt from injected ThorAPI LLMDetails service", async () => {
    const llmDetailsService: LLMDetailsService = {
      queryByTags: vi.fn(async ({ tags }) => ({
        id: "llm-details-1",
        name: "ThorAPI TypeScript Prompt",
        initialPrompt: "Use ThorAPI generated clients first.",
        metaData: JSON.stringify({ tags }),
      })),
    };

    service = new LLMPromptService(process.cwd(), mockLogger);
    await service.initialize(llmDetailsService);

    const selected = service.getSelectedPrompt();
    expect(llmDetailsService.queryByTags).toHaveBeenCalled();
    expect(selected?.source).toBe("thorapi");
    expect(selected?.llmDetailsId).toBe("llm-details-1");
    expect(selected?.prompt).toContain("ThorAPI generated clients");
  });

  it("ranks ThorAPI LLMDetails by matching tags and usable prompt body", async () => {
    storageMocks.getSecret.mockResolvedValue("jwt-token");
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => [
        {
          id: "generic",
          name: "Generic Prompt",
          initialPrompt: "Generic fallback.",
          metaData: JSON.stringify({ tags: ["system"] }),
        },
        {
          id: "thorapi",
          name: "ThorAPI Prompt",
          initialPrompt: "Use generated ThorAPI assets.",
          metaData: JSON.stringify({ tags: ["thorapi", "typescript"] }),
        },
      ],
    }));
    const context = {
      secrets: { get: vi.fn(async () => "jwt-token") },
      globalState: { get: vi.fn(), update: vi.fn() },
    } as unknown as vscode.ExtensionContext;

    const extensionHostService = new ExtensionHostLLMDetailsService(
      context,
      mockLogger,
      fetchImpl,
    );

    const selected = await extensionHostService.queryByTags({
      tags: ["typescript", "thorapi", "system"],
      projectStack: {
        language: "typescript",
        isThorAPI: true,
        isGenerated: true,
      },
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api-0.valkyrlabs.com/v1/LlmDetails",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer jwt-token",
        }),
      }),
    );
    expect(selected?.id).toBe("thorapi");
  });

  it("skips ThorAPI query when no auth token is available", async () => {
    storageMocks.getSecret.mockResolvedValue(undefined);
    const fetchImpl = vi.fn();
    const context = {
      secrets: { get: vi.fn(async () => undefined) },
      globalState: { get: vi.fn(), update: vi.fn() },
    } as unknown as vscode.ExtensionContext;

    const extensionHostService = new ExtensionHostLLMDetailsService(
      context,
      mockLogger,
      fetchImpl,
    );

    const selected = await extensionHostService.queryByTags({
      tags: ["thorapi"],
      projectStack: null,
    });

    expect(selected).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
