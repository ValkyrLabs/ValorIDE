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

  it("sends progress content through the existing chat_message command lane", async () => {
    const sendMessage = vi.fn((_message: unknown) => true);
    const fakeMothership: any = {
      on: vi.fn(),
      off: vi.fn(),
      isConnected: () => true,
      getInstanceId: () => "test-instance",
      sendMessage,
      sendRemoteCommand: vi.fn(),
    };
    const integration = new ValorIDEMothershipIntegration(fakeMothership);

    await integration.sendChatAction({
      type: "chat_message",
      content: "Updating src/App.tsx.",
      messageId: "valoride-progress:3:action-start",
      taskId: "task-1",
      metadata: {
        progressKind: "action-start",
        source: "valoride-task-progress",
      },
    });

    expect(sendMessage).toHaveBeenCalledTimes(1);
    const sent = sendMessage.mock.calls[0][0] as { payload?: string };
    const payload = JSON.parse(sent.payload ?? "{}");
    expect(payload).toMatchObject({
      command: "chat_message",
      taskId: "task-1",
      data: {
        content: "Updating src/App.tsx.",
        messageId: "valoride-progress:3:action-start",
        metadata: {
          progressKind: "action-start",
          source: "valoride-task-progress",
        },
      },
    });
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
