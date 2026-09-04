const mockCallValkyraiLlm = jest.fn();
const mockCallValkyraiLlmStream = jest.fn();

jest.mock("../../../services/ValkyraiLlmService", () => ({
  callValkyraiLlm: mockCallValkyraiLlm,
  callValkyraiLlmStream: mockCallValkyraiLlmStream,
  ValkyraiLlmServiceError: class ValkyraiLlmServiceError extends Error {
    status?: number;
    constructor(message: string, status?: number) {
      super(message);
      this.name = "ValkyraiLlmServiceError";
      this.status = status;
    }
  },
}));

const { ValkyraiHandler } =
  jest.requireActual<typeof import("../valkyrai")>("../valkyrai");

describe("ValkyraiHandler", () => {
  beforeEach(() => {
    mockCallValkyraiLlm.mockResolvedValue({
      content: "model response",
    });
    mockCallValkyraiLlmStream.mockImplementation(async function* () {
      // empty stream exercises legacy JSON fallback by default
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("uses the active ValorIDE session JWT when no explicit ValkyrAI JWT is configured", async () => {
    const handler = new ValkyraiHandler({
      valkyraiHost: "https://api-0.valkyrlabs.com/v1",
      valkyraiServiceId: "service-1",
      valkyraiSessionJwt: "session-token",
    });

    const chunks = [];
    for await (const chunk of handler.createMessage("", [
      { role: "user", content: "hello" },
    ])) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual([{ type: "text", text: "model response" }]);
    expect(mockCallValkyraiLlm).toHaveBeenCalledWith(
      expect.objectContaining({
        jwt: "session-token",
        serviceId: "service-1",
        prompt: "# Conversation\n\n## USER\n\nhello",
      }),
    );
  });

  it("prefers an explicit ValkyrAI JWT over the active session JWT", async () => {
    const handler = new ValkyraiHandler({
      valkyraiHost: "https://api-0.valkyrlabs.com/v1",
      valkyraiServiceId: "service-1",
      valkyraiJwt: "explicit-token",
      valkyraiSessionJwt: "session-token",
    });

    for await (const _chunk of handler.createMessage("", [
      { role: "user", content: "hello" },
    ])) {
      // exhaust stream
    }

    expect(mockCallValkyraiLlm).toHaveBeenCalledWith(
      expect.objectContaining({
        jwt: "explicit-token",
      }),
    );
  });

  it("exposes the selected LlmDetails context limits to context management", () => {
    const handler = new ValkyraiHandler({
      valkyraiHost: "http://127.0.0.1:1234/v1",
      valkyraiServiceId: "qwen-local-service",
      valkyraiModelInfo: {
        contextWindow: 32768,
        maxTokens: 4096,
        supportsImages: false,
        supportsPromptCache: true,
      },
    });

    expect(handler.getModel()).toEqual({
      id: "qwen-local-service",
      info: expect.objectContaining({
        contextWindow: 32768,
        maxTokens: 4096,
        supportsImages: false,
        supportsPromptCache: true,
      }),
    });
  });

  it("includes the ValorIDE system prompt and conversation history in the ValkyrAI prompt", async () => {
    const handler = new ValkyraiHandler({
      valkyraiHost: "https://api-0.valkyrlabs.com/v1",
      valkyraiServiceId: "service-1",
      valkyraiSessionJwt: "session-token",
    });

    for await (const _chunk of handler.createMessage("SYSTEM CONTRACT", [
      { role: "user", content: "first user message" },
      { role: "assistant", content: "assistant context" },
      { role: "user", content: "final user message" },
    ])) {
      // exhaust stream
    }

    const request = mockCallValkyraiLlm.mock.calls[0][0];
    expect(request.prompt).toContain("# System Instructions");
    expect(request.prompt).toContain("SYSTEM CONTRACT");
    expect(request.prompt).toContain("## USER\n\nfirst user message");
    expect(request.prompt).toContain("## ASSISTANT\n\nassistant context");
    expect(request.prompt).toContain("## USER\n\nfinal user message");
  });

  it("emits hosted ValkyrAI reasoning and credit-metered usage metadata", async () => {
    mockCallValkyraiLlm.mockResolvedValueOnce({
      content: "final answer",
      reasoning: "working through the plan",
      usage: {
        prompt_tokens: 120,
        completion_tokens: 30,
        prompt_tokens_details: { cached_tokens: 20 },
      },
      credits: 7,
      provider: "valkyrai",
      modelId: "hosted-model",
      contextWindow: 128000,
    });

    const handler = new ValkyraiHandler({
      valkyraiHost: "https://api-0.valkyrlabs.com/v1",
      valkyraiServiceId: "service-1",
      valkyraiSessionJwt: "session-token",
    });

    const chunks = [];
    for await (const chunk of handler.createMessage("", [
      { role: "user", content: "hello" },
    ])) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual([
      { type: "reasoning", reasoning: "working through the plan" },
      { type: "text", text: "final answer" },
      expect.objectContaining({
        type: "usage",
        inputTokens: 100,
        outputTokens: 30,
        cacheReadTokens: 20,
        totalCost: 7,
        costUnit: "credits",
        provider: "valkyrai",
        modelId: "hosted-model",
        contextWindow: 128000,
      }),
    ]);
  });

  it("streams ValkyrAI reasoning, text, and credit-metered usage metadata without waiting for the fallback response", async () => {
    mockCallValkyraiLlmStream.mockImplementationOnce(async function* () {
      yield { type: "reasoning", reasoning: "thinking live" };
      yield { type: "text", text: "hel" };
      yield { type: "text", text: "lo" };
      yield {
        type: "usage",
        usage: {
          prompt_tokens: 20,
          completion_tokens: 5,
        },
        credits: 2,
        provider: "valkyrai",
        modelId: "hosted-stream",
        contextWindow: 128000,
      };
    });

    const handler = new ValkyraiHandler({
      valkyraiHost: "https://api-0.valkyrlabs.com/v1",
      valkyraiServiceId: "service-1",
      valkyraiSessionJwt: "session-token",
    });

    const chunks = [];
    for await (const chunk of handler.createMessage("", [
      { role: "user", content: "hello" },
    ])) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual([
      { type: "reasoning", reasoning: "thinking live" },
      { type: "text", text: "hel" },
      { type: "text", text: "lo" },
      expect.objectContaining({
        type: "usage",
        inputTokens: 20,
        outputTokens: 5,
        totalCost: 2,
        costUnit: "credits",
        provider: "valkyrai",
        modelId: "hosted-stream",
        contextWindow: 128000,
      }),
    ]);
    expect(mockCallValkyraiLlmStream).toHaveBeenCalled();
    expect(mockCallValkyraiLlm).not.toHaveBeenCalled();
  });
});
