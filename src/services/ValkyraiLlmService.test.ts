import { callValkyraiLlm } from "./ValkyraiLlmService";

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

    expect(response).toEqual({ content: "pong" });
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
});
