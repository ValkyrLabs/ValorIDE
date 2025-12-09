import { describe, it, expect, beforeAll, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { PromptService } from "../promptService";
// Mock vscode output channel
const mockLogger = {
  appendLine: vi.fn(),
};
describe("PromptService", () => {
  let promptService;
  const workspaceRoot = process.cwd();
  beforeAll(() => {
    promptService = new PromptService(workspaceRoot, mockLogger);
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
//# sourceMappingURL=promptService.test.js.map
