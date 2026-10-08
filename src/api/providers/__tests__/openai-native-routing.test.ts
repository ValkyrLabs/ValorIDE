import { it } from "@jest/globals";
import { resolveOpenAiNativeAuth } from "../openai-native-auth";
import { OpenAiNativeHandler } from "../openai-native";

const mockFetch = jest.fn();
const mockClientOptions: any[] = [];
jest.mock("../openai-native-auth", () => ({
  resolveOpenAiNativeAuth: jest.fn(),
}));
// Exercise the actual installed OpenAI SDK's URL, headers, JSON and SSE parser.
// Only the transport is replaced: no real credentials or external requests.
jest.mock("openai", () => {
  const actual = jest.requireActual("openai");
  return {
    ...actual,
    __esModule: true,
    default: class extends actual.default {
      constructor(options: any) {
        mockClientOptions.push(options);
        super({ ...options, fetch: (...args: any[]) => mockFetch(...args) });
      }
    },
  };
});

const mockAuth = jest.mocked(resolveOpenAiNativeAuth);
const oauth = {
  mode: "oauth" as const,
  token: "fixture-oauth-access",
  accountId: "acct_fixture",
};
const messages = [{ role: "user" as const, content: "Reply OK" }];
async function collect(handler: OpenAiNativeHandler, prompt = "Be concise.") {
  const chunks = [];
  for await (const chunk of handler.createMessage(prompt, messages))
    chunks.push(chunk);
  return chunks;
}
function streamResponse(terminal = "response.completed", status = "completed") {
  return new Response(
    [
      { type: "response.output_text.delta", delta: "OK" },
      {
        type: terminal,
        response: {
          status,
          usage: {
            input_tokens: 8,
            output_tokens: 3,
            input_tokens_details: { cached_tokens: 2 },
          },
        },
      },
    ]
      .map((event) => `data: ${JSON.stringify(event)}\n\n`)
      .join("") + "data: [DONE]\n\n",
    {
      status: 200,
      headers: { "content-type": "text/event-stream" },
    },
  );
}
const request = (index = 0) => {
  const [url, init] = mockFetch.mock.calls[index];
  return {
    url: String(url),
    headers: new Headers(init.headers),
    body: JSON.parse(init.body),
    method: init.method,
  };
};

