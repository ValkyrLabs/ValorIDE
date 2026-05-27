import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BaseQueryApi } from "@reduxjs/toolkit/query";
import customBaseQuery from "./customBaseQuery";
import { setValkyraiHost } from "@thorapi/utils/valkyraiHost";
import thorapiBaseQuery from "@thorapi/redux/customBaseQuery";

const baseQueryApi: BaseQueryApi = {
  signal: undefined as unknown as AbortSignal,
  abort: vi.fn(),
  dispatch: vi.fn(),
  getState: vi.fn(),
  extra: undefined,
  endpoint: "loginUser",
  type: "mutation",
  forced: false,
};

const headersFromFetchCall = (fetchMock: ReturnType<typeof vi.fn>): Headers => {
  const [input, init] = fetchMock.mock.calls[0] as [
    RequestInfo | URL,
    RequestInit | undefined,
  ];
  if (init?.headers) {
    return new Headers(init.headers);
  }
  if (input instanceof Request) {
    return new Headers(input.headers);
  }
  return new Headers();
};

const credentialsFromFetchCall = (
  fetchMock: ReturnType<typeof vi.fn>,
): RequestCredentials | undefined => {
  const [input, init] = fetchMock.mock.calls[0] as [
    RequestInfo | URL,
    RequestInit | undefined,
  ];
  return (
    init?.credentials ??
    (input instanceof Request ? input.credentials : undefined)
  );
};

const urlFromFetchCall = (fetchMock: ReturnType<typeof vi.fn>): string => {
  const [input] = fetchMock.mock.calls[0] as [
    RequestInfo | URL,
    RequestInit | undefined,
  ];
  if (input instanceof Request) {
    return input.url;
  }
  return String(input);
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
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
  } as Storage;
};

describe("customBaseQuery", () => {
  beforeEach(() => {
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

  it("does not send an expired bearer token when logging in", async () => {
    sessionStorage.setItem("jwtToken", "expired-token");
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ token: "fresh-token" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await customBaseQuery(
      {
        url: "/auth/login",
        method: "POST",
        body: { username: "super", password: "password" },
      },
      baseQueryApi,
      {},
    );

    expect(headersFromFetchCall(fetchMock).get("authorization")).toBeNull();
    expect(credentialsFromFetchCall(fetchMock)).toBe("include");
    expect(urlFromFetchCall(fetchMock)).toBe(
      "https://api.example.test/v1/auth/login",
    );
  });

  it("keeps login on the /v1 API base when the configured host is a bare origin", async () => {
    setValkyraiHost("https://api.example.test");
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ token: "fresh-token" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await customBaseQuery(
      {
        url: "/auth/login",
        method: "POST",
        body: { username: "super", password: "password" },
      },
      baseQueryApi,
      {},
    );

    expect(urlFromFetchCall(fetchMock)).toBe(
      "https://api.example.test/v1/auth/login",
    );
    expect(credentialsFromFetchCall(fetchMock)).toBe("include");
  });

  it("clears persisted auth when api-0 rejects a replaced session", async () => {
    sessionStorage.setItem("jwtToken", "expired-token");
    localStorage.setItem("jwtToken", "expired-token");
    sessionStorage.setItem(
      "authenticatedPrincipal",
      JSON.stringify({ id: "u1", username: "super" }),
    );
    localStorage.setItem(
      "authenticatedPrincipal",
      JSON.stringify({ id: "u1", username: "super" }),
    );

    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            message:
              "Session expired or replaced by another login. Please sign in again to obtain a fresh token.",
          }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await customBaseQuery(
      {
        url: "/AccountBalance/u1",
        method: "GET",
      },
      baseQueryApi,
      {},
    );

    expect(sessionStorage.getItem("jwtToken")).toBeNull();
    expect(localStorage.getItem("jwtToken")).toBeNull();
    expect(sessionStorage.getItem("authenticatedPrincipal")).toBeNull();
    expect(localStorage.getItem("authenticatedPrincipal")).toBeNull();
  });

  it("uses cookie transport for generated ThorAPI calls without bearer fallback", async () => {
    sessionStorage.setItem("jwtToken", "stale-token");
    localStorage.setItem("jwtToken", "stale-token");
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await thorapiBaseQuery(
      {
        url: "/MemoryEntry",
        method: "GET",
      },
      baseQueryApi,
      {},
    );

    expect(credentialsFromFetchCall(fetchMock)).toBe("include");
    expect(headersFromFetchCall(fetchMock).get("authorization")).toBeNull();
    expect(urlFromFetchCall(fetchMock)).toContain("/MemoryEntry");
  });
});
