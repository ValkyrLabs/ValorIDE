import {
  getOllamaModelInfo,
  resolveOllamaRequestTimeoutMs,
  streamOllamaChatResponse,
} from "../ollama-runtime";

async function collectStream(stream: AsyncIterable<any>, modelId = "gemma4") {
  const chunks = [];

  for await (const chunk of streamOllamaChatResponse(stream, {
    modelId,
    contextWindow: getOllamaModelInfo(modelId).contextWindow,
  })) {
    chunks.push(chunk);
  }

  return chunks;
}

describe("OllamaHandler slow local model behavior", () => {
  it("exposes configured startup timeout to the task stream watchdog", () => {
    expect(resolveOllamaRequestTimeoutMs("900000")).toBe(900_000);
  });

  it("defaults the startup timeout to ten minutes for local model loading", () => {
    expect(resolveOllamaRequestTimeoutMs()).toBe(600_000);
  });

  it("waits for slow-but-steady chunks instead of failing on a tiny chunk timeout", async () => {
    const stream = {
      [Symbol.asyncIterator]: async function* () {
        await new Promise((resolve) => setTimeout(resolve, 5));
        yield { message: { content: "slow " }, done: false };
        await new Promise((resolve) => setTimeout(resolve, 5));
        yield {
          message: { content: "local" },
          done: true,
          prompt_eval_count: 11,
          eval_count: 7,
        };
      },
    };

    const result = await Promise.race([
      collectStream(stream),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("test timed out")), 250),
      ),
    ]);

    expect(
      result
        .filter((chunk) => chunk.type === "text")
        .map((chunk: any) => chunk.text),
    ).toEqual(["slow local"]);
  });

  it("reports Ollama final usage with configured context and runtime metadata", async () => {
    const stream = {
      [Symbol.asyncIterator]: async function* () {
        yield {
          model: "gemma4:26b",
          message: { content: "done" },
          done: true,
          total_duration: 9_000_000,
          load_duration: 1_000_000,
          prompt_eval_count: 123,
          prompt_eval_duration: 2_000_000,
          eval_count: 45,
          eval_duration: 6_000_000,
        };
      },
    };

    const chunks = [];
    for await (const chunk of streamOllamaChatResponse(stream, {
      modelId: "gemma4:26b",
      contextWindow: 262144,
    })) {
      chunks.push(chunk);
    }
    const usage = chunks.find((chunk) => chunk.type === "usage") as any;

    expect(usage).toMatchObject({
      type: "usage",
      inputTokens: 123,
      outputTokens: 45,
      provider: "ollama",
      modelId: "gemma4:26b",
      contextWindow: 262144,
      totalDurationMs: 9,
      loadDurationMs: 1,
      promptEvalDurationMs: 2,
      evalDurationMs: 6,
    });
  });

  it("uses Gemma4 catalog context when no manual Ollama context is configured", () => {
    expect(getOllamaModelInfo("gemma4")).toMatchObject({
      contextWindow: 128000,
      supportsImages: true,
    });
  });
});
