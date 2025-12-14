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
});
