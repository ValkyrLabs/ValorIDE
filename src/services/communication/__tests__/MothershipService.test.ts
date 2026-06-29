import { describe, it, expect, vi } from "vitest";
import { MothershipService } from "../MothershipService";
import { WebsocketMessageTypeEnum } from "@thorapi/model";

vi.mock("@utils/serverValkyraiHost", () => ({
  getValkyraiBasePath: () => "https://api-0.valkyrlabs.com/v1",
  getValkyraiWsBase: () => "wss://api-0.valkyrlabs.com/v1",
}));

describe("MothershipService", () => {
  it("sendMessage should not throw when user has missing nested arrays", () => {
    const options = { jwtToken: "token", userId: "user-1" } as any;
    const svc: any = new MothershipService(options);

    // Mock STOMP connection
    svc.stompClient = { connected: true, publish: vi.fn() };
    svc.connected = true;

    const message: any = {
      type: WebsocketMessageTypeEnum.USER,
      payload: "hi",
      user: { id: "user-1" }, // no arrays
    };

    expect(() => svc.sendMessage(message)).not.toThrow();
    expect(svc.stompClient.publish).toBeCalledWith(
      expect.objectContaining({
        destination: "/app/chat",
      }),
    );
  });
});
