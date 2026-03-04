import {
  anthropicDefaultModelId,
  anthropicModels,
  geminiDefaultModelId,
  geminiModels,
  moonshotDefaultModelId,
  moonshotModels,
  openAiNativeDefaultModelId,
  openAiNativeModels,
  openRouterDefaultModelId,
  // to be added during implementation
  kimiOpenRouterModelIds,
} from "@shared/api";

describe("model catalog defaults", () => {
  it("uses latest Anthropic Claude 4.5 as default", () => {
    expect(anthropicDefaultModelId).toBe("claude-sonnet-4-5-20250929");
    expect(anthropicModels).toHaveProperty("claude-opus-4-5-20251101");
    expect(anthropicModels).toHaveProperty("claude-opus-4-6");
    expect(anthropicModels).toHaveProperty("claude-sonnet-4-6");
  });

  it("exposes ChatGPT 5.2 as the OpenAI native default", () => {
    expect(openAiNativeDefaultModelId).toBe("gpt-5.2");
    expect(openAiNativeModels["gpt-5.2"]).toBeDefined();
    expect(openAiNativeModels["gpt-5.2"]?.supportsPromptCache).toBe(true);
    expect(openAiNativeModels["gpt-5.2-chat-latest"]).toBeDefined();
    expect(openAiNativeModels["gpt-5.2-codex"]).toBeDefined();
    expect(openAiNativeModels["gpt-5.1-codex-mini"]).toBeDefined();
    expect(openAiNativeModels["gpt-5.3-codex"]).toBeDefined();
    expect(openAiNativeModels["gpt-5.3-codex-spark"]).toBeDefined();
  });

  it("defaults Gemini to the Gemini 3 generation", () => {
    expect(geminiDefaultModelId).toBe("gemini-3-pro-preview");
    expect((Object.keys(geminiModels) as string[])).toEqual(
      expect.arrayContaining(["gemini-3.1-pro-preview", "gemini-3-flash-preview"]),
    );
  });

  it("defaults OpenRouter to Claude 4.5", () => {
    expect(openRouterDefaultModelId).toBe("anthropic/claude-sonnet-4.5");
  });

  it("defaults Moonshot to Kimi K2 0905 preview", () => {
    expect(moonshotDefaultModelId).toBe("kimi-k2-0905-preview");
    expect(moonshotModels["kimi-k2-0905-preview"]).toBeDefined();
    expect(moonshotModels["kimi-k2-0905-preview"]?.supportsPromptCache).toBe(
      true,
    );
    expect(moonshotModels["kimi-k2.5"]).toBeDefined();
    expect(moonshotModels["kimi-k2.5"]?.supportsImages).toBe(true);
  });

  it("surfaces Kimi K2 models for OpenRouter users", () => {
    expect(kimiOpenRouterModelIds).toEqual(
      expect.arrayContaining([
        "moonshotai/kimi-k2",
        "moonshotai/kimi-k2-instruct-0905",
      ]),
    );
  });
});
