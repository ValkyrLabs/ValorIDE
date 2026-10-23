import { DEFAULT_BROWSER_SETTINGS } from "@shared/BrowserSettings";
import { ChatSettings } from "@shared/ChatSettings";

jest.mock("os-name", () => ({
  __esModule: true,
  default: () => "Mock OS",
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { SYSTEM_PROMPT } = require("./system") as typeof import("./system");

describe("SYSTEM_PROMPT", () => {
  const mcpHubStub = {
    getServers: () => [],
    isConnecting: false,
  } as any;

  it("adds plan mode restrictions and disables browser flow even when supported", async () => {
    const chatSettings: ChatSettings = { mode: "plan" };
    const prompt = await SYSTEM_PROMPT(
      "/tmp",
      true,
      mcpHubStub,
      "/tmp/thorapi",
      DEFAULT_BROWSER_SETTINGS,
      chatSettings,
    );

    expect(prompt).toContain("PLAN MODE — TOOL USE IS OFF");
    expect(prompt).toContain("plan_mode_respond");
    expect(prompt).toContain(
      "(Browser unavailable — use Playwright for UI verification)",
    );
    expect(prompt).not.toContain("**Browser flow");
  });

  it("includes act mode header and browser flow when supported", async () => {
    const chatSettings: ChatSettings = { mode: "act" };
    const prompt = await SYSTEM_PROMPT(
      "/tmp",
      true,
      mcpHubStub,
      "/tmp/thorapi",
      DEFAULT_BROWSER_SETTINGS,
      chatSettings,
    );

    expect(prompt).toContain("ACT MODE — FULL TOOL USE ENABLED");
    expect(prompt).toContain("**Browser flow");
  });

  it("injects GrayMatter agent context when supplied by the task runtime", async () => {
    const chatSettings: ChatSettings = { mode: "act" };
    const prompt = await SYSTEM_PROMPT(
      "/tmp",
      false,
      mcpHubStub,
      "/tmp/thorapi",
      DEFAULT_BROWSER_SETTINGS,
      chatSettings,
      "GRAYMATTER OPERATING CONTEXT\n- [gm:memory-1] decision Use generated ThorAPI services.",
    );

    expect(prompt).toContain("§6.5 GRAYMATTER OPERATING CONTEXT");
    expect(prompt).toContain("[gm:memory-1] decision");
    expect(prompt).toContain("Use generated ThorAPI services.");
  });

  it("uses the lean Bifrost contract and a ranked MCP inventory for compact models", async () => {
    const hub = {
      getServers: () => [
        {
          name: "graymatter",
          status: "connected",
          tools: Array.from({ length: 30 }, (_, index) => ({
            name: index === 29 ? "memory_context_compile" : `tool_${index}`,
          })),
        },
      ],
      isConnecting: false,
    } as any;
    const prompt = await SYSTEM_PROMPT(
      "/tmp",
      false,
      hub,
      "/tmp/thorapi",
      DEFAULT_BROWSER_SETTINGS,
      { mode: "act" },
      "BIFROST COMPILED CONTEXT",
      {
        contextWindow: 32_768,
        grayMatterTokenBudget: 640,
        inputTokenBudget: 13_762,
        mcpToolNameBudget: 4,
        mode: "compact",
        modelKey: "qwen 27b",
        reason: "local-or-open-weight-model",
        selectedPromptTokenBudget: 800,
      },
      "compile memory context",
    );
    expect(prompt).toContain("ValorIDE agent contract (Bifrost compact)");
    expect(prompt).toContain("graymatter.memory_context_compile");
    expect(prompt).toContain("26 less-relevant names omitted");
    expect(prompt).toContain("BIFROST COMPILED CONTEXT");
    expect(prompt).not.toContain("§8 COMPLETE TOOL REFERENCE");
    expect(prompt.length).toBeLessThan(7_000);
  });
});
