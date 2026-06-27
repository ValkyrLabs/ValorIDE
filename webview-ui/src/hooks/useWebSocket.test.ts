import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useWebSocket } from "./useWebSocket";
import { setWebsocketBaseUrl } from "../websocket/websocket";

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  static instances: MockWebSocket[] = [];

  readonly url: string;
  readyState = MockWebSocket.OPEN;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  send = vi.fn();
  close = vi.fn(() => {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent("close", { code: 1000 }));
  });

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }
}

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

describe("useWebSocket", () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    vi.stubGlobal("WebSocket", MockWebSocket);
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
    setWebsocketBaseUrl("wss://api-0.valkyrlabs.com/v1/chat");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reconnects with a stored token when auth changes", async () => {
    renderHook(() => useWebSocket("/topic/swarm/org-1"));

    await waitFor(() => expect(MockWebSocket.instances).toHaveLength(1));
    expect(MockWebSocket.instances[0].url).not.toContain("token=");

    act(() => {
      window.sessionStorage.setItem("jwtToken", "fresh-token");
      window.dispatchEvent(new CustomEvent("jwtTokenChanged"));
    });

    await waitFor(() => expect(MockWebSocket.instances).toHaveLength(2));
    expect(MockWebSocket.instances[0].close).toHaveBeenCalled();
    expect(MockWebSocket.instances[1].url).toContain("token=fresh-token");
    expect(MockWebSocket.instances[1].url).toContain(
      "topic=%2Ftopic%2Fswarm%2Forg-1",
    );
  });
});
