import { describe, it, expect, vi } from "vitest";
import { ValorIDEMothershipIntegration } from "../ValorIDEMothershipIntegration";
import { WebsocketMessage, WebsocketMessageTypeEnum } from "@thorapi/model";

describe("ValorIDEMothershipIntegration", () => {
  it("sendChatAction should not throw when user is missing nested arrays", async () => {
    const fakeMothership: any = {
      on: vi.fn(),
      off: vi.fn(),
      isConnected: () => true,
      getInstanceId: () => "test-instance",
      sendMessage: vi.fn(() => true),
      sendRemoteCommand: vi.fn(),
    };

    const integration = new ValorIDEMothershipIntegration(fakeMothership);
    const action = {
      type: "chat_message",
      content: "hello",
    } as any;

    // Should not throw
    await expect(integration.sendChatAction(action)).resolves.toBeUndefined();
  });

  it("does not queue api_data actions while disconnected", async () => {
    const fakeMothership: any = {
      on: vi.fn(),
      off: vi.fn(),
      isConnected: () => false,
      getInstanceId: () => "test-instance",
      sendMessage: vi.fn(() => true),
      sendRemoteCommand: vi.fn(),
    };

    const integration = new ValorIDEMothershipIntegration(fakeMothership);

    await integration.sendChatAction({
      type: "api_data",
      metadata: { source: "stream" },
    } as any);

    expect((integration as any).actionQueue).toHaveLength(0);
  });

  it("caps queued actions while disconnected", async () => {
    const fakeMothership: any = {
      on: vi.fn(),
      off: vi.fn(),
      isConnected: () => false,
      getInstanceId: () => "test-instance",
      sendMessage: vi.fn(() => true),
      sendRemoteCommand: vi.fn(),
    };

    const integration = new ValorIDEMothershipIntegration(fakeMothership);

    for (let i = 0; i < 250; i++) {
      await integration.sendChatAction({
        type: "chat_message",
        content: `msg-${i}`,
      } as any);
    }

    const queue = (integration as any).actionQueue as Array<{ content?: string }>;
    expect(queue).toHaveLength(200);
    expect(queue[0]?.content).toBe("msg-50");
    expect(queue[199]?.content).toBe("msg-249");
  });
});
