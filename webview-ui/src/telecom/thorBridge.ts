import { Client, IMessage } from "@stomp/stompjs";
import { WEBSOCKET_URL, isValidWsUrl } from "@/websocket/websocket";
import { WebsocketMessageTypeEnum } from "@/thor/model";
import { WSS_BASE_PATH } from "@/thor/src/runtime";

type AppMessage = {
  type: string;
  payload: any;
  senderId: string;
  messageId: string;
  timestamp: number;
};

// Only initialize in browser contexts
if (typeof window !== "undefined") {
  try {
    const brokerURL = isValidWsUrl(WEBSOCKET_URL) ? WEBSOCKET_URL : WSS_BASE_PATH;
    const stompClient = new Client({
      brokerURL,
      reconnectDelay: 5000,
    });

    const toAppMessage = (raw: any): AppMessage | null => {
      // Expect Thor WebsocketMessage payload to be a JSON string with { topic, payload, senderId, messageId, timestamp }
      try {
        const asObj = typeof raw === "string" ? JSON.parse(raw) : raw;
        const payloadField = asObj?.payload;
        if (!payloadField) return null;
        const decoded = typeof payloadField === "string" ? JSON.parse(payloadField) : payloadField;
        if (!decoded || !decoded.topic) return null;
        return {
          type: decoded.topic,
          payload: decoded.payload,
          senderId: decoded.senderId || "",
          messageId: decoded.messageId || Math.random().toString(36).slice(2, 12),
          timestamp: decoded.timestamp || Date.now(),
        };
      } catch {
        return null;
      }
    };

    const toThorBody = (msg: AppMessage): string => {
      const thor = {
        type: WebsocketMessageTypeEnum.BROADCAST,
        payload: JSON.stringify({
          topic: msg.type,
          payload: msg.payload,
          senderId: msg.senderId,
          messageId: msg.messageId,
          timestamp: msg.timestamp,
        }),
      };
      return JSON.stringify(thor);
    };

    const postStatus = (phase: "connecting" | "connected" | "disconnected" | "error") => {
      try {
        const evt = new CustomEvent("telecom-status", { detail: { thorConnected: phase === "connected", phase } });
        window.dispatchEvent(evt);
      } catch {}
    };

    postStatus("connecting");

    stompClient.onConnect = () => {
      postStatus("connected");
      try {
        // Subscribe to application topics
        stompClient.subscribe("/topic/messages", (message: IMessage) => {
          const app = toAppMessage(message.body);
          if (app) {
            const evt = new CustomEvent("websocket-message", { detail: app });
            window.dispatchEvent(evt);
          }
        });
        stompClient.subscribe("/topic/statuses", (message: IMessage) => {
          const app = toAppMessage(message.body);
          if (app) {
            const evt = new CustomEvent("websocket-message", { detail: app });
            window.dispatchEvent(evt);
          }
        });
      } catch (e) {
        console.error("thorBridge subscribe error", e);
      }
    };

    stompClient.onStompError = () => postStatus("error");
    stompClient.onWebSocketClose = () => postStatus("disconnected");

    // Listen for outbound events from CommunicationService
    const sendListener = (ev: Event) => {
      const ce = ev as CustomEvent<AppMessage>;
      const app = ce.detail;
      if (!app) return;
      try {
        stompClient.publish({ destination: "/app/chat", body: toThorBody(app) });
      } catch (e) {
        console.error("thorBridge publish error", e);
      }
    };

    window.addEventListener("websocket-send", sendListener);
    stompClient.activate();

    // Clean up on unload
    window.addEventListener("unload", () => {
      try {
        window.removeEventListener("websocket-send", sendListener);
        stompClient.deactivate();
      } catch {
        // ignore
      }
    });
  } catch (e) {
    console.warn("thorBridge not initialized:", e);
  }
}
