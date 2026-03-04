import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createMemoryStorage = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  };
};

vi.mock("@stomp/stompjs", () => {
  class MockClient {
    brokerURL?: string;
    reconnectDelay?: number;
    onConnect?: () => void;
    onStompError?: () => void;
    onWebSocketClose?: () => void;
    onWebSocketError?: () => void;

    constructor(opts: { brokerURL?: string; reconnectDelay?: number } = {}) {
      this.brokerURL = opts.brokerURL;
      this.reconnectDelay = opts.reconnectDelay;
    }

    subscribe = vi.fn();
    publish = vi.fn();
    activate = vi.fn();
    deactivate = vi.fn();
  }

  return { Client: MockClient };
});

describe("thorBridge JWT bootstrap", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    vi.stubGlobal("localStorage", createMemoryStorage());
    vi.stubGlobal("sessionStorage", createMemoryStorage());
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("logs missing JWT only once while retrying connection", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => { });

    await import("../thorBridge");

    vi.advanceTimersByTime(6500);

    const missingJwtWarnings = warnSpy.mock.calls
      .map((call) => String(call[0]))
      .filter((msg) => msg.includes("No JWT token found in storage"));

    expect(missingJwtWarnings).toHaveLength(1);

    warnSpy.mockRestore();
  });
});
