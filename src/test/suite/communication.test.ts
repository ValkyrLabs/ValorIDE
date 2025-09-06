import { describe, it, beforeEach, afterEach } from "mocha";
import { expect } from "chai";
import { CommunicationService } from "../../services/communication/CommunicationService";

type Listener = (event: any) => void;

// Simple in-memory mock for window + CustomEvent
class MockCustomEvent<T = any> {
  type: string;
  detail?: T;
  constructor(type: string, init?: { detail?: T }) {
    this.type = type;
    this.detail = init?.detail;
  }
}

class MockWindow {
  private listeners: Map<string, Set<Listener>> = new Map();
  addEventListener(type: string, listener: Listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(listener);
  }
  removeEventListener(type: string, listener: Listener) {
    this.listeners.get(type)?.delete(listener);
  }
  dispatchEvent(event: { type: string }) {
    const set = this.listeners.get(event.type);
    if (!set) return;
    for (const l of Array.from(set)) {
      try {
        l(event as any);
      } catch {
        // ignore for test
      }
    }
  }
}

describe("CommunicationService", () => {
  const g = global as any;
  let originalWindow: any;
  let originalCustomEvent: any;

  beforeEach(() => {
    originalWindow = g.window;
    originalCustomEvent = g.CustomEvent;
  });

  afterEach(() => {
    g.window = originalWindow;
    g.CustomEvent = originalCustomEvent;
  });

  it("is unsupported in Node (no window) and does not emit error on connect", () => {
    delete (g as any).window;
    const svc = new CommunicationService({ role: "worker" });
    let errorCount = 0;
    svc.on("error", () => errorCount++);
    svc.connect();
    expect(svc["ready"]).to.equal(false);
    expect(errorCount).to.equal(0);
  });

  it("handles inbound messages and ignores self-messages", () => {
    const mockWin = new MockWindow();
    g.window = mockWin as unknown as Window;
    g.CustomEvent = MockCustomEvent;

    const svc = new CommunicationService({ role: "worker", senderId: "self-id" });
    svc.connect();

    const received: any[] = [];
    svc.on("message", (m) => received.push(m));

    // Should receive message from other sender
    const otherMsg = {
      type: "ping",
      payload: { ok: true },
      senderId: "other-id",
      messageId: "m1",
      timestamp: Date.now(),
    };
    mockWin.dispatchEvent(new MockCustomEvent("websocket-message", { detail: otherMsg }));

    // Should ignore self-message
    const selfMsg = { ...otherMsg, senderId: "self-id", messageId: "m2" };
    mockWin.dispatchEvent(new MockCustomEvent("websocket-message", { detail: selfMsg }));

    expect(received.length).to.equal(1);
    expect(received[0].type).to.equal("ping");
    expect(received[0].payload.ok).to.equal(true);
  });

  it("sendMessage dispatches a websocket-send event with correct payload", () => {
    const mockWin = new MockWindow();
    let lastEvent: any = null;
    mockWin.dispatchEvent = (event: any) => {
      lastEvent = event;
      // Also deliver to listeners if any
      (MockWindow.prototype.dispatchEvent as any).call(mockWin, event);
    };
    g.window = mockWin as unknown as Window;
    g.CustomEvent = MockCustomEvent;

    const svc = new CommunicationService({ role: "manager", senderId: "abc" });
    svc.connect();
    svc.sendMessage("topic", { x: 1 });

    expect(lastEvent).to.not.equal(null);
    expect(lastEvent.type).to.equal("websocket-send");
    expect(lastEvent.detail.type).to.equal("topic");
    expect(lastEvent.detail.payload).to.deep.equal({ x: 1 });
    expect(lastEvent.detail.senderId).to.equal("abc");
    expect(lastEvent.detail.messageId).to.be.a("string");
    expect(lastEvent.detail.timestamp).to.be.a("number");
  });

  it("emits error safely when sendMessage throws", () => {
    const mockWin = new MockWindow();
    g.window = mockWin as unknown as Window;
    // Force CustomEvent constructor to throw
    g.CustomEvent = class {
      constructor() {
        throw new Error("boom");
      }
    };

    const svc = new CommunicationService({ role: "worker", senderId: "abc" });
    svc.connect();

    let errorCount = 0;
    svc.on("error", () => errorCount++);

    expect(() => svc.sendMessage("x", {})).to.not.throw();
    expect(errorCount).to.equal(1);
  });
});

