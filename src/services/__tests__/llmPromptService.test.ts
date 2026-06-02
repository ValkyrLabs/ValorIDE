import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  initializeLLMPromptService,
  LLMPromptService,
  LlmDetailsClient,
  getLLMPromptService,
} from "../llmPromptService";
import * as vscode from "vscode";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

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

  beforeEach(() => {
    vi.clearAllMocks();
    service = new LLMPromptService(process.cwd(), mockLogger);
  });

  it("loads the highest-ranked ThorAPI LLMDetails prompt for the detected stack", async () => {
    const client: LlmDetailsClient = {
      query: vi.fn().mockResolvedValue([
        {
          id: "prompt-thorapi",
          name: "ThorAPI TypeScript Prompt",
          initialPrompt: "Use generated ThorAPI clients first.",
          promptType: "SYSTEM",
          tags: ["typescript", "nodejs", "thorapi"],
          ratingScore: 4.9,
        },
      ]),
    };

    await service.initialize(client);

    const selected = service.getSelectedPrompt();
    expect(client.query).toHaveBeenCalledWith({
      tags: expect.arrayContaining(["typescript", "nodejs", "thorapi"]),
      limit: 10,
    });
    expect(selected).toMatchObject({
      source: "thorapi",
      llmDetailsId: "prompt-thorapi",
      name: "ThorAPI TypeScript Prompt",
      prompt: "Use generated ThorAPI clients first.",
      mode: "SYSTEM",
    });
  });

  it("falls back locally when ThorAPI has no matching prompt", async () => {
    const workspaceRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "valoride-prompt-test-"),
    );
    const promptDir = path.join(workspaceRoot, ".valoride", "prompts");
    fs.mkdirSync(promptDir, { recursive: true });
    fs.writeFileSync(
      path.join(promptDir, "system.json"),
      JSON.stringify({ name: "Fallback Prompt", sections: [] }),
    );
    service = new LLMPromptService(workspaceRoot, mockLogger);
    const client: LlmDetailsClient = {
      query: vi.fn().mockResolvedValue([]),
    };

    await service.initialize(client);

    expect(service.getSelectedPrompt()?.source).toBe("fallback");
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

  it("does not query ThorAPI when a manual selection is already stored", async () => {
    const client: LlmDetailsClient = {
      query: vi.fn().mockResolvedValue([
        {
          id: "remote-prompt",
          name: "Remote Prompt",
          initialPrompt: "Remote",
        },
      ]),
    };

    await initializeLLMPromptService(process.cwd(), mockLogger, client, {
      llmDetailsId: "manual-prompt",
      name: "Stored Prompt",
      prompt: "Manual wins.",
      mode: "APPEND",
      tags: ["manual"],
      source: "thorapi",
      stackSpecific: true,
    });

    expect(client.query).not.toHaveBeenCalled();
    expect(getLLMPromptService().getSelectedPrompt()).toMatchObject({
      llmDetailsId: "manual-prompt",
      prompt: "Manual wins.",
      mode: "APPEND",
    });
  });
});
