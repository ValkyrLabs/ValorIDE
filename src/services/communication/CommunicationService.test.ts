import { CommunicationService } from "./CommunicationService";

describe("CommunicationService", () => {
  let svc: CommunicationService;

  beforeEach(() => {
    // Mock window and VSCode API for browser context
    (global as any).window = {
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
    expect((svc as any).senderId).toBe("test1");
  });

  it("should enable and disable P2P", () => {
    expect((svc as any).rtcEnabled).toBe(true);
    svc.setP2PEnabled(false);
    expect((svc as any).rtcEnabled).toBe(false);
    svc.setP2PEnabled(true);
    expect((svc as any).rtcEnabled).toBe(true);
  });

  it("should not connect if not in browser context", () => {
    (global as any).window = undefined;
    const svc2 = new CommunicationService({ role: "worker" });
    svc2.connect();
    expect(svc2.error).toBeInstanceOf(Error);
  });

  it("should call teardownPeer when disabling P2P", () => {
    const teardownSpy = jest.spyOn(svc as any, "teardownPeer");
    // Simulate a peer
    (svc as any).rtcChannels.set("peer1", { close: jest.fn(), readyState: "open" });
    (svc as any).rtcPeers.set("peer1", { close: jest.fn() });
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
