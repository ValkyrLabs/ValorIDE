import {
  anthropicDefaultModelId,
  anthropicModels,
  bedrockDefaultModelId,
  bedrockModels,
  geminiDefaultModelId,
  geminiModels,
  moonshotDefaultModelId,
  moonshotModels,
  openAiNativeDefaultModelId,
  openAiNativeModels,
  openRouterDefaultModelId,
  vertexDefaultModelId,
  vertexModels,
  // to be added during implementation
  kimiOpenRouterModelIds,
} from "@shared/api";

describe("model catalog defaults", () => {
  it("only exposes current official Claude API models for Anthropic", () => {
    expect(anthropicDefaultModelId).toBe("claude-sonnet-4-6");
    expect(Object.keys(anthropicModels)).toEqual([
      "claude-opus-4-8",
      "claude-sonnet-4-6",
      "claude-haiku-4-5-20251001",
    ]);
    expect(anthropicModels).not.toHaveProperty("claude-sonnet-4-7x");
    expect(anthropicModels).not.toHaveProperty("claude-sonnet-4-20250514");
    expect(anthropicModels).not.toHaveProperty("claude-3-7-sonnet-20250219");
    expect(anthropicModels).not.toHaveProperty("claude-haiku-4-5-20251016");
    expect(anthropicModels["claude-opus-4-8"]?.contextWindow).toBe(1_000_000);
    expect(anthropicModels).toHaveProperty("claude-sonnet-4-6");
    expect(anthropicModels["claude-sonnet-4-6"]?.maxTokens).toBe(128_000);
  });

  it("only exposes current official OpenAI native GPT-5.5/GPT-5.4 models", () => {
    expect(openAiNativeDefaultModelId).toBe("gpt-5.5");
    expect(Object.keys(openAiNativeModels)).toEqual([
      "gpt-5.5",
      "gpt-5.4",
      "gpt-5.4-mini",
      "gpt-5.4-nano",
    ]);
    expect(openAiNativeModels["gpt-5.5"]?.contextWindow).toBe(1_000_000);
    expect(openAiNativeModels["gpt-5.5"]?.inputPrice).toBe(5);
    expect(openAiNativeModels["gpt-5.5"]?.outputPrice).toBe(30);
    expect(openAiNativeModels["gpt-5.4"]?.contextWindow).toBe(1_000_000);
    expect(openAiNativeModels["gpt-5.4-mini"]?.contextWindow).toBe(400_000);
    expect(openAiNativeModels["gpt-5.4-nano"]?.inputPrice).toBe(0.2);
    expect(openAiNativeModels).not.toHaveProperty("gpt-5.5-chat-latest");
    expect(openAiNativeModels).not.toHaveProperty("gpt-5.5-codex");
    expect(openAiNativeModels).not.toHaveProperty("gpt-5.2");
    expect(openAiNativeModels).not.toHaveProperty("gpt-5.1");
    expect(openAiNativeModels).not.toHaveProperty("gpt-4o");
  });

  it("defaults Gemini to the Gemini 3 generation", () => {
    expect(geminiDefaultModelId).toBe("gemini-3-pro-preview");
    expect(Object.keys(geminiModels) as string[]).toEqual(
      expect.arrayContaining([
        "gemini-3.1-pro-preview",
        "gemini-3-flash-preview",
      ]),
    );
  });

  it("defaults OpenRouter to current Claude Sonnet", () => {
    expect(openRouterDefaultModelId).toBe("anthropic/claude-sonnet-4.6");
  });

  it("uses current Claude SKUs for cloud Anthropic providers", () => {
    expect(bedrockDefaultModelId).toBe("anthropic.claude-sonnet-4-6");
    expect(Object.keys(bedrockModels)).toEqual(
      expect.arrayContaining([
        "anthropic.claude-opus-4-8",
        "anthropic.claude-sonnet-4-6",
        "anthropic.claude-haiku-4-5-20251001-v1:0",
      ]),
    );
    expect(bedrockModels).not.toHaveProperty(
      "anthropic.claude-3-7-sonnet-20250219-v1:0",
    );

    expect(vertexDefaultModelId).toBe("claude-sonnet-4-6");
    expect(Object.keys(vertexModels)).toEqual(
      expect.arrayContaining([
        "claude-opus-4-8",
        "claude-sonnet-4-6",
        "claude-haiku-4-5@20251001",
      ]),
    );
    expect(vertexModels).not.toHaveProperty("claude-3-7-sonnet@20250219");
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
