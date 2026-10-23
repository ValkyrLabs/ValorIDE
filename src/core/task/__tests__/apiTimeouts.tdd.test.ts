import { ApiHandler } from "@api/index";
import { DEFAULT_CHAT_SETTINGS } from "@shared/ChatSettings";
import {
  resolveFirstChunkRetryPolicy,
  resolveFirstChunkTimeoutMs,
} from "../apiTimeouts";

function createApiHandler(
  streamStartTimeoutMs?: number,
): ApiHandler {
  return {
    createMessage: jest.fn(),
    getModel: jest.fn(() => ({
      id: "test-model",
      info: {
        contextWindow: 128_000,
        inputPrice: 0,
        outputPrice: 0,
        supportsImages: false,
        supportsPromptCache: false,
      },
    })),
    getApiStreamStartTimeoutMs:
      streamStartTimeoutMs === undefined
        ? undefined
        : jest.fn(() => streamStartTimeoutMs),
  } as ApiHandler;
}

describe("resolveFirstChunkTimeoutMs", () => {
  it("uses provider-specific stream startup timeout before the generic chat timeout", () => {
    const api = createApiHandler(600_000);

    expect(
      resolveFirstChunkTimeoutMs(api, {
        mode: "act",
        apiFirstChunkTimeoutMs: 60_000,
      }),
    ).toBe(600_000);
  });

  it("falls back to configured chat timeout when the provider has no startup timeout", () => {
    const api = createApiHandler();

    expect(
      resolveFirstChunkTimeoutMs(api, {
        mode: "act",
        apiFirstChunkTimeoutMs: 90_000,
      }),
    ).toBe(90_000);
  });

  it("falls back to the default chat timeout when no timeout is configured", () => {
    const api = createApiHandler();

    expect(resolveFirstChunkTimeoutMs(api, { mode: "act" })).toBe(
      DEFAULT_CHAT_SETTINGS.apiFirstChunkTimeoutMs,
    );
  });
});

describe("resolveFirstChunkRetryPolicy", () => {
  it("accepts a bounded provider-owned first-chunk retry", () => {
    const api = createApiHandler();
    api.getApiStreamStartRetryPolicy = jest.fn(() => ({
      maxRetries: 1,
      backoffMs: 1_000,
    }));

    expect(resolveFirstChunkRetryPolicy(api)).toEqual({
      maxRetries: 1,
      backoffMs: 1_000,
    });
  });

  it("rejects unbounded or malformed provider retry declarations", () => {
    for (const policy of [
      { maxRetries: 0, backoffMs: 1_000 },
      { maxRetries: 4, backoffMs: 1_000 },
      { maxRetries: 1, backoffMs: 0 },
    ]) {
      const api = createApiHandler();
      api.getApiStreamStartRetryPolicy = jest.fn(() => policy);
      expect(resolveFirstChunkRetryPolicy(api)).toBeUndefined();
    }
  });
});
