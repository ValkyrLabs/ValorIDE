import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("valkyrai host overrides connection URLs", () => {
  const newHost = "https://example.test/v1";
  const envWsBase = "wss://env.example/ws";

  beforeEach(() => {
    vi.resetModules();
    delete (window as any).__valorideValkyraiBasePath;
    process.env.REACT_APP_WS_BASE_PATH = envWsBase;
  });

  afterEach(() => {
    delete (window as any).__valorideValkyraiBasePath;
    delete process.env.REACT_APP_WS_BASE_PATH;
  });

  it("updates the HTTP base path when the host changes", async () => {
    const runtime = await import("../thorapi/src/runtime");
    const hostUtils = await import("./valkyraiHost");

    const originalBasePath = runtime.BASE_PATH;

    hostUtils.setValkyraiHost(newHost);
    const normalizedHost = hostUtils.getValkyraiHost();

    expect(normalizedHost).toBeDefined();
    expect(runtime.BASE_PATH).toBe(normalizedHost);
    expect(runtime.BASE_PATH).not.toBe(originalBasePath);
  });

  it("updates the websocket URL when the host changes even if an env websocket base is set", async () => {
    const { getWebsocketUrl } = await import("../websocket/websocket");
    const hostUtils = await import("./valkyraiHost");

    const originalWsUrl = getWebsocketUrl();

    hostUtils.setValkyraiHost(newHost);
    const derivedWs = hostUtils.deriveWsUrlFromHost(
      hostUtils.getValkyraiHost(),
    );

    expect(derivedWs).toBeDefined();
    expect(getWebsocketUrl()).toBe(derivedWs);
    expect(getWebsocketUrl()).not.toBe(originalWsUrl);
  });
});
