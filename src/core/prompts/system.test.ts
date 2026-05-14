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
});
