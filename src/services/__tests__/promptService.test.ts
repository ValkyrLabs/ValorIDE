import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { tmpdir } from "os";
import { PromptService } from "../promptService";
import { LLMContextInjector } from "../llmContextInjector";

// Mock vscode output channel
const mockLogger = {
  appendLine: vi.fn(),
};

describe("optional workspace prompt configuration", () => {
  const withWorkspace = async (
    test: (root: string, service: PromptService) => Promise<void>,
  ) => {
    const root = fs.mkdtempSync(path.join(tmpdir(), "valoride-empty-prompts-"));
    try {
      await test(root, new PromptService(root, mockLogger as any));
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  };

  it("starts in an empty workspace without creating config or inventing capabilities", async () => {
    await withWorkspace(async (root, service) => {
      await service.initialize();
      expect(service.getAllConfigs()).toEqual({
        systemPrompt: null,
        thorapiCatalog: null,
        swarmRules: null,
      });
      expect(fs.readdirSync(root)).toEqual([]);
      const injector = new LLMContextInjector(mockLogger as any);
      (injector as any).promptService = service;
      expect(injector.generateSystemPrompt()).toBe("");
      expect(await injector.generateSystemPromptAsync()).toBe("");
    });
  });

  it("loads a supplied system layer without requiring unrelated catalog or swarm files", async () => {
    await withWorkspace(async (root, service) => {
      fs.mkdirSync(service.getPromptDir(), { recursive: true });
      fs.writeFileSync(
        path.join(service.getPromptDir(), "system.json"),
        JSON.stringify({
          version: "test",
          sections: [
            {
              section: "rules",
              title: "Project instructions",
              content: "Preserve the project-specific instruction.",
            },
          ],
        }),
      );
      await service.initialize();
      expect(service.getSystemPrompt()).toContain(
        "Preserve the project-specific instruction.",
      );
      expect(service.getAllConfigs().thorapiCatalog).toBeNull();
      const injector = new LLMContextInjector(mockLogger as any);
      (injector as any).promptService = service;
      expect(await injector.generateSystemPromptAsync()).toBe(
        injector.generateSystemPrompt(),
      );
      expect(injector.generateSystemPrompt()).not.toContain(
        "WORKER AGENTS AVAILABLE",
      );
      expect(fs.readdirSync(root)).toEqual([".valoride"]);
    });
  });

  it("retains an explicit SYSTEM selection when no optional project system layer exists", async () => {
    await withWorkspace(async (_root, service) => {
      await service.initialize();
      const injector = new LLMContextInjector(mockLogger as any);
      (injector as any).promptService = service;
      (injector as any).llmPromptService = {
        getSelectedPrompt: () => ({
          source: "thorapi",
          name: "Approved prompt",
          prompt: "Keep this selected instruction.",
          mode: "SYSTEM",
          tags: [],
          stackSpecific: false,
        }),
      };
      expect(injector.generateSystemPrompt()).toContain(
        "Keep this selected instruction.",
      );
      expect(await injector.generateSystemPromptAsync()).toBe(
        injector.generateSystemPrompt(),
      );
    });
  });

  it.each(["{", JSON.stringify({ sections: "invalid" })])(
    "rejects a present malformed system config: %s",
    async (content) => {
      await withWorkspace(async (_root, service) => {
        fs.mkdirSync(service.getPromptDir(), { recursive: true });
        fs.writeFileSync(
          path.join(service.getPromptDir(), "system.json"),
          content,
        );
        fs.writeFileSync(
          path.join(service.getPromptDir(), "thorapi-catalog.json"),
          JSON.stringify({ services: [], models: [] }),
        );
        fs.writeFileSync(
          path.join(service.getPromptDir(), "swarm-rules.json"),
          JSON.stringify({
            supervisor_agent: {},
            worker_agents: [],
            message_types: {},
          }),
        );
        await expect(service.initialize()).rejects.toThrow();
      });
    },
  );
});

describe("PromptService", () => {
  let promptService: PromptService;
  let workspaceRoot: string;

  beforeAll(() => {
    workspaceRoot = fs.mkdtempSync(
      path.join(tmpdir(), "valoride-prompts-test-"),
    );
    const directory = path.join(workspaceRoot, ".valoride", "prompts");
    fs.mkdirSync(directory, { recursive: true });
    const fixtureMetadata = {
      version: "test-1",
      timestamp: "2026-09-07",
      description: "Isolated prompt loader fixture",
    };
    fs.writeFileSync(
      path.join(directory, "system.json"),
      JSON.stringify({
        ...fixtureMetadata,
        sections: Array.from({ length: 11 }, (_, i) => ({
          section: `§${i}`,
          title: `Section ${i}`,
          content: "TOOL-FIRST fixture instruction for prompt loading.",
        })),
      }),
    );
    fs.writeFileSync(
      path.join(directory, "thorapi-catalog.json"),
      JSON.stringify({
        ...fixtureMetadata,
        services: [
          {
            name: "ApplicationService",
            operations: [{ method: "GET", endpoint: "/Application" }],
          },
        ],
        models: [],
      }),
    );
    fs.writeFileSync(
      path.join(directory, "swarm-rules.json"),
      JSON.stringify({
        ...fixtureMetadata,
        supervisor_agent: { role: "supervisor" },
        worker_agents: [
          "PSR_SPECIALIST",
          "BROWSER_AUTOMATION",
          "CLI_TEST_RUNNER",
        ].map((name) => ({ name })),
        message_types: {},
      }),
    );
    promptService = new PromptService(workspaceRoot, mockLogger as any);
  });

  afterAll(() => {
    fs.rmSync(workspaceRoot, { recursive: true, force: true });
  });

  it("should verify prompt files exist", () => {
    const systemJsonPath = path.join(
      workspaceRoot,
      ".valoride",
      "prompts",
      "system.json",
    );
    const catalogPath = path.join(
      workspaceRoot,
      ".valoride",
      "prompts",
      "thorapi-catalog.json",
    );
    const swarmPath = path.join(
      workspaceRoot,
      ".valoride",
      "prompts",
      "swarm-rules.json",
    );

    expect(fs.existsSync(systemJsonPath)).toBe(true);
    expect(fs.existsSync(catalogPath)).toBe(true);
    expect(fs.existsSync(swarmPath)).toBe(true);
  });

  it("should load system.json successfully", async () => {
    await promptService.initialize();
    const config = promptService.getSystemPromptConfig();

    expect(config).toBeDefined();
    expect(config.version).toBeDefined();
    expect(config.sections).toBeDefined();
    expect(config.sections.length).toBeGreaterThan(0);
  });

  it("should have all §0-§10 sections in system prompt", async () => {
    await promptService.initialize();
    const config = promptService.getSystemPromptConfig();

    const sections = config.sections.map((s) => s.section);
    expect(sections).toContain("§0");
    expect(sections).toContain("§1");
    expect(sections).toContain("§10");
  });

  it("should load ThorAPI catalog successfully", async () => {
    await promptService.initialize();
    const catalog = promptService.getThorAPICatalog();

    expect(catalog).toBeDefined();
    expect(catalog.services).toBeDefined();
    expect(catalog.services.length).toBeGreaterThan(0);
    expect(catalog.models).toBeDefined();
  });

  it("should have ApplicationService in catalog", async () => {
    await promptService.initialize();
    const catalog = promptService.getThorAPICatalog();

    const appService = catalog.services.find(
      (s) => s.name === "ApplicationService",
    );
    expect(appService).toBeDefined();
    expect(appService?.operations).toBeDefined();
  });

  it("should load swarm-rules successfully", async () => {
    await promptService.initialize();
    const swarm = promptService.getSwarmRules();

    expect(swarm).toBeDefined();
    expect(swarm.supervisor_agent).toBeDefined();
    expect(swarm.worker_agents).toBeDefined();
    expect(swarm.worker_agents.length).toBeGreaterThan(0);
  });

  it("should have 3 worker agents", async () => {
    await promptService.initialize();
    const swarm = promptService.getSwarmRules();

    const agents = swarm.worker_agents.map((w) => w.name);
    expect(agents).toContain("PSR_SPECIALIST");
    expect(agents).toContain("BROWSER_AUTOMATION");
    expect(agents).toContain("CLI_TEST_RUNNER");
  });

  it("should return compiled system prompt string", async () => {
    await promptService.initialize();
    const prompt = promptService.getSystemPrompt();

    expect(typeof prompt).toBe("string");
    expect(prompt.length).toBeGreaterThan(100);
    expect(prompt).toContain("§0");
    expect(prompt).toContain("TOOL-FIRST");
  });

  it("should get all configs as JSON", async () => {
    await promptService.initialize();
    const allConfigs = promptService.getAllConfigs();

    expect(allConfigs).toBeDefined();
    expect(allConfigs.systemPrompt).toBeDefined();
    expect(allConfigs.thorapiCatalog).toBeDefined();
    expect(allConfigs.swarmRules).toBeDefined();
  });

  it("should verify prompts exist", () => {
    expect(promptService.promptsExist()).toBe(true);
  });

  it("should return correct prompt directory", () => {
    const promptDir = promptService.getPromptDir();
    expect(promptDir).toContain(".valoride");
    expect(promptDir).toContain("prompts");
  });
});
