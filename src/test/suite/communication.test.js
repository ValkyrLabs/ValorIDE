import { describe, it, beforeEach, afterEach } from "mocha";
import { expect } from "chai";
import { CommunicationService } from "../../services/communication/CommunicationService";
// Simple in-memory mock for window + CustomEvent
class MockCustomEvent {
    type;
    detail;
    constructor(type, init) {
        this.type = type;
        this.detail = init?.detail;
    }
}
class MockWindow {
    listeners = new Map();
    addEventListener(type, listener) {
        if (!this.listeners.has(type))
            this.listeners.set(type, new Set());
        this.listeners.get(type).add(listener);
    }
    removeEventListener(type, listener) {
        this.listeners.get(type)?.delete(listener);
    }
    dispatchEvent(event) {
        const set = this.listeners.get(event.type);
        if (!set)
            return;
        for (const l of Array.from(set)) {
            try {
                l(event);
            }
            catch {
                // ignore for test
            }
        }
    }
}
describe("CommunicationService", () => {
    const g = global;
    let originalWindow;
    let originalCustomEvent;
    beforeEach(() => {
        originalWindow = g.window;
        originalCustomEvent = g.CustomEvent;
    });
    afterEach(() => {
        g.window = originalWindow;
        g.CustomEvent = originalCustomEvent;
    });
    it("is unsupported in Node (no window) and does not emit error on connect", () => {
        delete g.window;
        const svc = new CommunicationService({ role: "worker" });
        let errorCount = 0;
        svc.on("error", () => errorCount++);
        svc.connect();
        expect(svc["ready"]).to.equal(false);
        expect(errorCount).to.equal(0);
    });
    it("handles inbound messages and ignores self-messages", () => {
        const mockWin = new MockWindow();
        g.window = mockWin;
        g.CustomEvent = MockCustomEvent;
        const svc = new CommunicationService({ role: "worker", senderId: "self-id" });
        svc.connect();
        const received = [];
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
        let lastEvent = null;
        mockWin.dispatchEvent = (event) => {
            lastEvent = event;
            // Also deliver to listeners if any
            MockWindow.prototype.dispatchEvent.call(mockWin, event);
        };
        g.window = mockWin;
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
        g.window = mockWin;
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
//# sourceMappingURL=communication.test.js.map