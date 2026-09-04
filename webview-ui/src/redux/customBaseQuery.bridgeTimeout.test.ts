import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BaseQueryApi } from "@reduxjs/toolkit/query";
import { setValkyraiHost } from "@thorapi/utils/valkyraiHost";

const baseQueryApi: BaseQueryApi = {
  signal: undefined as unknown as AbortSignal,
  abort: vi.fn(),
  dispatch: vi.fn(),
  getState: vi.fn(),
  extra: undefined,
  endpoint: "generateApplication",
  type: "mutation",
  forced: false,
};

const createMockStorage = (): Storage => {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => store.delete(key),
    setItem: (key: string, value: string) => store.set(key, String(value)),
  } as Storage;
};

describe("customBaseQuery shared bridge timeout", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    const session = createMockStorage();
    const local = createMockStorage();
    Object.defineProperty(window, "sessionStorage", {
      value: session,
      configurable: true,
    });
    Object.defineProperty(window, "localStorage", {
      value: local,
      configurable: true,
    });
    vi.stubGlobal("sessionStorage", session);
    vi.stubGlobal("localStorage", local);
    setValkyraiHost("https://api.example.test/v1");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not forward endpoint-specific timeout overrides", async () => {
    const timeoutSpy = vi.spyOn(window, "setTimeout");
    sessionStorage.setItem("jwtToken", "session-token");
    const postMessage = vi.fn((message: any) => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: "thorapiResponse",
            thorapiResponse: {
              requestId: message.thorapiRequest.requestId,
              ok: true,
              status: 200,
              headers: {
                "content-type": "application/zip",
                "content-disposition": 'attachment; filename="sample.zip"',
              },
              bodyBase64: btoa("zip-data"),
            },
          },
        }),
      );
    });
    vi.stubGlobal("acquireVsCodeApi", () => ({
      postMessage,
      getState: vi.fn(),
      setState: vi.fn((state) => state),
    }));
    const { default: bridgedBaseQuery } = await import("./customBaseQuery");

    const result = await bridgedBaseQuery(
      {
        url: "thorapi/generate/app-1",
        method: "POST",
        timeoutMs: 600_000,
        responseHandler: async (response: Response) => ({
          filename: response.headers
            .get("content-disposition")
            ?.match(/filename="([^"]+)"/)?.[1],
          body: await response.text(),
        }),
      },
      baseQueryApi,
      {},
    );

    const request = postMessage.mock.calls[0][0].thorapiRequest;
    expect(request.timeoutMs).toBeUndefined();
    expect(request.responseType).toBe("arraybuffer");
    expect(timeoutSpy).toHaveBeenCalledWith(expect.any(Function), 30_000);
    expect(result).toEqual({
      data: { filename: "sample.zip", body: "zip-data" },
    });
    timeoutSpy.mockRestore();
  });
});
