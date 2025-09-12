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
    let isConnecting = false;
    let lastConnectRequestedAt = 0;
    let currentSendListener: ((ev: Event) => void) | null = null;
    // Get JWT token from sessionStorage for authentication
    const getAuthenticatedBrokerURL = (): string | null => {
      const baseURL = isValidWsUrl(WEBSOCKET_URL) ? WEBSOCKET_URL : WSS_BASE_PATH;
      const jwtToken = sessionStorage.getItem("jwtToken");
      
      if (!jwtToken) {
        console.warn("thorBridge: No JWT token found in sessionStorage");
        return null;
      }
      
      // Append token as query parameter for authentication
      const separator = baseURL.includes('?') ? '&' : '?';
      return `${baseURL}${separator}token=${jwtToken}`;
    };

    const toAppMessage = (raw: any): AppMessage | null => {
      // Expect Thor WebsocketMessage payload to be either:
      // - a JSON string body with shape { payload: string|object, ... }
      // - or already-parsed object
      // And the payload content to be a JSON string/object with shape:
      //   { topic, payload, senderId, messageId, timestamp }
      try {
        const asObj = typeof raw === "string" ? JSON.parse(raw) : raw;
        const payloadField = asObj?.payload;
        if (!payloadField) return null;

        let decoded: any = null;
        if (typeof payloadField === "string") {
          // Some servers wrap the JSON with a human prefix like "MESSAGE RECEIVED: {...}"
          // Strip any prefix before the first '{' to recover valid JSON.
          let s = payloadField.trim();
          const braceIdx = s.indexOf("{");
          if (braceIdx > 0) s = s.slice(braceIdx);
          try {
            decoded = JSON.parse(s);
          } catch {
            // Fall back to null if still not parseable
            decoded = null;
          }
        } else if (typeof payloadField === "object") {
          decoded = payloadField;
        }

        // If decoded is still null, try interpreting the whole body as the decoded payload
        if (!decoded) {
          // As a last resort, map a minimal shape from the outer object
          if (typeof asObj?.type === "string") {
            return {
              type: asObj.type,
              payload: asObj.payload ?? {},
              senderId: "",
              messageId: Math.random().toString(36).slice(2, 12),
              timestamp: Date.now(),
            };
          }
          return null;
        }

        // We now have the decoded envelope with a topic & payload
        if (!decoded.topic) return null;
        return {
          type: decoded.topic,
          payload: decoded.payload,
          senderId: decoded.senderId || "",
          messageId: decoded.messageId || Math.random().toString(36).slice(2, 12),
          timestamp: decoded.timestamp || Date.now(),
        };
      } catch (e) {
        // Swallow parse errors but keep the bridge alive
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

    let stompClient: Client | null = null;
    let connectionRetryInterval: NodeJS.Timeout | null = null;

    const initializeConnection = () => {
      const now = Date.now();
      if (isConnecting || (now - lastConnectRequestedAt) < 200) {
        return;
      }
      lastConnectRequestedAt = now;
      const authenticatedURL = getAuthenticatedBrokerURL();
      
      if (!authenticatedURL) {
        console.warn("thorBridge: Cannot connect without JWT token, will retry...");
        postStatus("error");
        
        // Retry every 2 seconds until token is available
        if (!connectionRetryInterval) {
          connectionRetryInterval = setInterval(() => {
            const retryURL = getAuthenticatedBrokerURL();
            if (retryURL) {
              clearInterval(connectionRetryInterval!);
              connectionRetryInterval = null;
              initializeConnection();
            }
          }, 2000);
        }
        return;
      }

      // Clear any existing retry interval
      if (connectionRetryInterval) {
        clearInterval(connectionRetryInterval);
        connectionRetryInterval = null;
      }

      console.log("thorBridge: Connecting to authenticated websocket:", authenticatedURL);
      
      stompClient = new Client({
        brokerURL: authenticatedURL,
        reconnectDelay: 5000,
      });

      postStatus("connecting");
      isConnecting = true;

      stompClient.onConnect = () => {
        postStatus("connected");
        isConnecting = false;
        try {
          // Subscribe to application topics
          stompClient!.subscribe("/topic/messages", (message: IMessage) => {
            const app = toAppMessage(message.body);
            if (app) {
              const evt = new CustomEvent("websocket-message", { detail: app });
              window.dispatchEvent(evt);
            }
          });
          stompClient!.subscribe("/topic/statuses", (message: IMessage) => {
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

      stompClient.onStompError = (frame) => {
        console.error("thorBridge STOMP error:", frame.headers["message"], frame.body);
        postStatus("error");
        isConnecting = false;
      };
      
      stompClient.onWebSocketClose = () => {
        console.warn("thorBridge websocket closed");
        postStatus("disconnected");
        isConnecting = false;
      };

      stompClient.onWebSocketError = (error) => {
        console.error("thorBridge websocket error:", error);
        postStatus("error");
        isConnecting = false;
      };

      // Listen for outbound events from CommunicationService
      const sendListener = (ev: Event) => {
        const ce = ev as CustomEvent<AppMessage>;
        const app = ce.detail;
        if (!app || !stompClient) return;
        try {
          stompClient.publish({ destination: "/app/chat", body: toThorBody(app) });
        } catch (e) {
          console.error("thorBridge publish error", e);
        }
      };

      if (currentSendListener) {
        window.removeEventListener("websocket-send", currentSendListener as EventListener);
      }
      currentSendListener = sendListener;
      window.addEventListener("websocket-send", sendListener);
      stompClient.activate();

      // Clean up on unload
      window.addEventListener("unload", () => {
        try {
          if (currentSendListener) {
            window.removeEventListener("websocket-send", currentSendListener as EventListener);
            currentSendListener = null;
          }
          // Remove explicit connect-broker listener if present
          window.removeEventListener("telecom-connect-broker", connectBrokerListener as EventListener);
          window.removeEventListener("jwt-token-updated", jwtUpdatedListener as EventListener);
          if (stompClient) {
            stompClient.deactivate();
          }
          if (connectionRetryInterval) {
            clearInterval(connectionRetryInterval);
          }
        } catch {
          // ignore
        }
      });
    };

	    // Start the connection process
	    initializeConnection();

	    // Allow other views/components to explicitly (re)connect the broker
	    // ChatView triggers this via a CustomEvent("telecom-connect-broker", ...)
    const connectBrokerListener = () => {
      try {
        console.log("thorBridge: connect-broker requested");
        if (isConnecting) {
          return;
        }
        if (stompClient) {
          stompClient.deactivate();
        }
        // Small delay to ensure deactivation settles
        setTimeout(initializeConnection, 100);
      } catch (e) {
        console.warn("thorBridge: connect-broker failed:", e);
      }
    };
	    window.addEventListener("telecom-connect-broker", connectBrokerListener as EventListener);

    // Also listen for JWT token changes in sessionStorage to reconnect
    window.addEventListener("storage", (event) => {
      if (event.key === "jwtToken") {
        console.log("thorBridge: JWT token changed (storage), reconnecting...");
        if (connectionRetryInterval) {
          clearInterval(connectionRetryInterval);
          connectionRetryInterval = null;
        }
        if (stompClient) {
          stompClient.deactivate();
        }
        // Small delay to ensure token is fully set
        setTimeout(initializeConnection, 100);
      }
    });

    // Immediate reconnect when we get an explicit jwt-token-updated event
    const jwtUpdatedListener = (ev: Event) => {
      try {
        console.log("thorBridge: jwt-token-updated received, reconnecting...");
        if (connectionRetryInterval) {
          clearInterval(connectionRetryInterval);
          connectionRetryInterval = null;
        }
        if (stompClient) {
          stompClient.deactivate();
        }
        setTimeout(initializeConnection, 50);
      } catch (e) {
        console.warn("thorBridge: jwt-token-updated handling failed:", e);
      }
    };
    window.addEventListener("jwt-token-updated", jwtUpdatedListener);

  } catch (e) {
    console.warn("thorBridge not initialized:", e);
  }
}
