import { DEFAULT_BROWSER_SETTINGS } from "@shared/BrowserSettings";
import { ChatSettings } from "@shared/ChatSettings";

jest.mock("os-name", () => ({
  __esModule: true,
  default: () => "Mock OS",
}));

// Use dynamic import so the mock above is applied before loading the module under test.
let SYSTEM_PROMPT: typeof import("./system").SYSTEM_PROMPT;
beforeAll(async () => {
  ({ SYSTEM_PROMPT } = await import("./system"));
});

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
    expect(prompt).toContain("(Browser unavailable — use Playwright for UI verification)");
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
});
