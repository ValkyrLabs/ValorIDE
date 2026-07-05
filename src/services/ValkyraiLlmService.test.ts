import {
  callValkyraiLlm,
  callValkyraiLlmStream,
  normalizeValkyraiLlmResponse,
} from "./ValkyraiLlmService";

describe("callValkyraiLlm", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("sends both Authorization and jwtSession headers when a JWT is provided", async () => {
    const fetchMock = jest.fn(async () => {
      return {
        ok: true,
        json: async () => ({ content: "pong" }),
      } as Response;
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const response = await callValkyraiLlm({
      host: "https://api-0.valkyrlabs.com/v1/",
      serviceId: "llm-1",
      jwt: "session-token",
      prompt: "ping",
    });

    expect(response).toEqual(expect.objectContaining({ content: "pong" }));
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api-0.valkyrlabs.com/v1/llm-details/llm-1/chat",
      expect.objectContaining({
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: "Bearer session-token",
          jwtSession: "session-token",
        },
        body: JSON.stringify({ role: "user", content: "ping" }),
      }),
    );
  });

  it("preserves reasoning, usage, and credits from ValkyrAI ChatResponse metadata", async () => {
    const response = normalizeValkyraiLlmResponse({
      content: "pong",
      reasoning: "reasoned route",
      credits: 3,
      json: JSON.stringify({
        model: "gpt-hosted",
        usage: {
          prompt_tokens: 42,
          completion_tokens: 9,
        },
      }),
      metadata: {
        contextWindow: 128000,
      },
    });

    expect(response).toEqual(
      expect.objectContaining({
        content: "pong",
        reasoning: "reasoned route",
        credits: 3,
        modelId: "gpt-hosted",
        contextWindow: 128000,
        usage: {
          prompt_tokens: 42,
          completion_tokens: 9,
        },
      }),
    );
  });

  it("streams reasoning, text, and usage events from the ValkyrAI SSE endpoint", async () => {
    const sseBody = [
      "event: reasoning",
      "data: planning",
      "",
      "event: thinking",
      "data: checking route",
      "",
      "event: text",
      "data: hello",
      "",
      "event: usage",
      'data: {"prompt_tokens":2,"completion_tokens":3,"credits":1,"model":"hosted"}',
      "",
      "event: done",
      "data: {}",
      "",
    ].join("\n");

    const fetchMock = jest.fn(async () => {
      const encoded = new TextEncoder().encode(sseBody);
      return {
        ok: true,
        status: 200,
        body: {
          getReader: () => {
            let sent = false;
            return {
              read: async () => {
                if (sent) {
                  return { done: true, value: undefined };
                }
                sent = true;
                return { done: false, value: encoded };
              },
            };
          },
        },
      } as Response;
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const chunks = [];
    for await (const chunk of callValkyraiLlmStream({
      host: "https://api-0.valkyrlabs.com/v1/",
      serviceId: "llm-1",
      jwt: "session-token",
      prompt: "ping",
    })) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual([
      { type: "reasoning", reasoning: "planning" },
      { type: "reasoning", reasoning: "checking route" },
      { type: "text", text: "hello" },
      expect.objectContaining({
        type: "usage",
        usage: expect.objectContaining({
          prompt_tokens: 2,
          completion_tokens: 3,
          credits: 1,
          model: "hosted",
        }),
        credits: 1,
      }),
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api-0.valkyrlabs.com/v1/llm-details/llm-1/chat/stream",
      expect.objectContaining({
        method: "POST",
        headers: {
          Accept: "text/event-stream",
          "Content-Type": "application/json",
          Authorization: "Bearer session-token",
          jwtSession: "session-token",
        },
      }),
    );
  });
});
