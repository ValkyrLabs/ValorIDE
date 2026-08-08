import { supportsExplicitAnthropicPromptCaching } from "./openrouter-prompt-cache";

describe("supportsExplicitAnthropicPromptCaching", () => {
  it("keeps cache breakpoints enabled for newly added Claude releases", () => {
    expect(
      supportsExplicitAnthropicPromptCaching({
        id: "anthropic/claude-sonnet-5",
      }),
    ).toBe(true);
  });

  it("does not depend on stale fetched capability metadata", () => {
    expect(
      supportsExplicitAnthropicPromptCaching({
        id: "anthropic/claude-experimental",
      }),
    ).toBe(true);
  });

  it("does not send Anthropic cache controls to other providers", () => {
    expect(
      supportsExplicitAnthropicPromptCaching({
        id: "openai/gpt-5.6",
      }),
    ).toBe(false);
  });
});
