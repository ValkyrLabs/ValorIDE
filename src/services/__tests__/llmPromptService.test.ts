import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  initializeLLMPromptService,
  LLMPromptService,
  LlmDetailsClient,
  getLLMPromptService,
  ThorApiLlmDetailsClient,
  createStartupLlmDetailsClient,
  selectedPromptFromStoredLlmDetails,
} from "../llmPromptService";
import axios from "axios";
import * as vscode from "vscode";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

vi.mock("axios", () => ({
  default: {
    create: vi.fn(),
  },
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

  it("falls back locally when ThorAPI returns a prompt without an initial prompt body", async () => {
    const workspaceRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "valoride-prompt-empty-remote-test-"),
    );
    const promptDir = path.join(workspaceRoot, ".valoride", "prompts");
    fs.mkdirSync(promptDir, { recursive: true });
    fs.writeFileSync(
      path.join(promptDir, "system.json"),
      JSON.stringify({ name: "Empty Remote Fallback Prompt", sections: [] }),
    );
    service = new LLMPromptService(workspaceRoot, mockLogger);
    const client: LlmDetailsClient = {
      query: vi.fn().mockResolvedValue([
        {
          id: "empty-remote-prompt",
          name: "Empty Remote Prompt",
          tags: ["typescript", "nodejs"],
        },
      ]),
    };

    await service.initialize(client);

    expect(service.getSelectedPrompt()).toMatchObject({
      source: "fallback",
      name: "Empty Remote Fallback Prompt",
    });
    expect(mockLogger.appendLine).toHaveBeenCalledWith(
      expect.stringContaining("has no initialPrompt"),
    );
  });

  it("falls back locally when the ThorAPI LLMDetails query fails offline", async () => {
    const workspaceRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "valoride-prompt-offline-test-"),
    );
    const promptDir = path.join(workspaceRoot, ".valoride", "prompts");
    fs.mkdirSync(promptDir, { recursive: true });
    fs.writeFileSync(
      path.join(promptDir, "system.json"),
      JSON.stringify({ name: "Offline Fallback Prompt", sections: [] }),
    );
    service = new LLMPromptService(workspaceRoot, mockLogger);
    const client: LlmDetailsClient = {
      query: vi.fn().mockRejectedValue(new Error("network unavailable")),
    };

    await service.initialize(client);

    expect(client.query).toHaveBeenCalled();
    expect(service.getSelectedPrompt()).toMatchObject({
      source: "fallback",
      name: "Offline Fallback Prompt",
    });
    expect(mockLogger.appendLine).toHaveBeenCalledWith(
      expect.stringContaining("ThorAPI load failed"),
    );
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

  it("normalizes wrapped ThorAPI LLMDetails responses and ranks tag matches", async () => {
    const get = vi.fn().mockResolvedValue({
      data: {
        data: {
          content: [
            {
              id: "generic",
              name: "Generic Prompt",
              initialPrompt: "Generic fallback.",
              tags: "production",
              ratingScore: 5,
            },
            {
              id: "thorapi",
              name: "ThorAPI Prompt",
              initialPrompt: "Use ThorAPI contracts first.",
              tags: JSON.stringify(["typescript", "thorapi"]),
              metaData: JSON.stringify({
                promptType: "append",
                promptTags: ["production", "thorapi"],
              }),
              ratingScore: 4.5,
            },
          ],
        },
      },
    });
    vi.mocked(axios.create).mockReturnValue({ get } as any);

    const client = new ThorApiLlmDetailsClient("token", "https://api.test/v1");
    const matches = await client.query({
      tags: ["typescript", "thorapi", "production"],
      limit: 1,
    });

    expect(get).toHaveBeenCalledWith(expect.stringContaining("/LlmDetails"));
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({
      id: "thorapi",
      name: "ThorAPI Prompt",
      promptType: "APPEND",
      tags: ["typescript", "thorapi", "production"],
    });
  });

  it("classifies missing auth before querying ThorAPI LLMDetails", async () => {
    const get = vi.fn();
    vi.mocked(axios.create).mockReturnValue({ get } as any);

    const client = new ThorApiLlmDetailsClient(undefined, "https://api.test");

    await expect(
      client.query({ tags: ["typescript", "thorapi"], limit: 1 }),
    ).rejects.toThrow("requires signed-in auth");
    expect(get).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated ThorAPI LLMDetails queries without calling the API", async () => {
    const get = vi.fn();
    vi.mocked(axios.create).mockReturnValue({ get } as any);

    const client = new ThorApiLlmDetailsClient(undefined, "https://api.test/v1");

    await expect(
      client.query({ tags: ["typescript"], limit: 1 }),
    ).rejects.toThrow("requires signed-in auth");
    expect(get).not.toHaveBeenCalled();
  });

  it("classifies RBAC-denied ThorAPI LLMDetails responses", async () => {
    const get = vi.fn().mockRejectedValue({ response: { status: 403 } });
    vi.mocked(axios.create).mockReturnValue({ get } as any);

    const client = new ThorApiLlmDetailsClient("token", "https://api.test");

    await expect(
      client.query({ tags: ["typescript", "thorapi"], limit: 1 }),
    ).rejects.toThrow("denied by RBAC policy");
  });

  it("classifies unreachable ThorAPI LLMDetails responses as offline", async () => {
    const get = vi.fn().mockRejectedValue({ request: {} });
    vi.mocked(axios.create).mockReturnValue({ get } as any);

    const client = new ThorApiLlmDetailsClient("token", "https://api.test");

    await expect(
      client.query({ tags: ["typescript", "thorapi"], limit: 1 }),
    ).rejects.toThrow("offline or unreachable");
  });

  it("normalizes configured ValkyrAI hosts to exactly one /v1 API base", async () => {
    const get = vi.fn().mockResolvedValue({ data: [] });
    const create = vi.mocked(axios.create);
    create.mockReturnValue({ get } as any);

    new ThorApiLlmDetailsClient("token", "https://api.test");
    new ThorApiLlmDetailsClient("token", "https://api.test/v1");

    expect(create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ baseURL: "https://api.test/v1" }),
    );
    expect(create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ baseURL: "https://api.test/v1" }),
    );
  });

  it("creates the startup ThorAPI client from stored auth and configured host", async () => {
    const get = vi.fn().mockResolvedValue({ data: [] });
    const create = vi.mocked(axios.create);
    create.mockReturnValue({ get } as any);

    const client = createStartupLlmDetailsClient({
      authToken: "stored-jwt",
      valkyraiHost: "https://api.test",
    });

    expect(client).toBeInstanceOf(ThorApiLlmDetailsClient);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: "https://api.test/v1",
        headers: { Authorization: "Bearer stored-jwt" },
      }),
    );
  });

  it("suppresses startup ThorAPI queries when a manual prompt selection exists", () => {
    const manualSelection = selectedPromptFromStoredLlmDetails({
      id: "manual-llm-details",
      name: "Pinned Team Prompt",
      prompt: "Use this pinned prompt.",
      mode: "APPEND",
      tags: ["team-policy"],
      source: "manual",
    });

    const client = createStartupLlmDetailsClient({
      authToken: "stored-jwt",
      valkyraiHost: "https://api.test",
      manualSelection,
    });

    expect(client).toBeUndefined();
    expect(manualSelection).toMatchObject({
      llmDetailsId: "manual-llm-details",
      source: "thorapi",
      tags: ["team-policy"],
    });
  });
});
