import { describe, it, expect, vi } from "vitest";
import { MothershipService } from "../MothershipService";
import { WebsocketMessageTypeEnum } from "@thorapi/model";

vi.mock("@utils/serverValkyraiHost", () => ({
  getValkyraiBasePath: () => "https://api-0.valkyrlabs.com/v1",
  getValkyraiWsBase: () => "wss://api-0.valkyrlabs.com/v1",
}));

describe("MothershipService", () => {
  it("uses the native STOMP /ws endpoint instead of the SockJS transport path", () => {
    const svc: any = new MothershipService({
      jwtToken: "token",
      userId: "user-1",
    } as any);

    expect(
      svc.buildStompEndpointUrl("https://api-0.valkyrlabs.com/v1").toString(),
    ).toBe("wss://api-0.valkyrlabs.com/ws");
    expect(
      svc
        .buildStompEndpointUrl("wss://api-0.valkyrlabs.com/ws/websocket")
        .toString(),
    ).toBe("wss://api-0.valkyrlabs.com/ws");
    expect(
      svc.buildStompEndpointUrl("wss://api-0.valkyrlabs.com/chat").toString(),
    ).toBe("wss://api-0.valkyrlabs.com/chat");
  });

  it("turns opaque websocket ErrorEvents into actionable connection errors", () => {
    const svc: any = new MothershipService({
      jwtToken: "token",
      userId: "user-1",
    } as any);

    const error = svc.toConnectionError(
      { type: "error" },
      new URL("wss://api-0.valkyrlabs.com/ws?token=secret"),
      "Mothership websocket error",
    );

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe(
      "Mothership websocket error (error). Could not connect to wss://api-0.valkyrlabs.com/ws; verify the ValkyrAI /ws STOMP endpoint is deployed and the session token is valid.",
    );
    expect(error.message).not.toContain("secret");
  });

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
