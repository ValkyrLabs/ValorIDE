import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import {
  storeJwtToken,
  clearStoredAuthSession,
  hydrateStoredCredentials,
} from "../accessControl";
import { getStoredJwtToken } from "../authTokenStorage";
import { setValkyraiHost } from "../valkyraiHost";
import { authFetch } from "../authFetch";
import { authenticatedStompOptions } from "../stompAuth";
import { clearCredentialOrigins } from "@shared/CredentialOrigin";

const createStorage = (): Storage => {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
    clear: () => values.clear(),
    key: (index) => Array.from(values.keys())[index] ?? null,
    get length() {
      return values.size;
    },
  };
};
const hostA = "https://issuer.invalid/v1";
describe("browser credential origin boundary", () => {
  beforeEach(() => {
    globalThis.sessionStorage = createStorage();
    globalThis.localStorage = createStorage();
    clearCredentialOrigins();
    setValkyraiHost(hostA);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    clearStoredAuthSession();
  });
  it("requires explicit issuance origin and quarantines legacy aliases and cookies", () => {
    sessionStorage.setItem("auth_token", "SYNTHETIC-LEGACY");
    document.cookie = "jwtToken=SYNTHETIC-COOKIE";
    expect(getStoredJwtToken()).toBeNull();
    expect(() => storeJwtToken("SYNTHETIC-A", "fixture")).toThrow(
      "selected backend",
    );
    expect(hydrateStoredCredentials().token).toBeUndefined();
  });
  it("restores the same origin across a reload and repeated setup", () => {
    storeJwtToken("SYNTHETIC-A", "fixture", hostA);
    sessionStorage.clear();
    clearCredentialOrigins();
    expect(hydrateStoredCredentials().token).toBe("SYNTHETIC-A");
    storeJwtToken("SYNTHETIC-A", "repeat", hostA);
    expect(getStoredJwtToken()).toBe("SYNTHETIC-A");
  });
  it("refuses direct host changes, downgrade and stale explicit headers before fetch", async () => {
    storeJwtToken("SYNTHETIC-A", "fixture", hostA);
    const fetchMock = vi.fn(
      async (_input: unknown, _init?: RequestInit) => new Response("{}"),
    );
    vi.stubGlobal("fetch", fetchMock);
    setValkyraiHost("https://other.invalid/v1");
    expect(getStoredJwtToken()).toBeNull();
    await expect(
      authFetch("/items", { headers: { jwtSession: "SYNTHETIC-A" } }),
    ).rejects.toThrow("not bound");
    await expect(
      authFetch("http://issuer.invalid/v1", {
        headers: { Authorization: "Bearer SYNTHETIC-A" },
      }),
    ).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("never attaches the issuer token to an absolute foreign URL", async () => {
    storeJwtToken("SYNTHETIC-A", "fixture", hostA);
    const fetchMock = vi.fn(
      async (_input: unknown, _init?: RequestInit) => new Response("{}"),
    );
    vi.stubGlobal("fetch", fetchMock);
    await authFetch("https://other.invalid/v1/items");
    const headers = new Headers(fetchMock.mock.calls[0][1].headers);
    expect(headers.has("Authorization")).toBe(false);
    expect(headers.has("jwtSession")).toBe(false);
  });
  it("requires an explicit new sign-in when returning to a previous backend", () => {
    storeJwtToken("SYNTHETIC-A", "fixture", hostA);
    setValkyraiHost("https://other.invalid/v1");
    setValkyraiHost(hostA);
    expect(getStoredJwtToken()).toBeNull();
    expect(hydrateStoredCredentials().token).toBeUndefined();
    storeJwtToken("SYNTHETIC-A-NEW", "explicit-reconnect", hostA);
    expect(getStoredJwtToken()).toBe("SYNTHETIC-A-NEW");
  });
  it("preserves same-origin auth and rejects all redirects, including caller overrides", async () => {
    storeJwtToken("SYNTHETIC-A", "fixture", hostA);
    const fetchMock = vi.fn(
      async (_input: unknown, _init?: RequestInit) => new Response("{}"),
    );
    vi.stubGlobal("fetch", fetchMock);
    await authFetch("/items", { redirect: "follow", credentials: "include" });
    const init = fetchMock.mock.calls[0][1];
    expect(init.redirect).toBe("error");
    expect(init.credentials).toBe("omit");
    expect(new Headers(init.headers).get("jwtSession")).toBe("SYNTHETIC-A");
  });
  it("supports local loopback issuance, logout and explicit reconnect without hosted signup", () => {
    setValkyraiHost("http://127.0.0.1:8080/v1");
    storeJwtToken("SYNTHETIC-LOCAL", "fixture", "http://127.0.0.1:8080");
    const config = authenticatedStompOptions("ws://127.0.0.1:8080/swarm");
    expect(config.connectHeaders.Authorization).toBe("Bearer SYNTHETIC-LOCAL");
    expect(config.brokerURL).not.toContain("SYNTHETIC");
    clearStoredAuthSession();
    expect(() => config.beforeConnect()).toThrow();
    storeJwtToken("SYNTHETIC-LOCAL-NEW", "fixture", "http://127.0.0.1:8080");
    expect(
      authenticatedStompOptions("ws://127.0.0.1:8080/swarm").connectHeaders
        .Authorization,
    ).toBe("Bearer SYNTHETIC-LOCAL-NEW");
  });
  it("rejects alternate WS origins and credential-bearing URLs before CONNECT", () => {
    storeJwtToken("SYNTHETIC-A", "fixture", hostA);
    for (const url of [
      "wss://other.invalid/swarm",
      "ws://issuer.invalid/swarm",
      "wss://issuer.invalid/swarm?token=SYNTHETIC-A",
    ])
      expect(() => authenticatedStompOptions(url)).toThrow();
    const config = authenticatedStompOptions("wss://issuer.invalid/swarm");
    setValkyraiHost("https://other.invalid/v1");
    expect(() => config.beforeConnect()).toThrow();
  });
});