describe("OpenAI native credential transport", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockClientOptions.length = 0;
    mockAuth.mockResolvedValue(oauth);
    mockFetch.mockImplementation(async () => streamResponse());
  });

  it.each([
    "gpt-5.6-sol",
    "gpt-5.6-terra",
    "gpt-5.6-luna",
    "gpt-5.5",
    "gpt-5.4",
    "gpt-5.4-mini",
    "gpt-5.4-nano",
  ])(
    "sends OAuth model %s only to the account-scoped Codex Responses endpoint",
    async (model) => {
      const chunks = await collect(
        new OpenAiNativeHandler({ apiModelId: model }),
      );
      const sent = request();
      expect(sent.url).toBe("https://chatgpt.com/backend-api/codex/responses");
      expect(sent.method).toBe("POST");
      expect(sent.headers.get("authorization")).toBe(
        "Bearer fixture-oauth-access",
      );
      expect(sent.headers.get("chatgpt-account-id")).toBe("acct_fixture");
      expect(sent.headers.get("originator")).toBe("valoride");
      expect(sent.headers.get("openai-beta")).toBe("responses=experimental");
      expect(sent.body).toMatchObject({
        model,
        instructions: "Be concise.",
        stream: true,
        store: false,
      });
      expect(sent.body).not.toHaveProperty("max_output_tokens");
      expect(sent.body).not.toHaveProperty("temperature");
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(chunks).toEqual(
        expect.arrayContaining([
          { type: "text", text: "OK" },
          expect.objectContaining({
            type: "usage",
            inputTokens: 6,
            cacheReadTokens: 2,
            outputTokens: 3,
          }),
        ]),
      );
    },
  );

  it("keeps explicit API keys on Platform without Codex account headers", async () => {
    mockAuth.mockResolvedValue({ mode: "api-key", token: "sk-fixture" });
    await collect(
      new OpenAiNativeHandler({ openAiNativeApiKey: "sk-fixture" }),
    );
    const sent = request();
    expect(sent.url).toBe("https://api.openai.com/v1/responses");
    expect(sent.headers.get("authorization")).toBe("Bearer sk-fixture");
    expect(sent.headers.get("chatgpt-account-id")).toBeNull();
    expect(sent.headers.get("originator")).toBeNull();
    expect(sent.body).not.toHaveProperty("store");
    expect(mockAuth).toHaveBeenCalledWith({ openAiNativeApiKey: "sk-fixture" });
  });

  it("does not let OPENAI_BASE_URL divert a Codex OAuth credential", async () => {
    const previous = process.env.OPENAI_BASE_URL;
    try {
      process.env.OPENAI_BASE_URL = "https://unrelated.invalid/v1";
      await collect(new OpenAiNativeHandler({}));
      expect(request().url).toBe(
        "https://chatgpt.com/backend-api/codex/responses",
      );
    } finally {
      if (previous === undefined) delete process.env.OPENAI_BASE_URL;
      else process.env.OPENAI_BASE_URL = previous;
    }
  });

  it("refreshes the client bearer and account between successive task requests", async () => {
    mockAuth
      .mockResolvedValueOnce(oauth)
      .mockResolvedValueOnce({
        ...oauth,
        token: "fixture-rotated",
        accountId: "acct_next",
      });
    const handler = new OpenAiNativeHandler({});
    await collect(handler);
    await collect(handler);
    expect(request(0).headers.get("authorization")).toBe(
      "Bearer fixture-oauth-access",
    );
    expect(request(1).headers.get("authorization")).toBe(
      "Bearer fixture-rotated",
    );
    expect(request(1).headers.get("chatgpt-account-id")).toBe("acct_next");
    expect(mockClientOptions).toHaveLength(2);
  });

  it("does not cache credentials after native logout or removal", async () => {
    mockAuth.mockResolvedValueOnce(oauth).mockResolvedValueOnce(undefined);
    const handler = new OpenAiNativeHandler({});
    await collect(handler);
    await expect(collect(handler)).rejects.toThrow(
      "Connect ChatGPT OAuth in ValorIDE settings",
    );
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("fails locally with an actionable error when the OAuth account ID is missing", async () => {
    mockAuth.mockResolvedValue({
      mode: "oauth",
      token: "fixture-access-without-account",
    });
    await expect(collect(new OpenAiNativeHandler({}))).rejects.toThrow(
      "missing its account ID",
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("provides a nonempty Codex instructions field even for an empty system prompt", async () => {
    await collect(new OpenAiNativeHandler({}), "");
    expect(request().body.instructions).toBe("You are a helpful assistant.");
  });

  it.each(["response.completed", "response.done"])(
    "settles the real SDK stream on %s and yields usage",
    async (terminal) => {
      mockFetch.mockImplementation(async () => streamResponse(terminal));
      const chunks = await collect(new OpenAiNativeHandler({}));
      expect(chunks.filter((x) => x.type === "usage")).toHaveLength(1);
      expect(chunks.some((x) => x.type === "text" && x.text === "OK")).toBe(
        true,
      );
    },
  );

  it("does not mark an incomplete Codex response as a successful task", async () => {
    mockFetch.mockImplementation(async () =>
      streamResponse("response.done", "incomplete"),
    );
    await expect(collect(new OpenAiNativeHandler({}))).rejects.toThrow(
      "ended before completion",
    );
  });

  it("explains rejected OAuth without falling back to Platform or broadening scopes", async () => {
    mockFetch.mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            error: {
              message: "Missing scopes: api.responses.write",
              type: "permission_error",
            },
          }),
          { status: 401, headers: { "content-type": "application/json" } },
        ),
    );
    await expect(collect(new OpenAiNativeHandler({}))).rejects.toThrow(
      "Reconnect ChatGPT OAuth in ValorIDE settings",
    );
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(request().url).toBe(
      "https://chatgpt.com/backend-api/codex/responses",
    );
  });

  it("explains subscription or workspace denial separately from OAuth registration", async () => {
    mockFetch.mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            error: { message: "Access denied", type: "permission_error" },
          }),
          { status: 403, headers: { "content-type": "application/json" } },
        ),
    );
    await expect(collect(new OpenAiNativeHandler({}))).rejects.toThrow(
      "Check your ChatGPT subscription and workspace access",
    );
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
