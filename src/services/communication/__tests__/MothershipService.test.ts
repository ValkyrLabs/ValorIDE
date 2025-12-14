import { describe, it, expect, vi } from "vitest";
import { MothershipService } from "../MothershipService";
import { WebsocketMessageTypeEnum } from "@thorapi/model";

describe("MothershipService", () => {
    it("sendMessage should not throw when user has missing nested arrays", () => {
        const options = { jwtToken: "token", userId: "user-1" } as any;
        const svc: any = new MothershipService(options);

        // Mock websocket
        svc.websocket = { readyState: 1, send: vi.fn() };
        svc.connected = true;

        const message: any = {
            type: WebsocketMessageTypeEnum.USER,
            payload: "hi",
            user: { id: "user-1" }, // no arrays
        };

        expect(() => svc.sendMessage(message)).not.toThrow();
        expect(svc.websocket.send).toBeCalled();
    });
});
