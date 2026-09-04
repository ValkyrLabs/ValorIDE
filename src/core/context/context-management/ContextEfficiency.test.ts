import {
  estimateConversationTokens,
  promptContextTokens,
  resolveContextEfficiencyProfile,
} from "./ContextEfficiency";

describe("ContextEfficiency", () => {
  it("selects a bounded compact profile for Qwen even behind a UUID LlmDetails route", () => {
    const profile = resolveContextEfficiencyProfile(
      {
        id: "20b1ac91-1f58-48ad-a7dc-7c41f2d76d63",
        info: {
          contextWindow: 32_768,
          maxTokens: 8_192,
          supportsImages: false,
          supportsPromptCache: false,
        },
      },
      { name: "Qwen 3.8 27B local", tags: ["coding", "local-model"] },
    );

    expect(profile.mode).toBe("compact");
    expect(profile.reason).toBe("local-or-open-weight-model");
    expect(profile.inputTokenBudget).toBeLessThan(16_000);
    expect(profile.grayMatterTokenBudget).toBe(640);
  });

  it("keeps frontier models on the larger standard policy", () => {
    const profile = resolveContextEfficiencyProfile({
      id: "gpt-5.6-sol",
      info: {
        contextWindow: 256_000,
        maxTokens: 64_000,
        supportsImages: true,
        supportsPromptCache: true,
      },
    });

    expect(profile.mode).toBe("standard");
    expect(profile.inputTokenBudget).toBeGreaterThan(100_000);
  });

  it("recognizes a local model from LlmDetails metadata when its route id is opaque", () => {
    const profile = resolveContextEfficiencyProfile({
      id: "20b1ac91-1f58-48ad-a7dc-7c41f2d76d63",
      info: {
        contextWindow: 131_072,
        description: "Qwen3.8 27B LM Studio local-model",
        supportsPromptCache: false,
      },
    });

    expect(profile.mode).toBe("compact");
    expect(profile.reason).toBe("local-or-open-weight-model");
  });

  it("estimates structured conversation content without charging base64 bytes as text", () => {
    const tokens = estimateConversationTokens([
      { role: "user", content: "a".repeat(400) },
      {
        role: "assistant",
        content: [{ type: "text", text: "b".repeat(400) }],
      },
    ]);

    expect(tokens).toBeGreaterThanOrEqual(208);
    expect(tokens).toBeLessThan(230);
  });

  it("uses measured prompt tokens without double-counting output or cached input", () => {
    expect(
      promptContextTokens({
        cacheReads: 600,
        cacheWrites: 100,
        estimatedTokensIn: 9_999,
        tokensIn: 300,
      }),
    ).toBe(1_000);
    expect(promptContextTokens({ estimatedTokensIn: 1_234 })).toBe(1_234);
  });
});
