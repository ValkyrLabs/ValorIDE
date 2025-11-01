import { CommunicationService } from "./CommunicationService";
describe("CommunicationService", () => {
    let svc;
    beforeEach(() => {
        // Mock window and VSCode API for browser context
        global.window = {
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            dispatchEvent: jest.fn(),
            acquireVsCodeApi: () => ({ postMessage: jest.fn() }),
        };
        svc = new CommunicationService({ role: "worker", senderId: "test1" });
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    it("should initialize with correct senderId", () => {
        expect(svc).toBeDefined();
        expect(svc.senderId).toBe("test1");
    });
    it("should enable and disable P2P", () => {
        expect(svc.rtcEnabled).toBe(true);
        svc.setP2PEnabled(false);
        expect(svc.rtcEnabled).toBe(false);
        svc.setP2PEnabled(true);
        expect(svc.rtcEnabled).toBe(true);
    });
    it("should not connect if not in browser context", () => {
        global.window = undefined;
        const svc2 = new CommunicationService({ role: "worker" });
        svc2.connect();
        expect(svc2.error).toBeInstanceOf(Error);
    });
    it("should call teardownPeer when disabling P2P", () => {
        const teardownSpy = jest.spyOn(svc, "teardownPeer");
        // Simulate a peer
        svc.rtcChannels.set("peer1", { close: jest.fn(), readyState: "open" });
        svc.rtcPeers.set("peer1", { close: jest.fn() });
        svc.setP2PEnabled(false);
        expect(teardownSpy).toHaveBeenCalledWith("peer1");
    });
    it("should emit p2p-status on setP2PEnabled", () => {
        const statusSpy = jest.fn();
        svc.on("p2p-status", statusSpy);
        svc.setP2PEnabled(false);
        expect(statusSpy).toHaveBeenCalled();
    });
});
//# sourceMappingURL=CommunicationService.test.js.map