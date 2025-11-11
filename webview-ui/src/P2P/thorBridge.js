import { Client } from "@stomp/stompjs";
import { WEBSOCKET_URL, isValidWsUrl } from "@/websocket/websocket";
import { WebsocketMessageTypeEnum } from "@/thor/model";
import { BASE_PATH } from "@/thor/src/runtime";
const deriveWsBase = (input) => {
    if (!input)
        return undefined;
    const trimmed = input.trim();
    if (!trimmed)
        return undefined;
    if (/^wss?:\/\//i.test(trimmed)) {
        return trimmed;
    }
    try {
        const url = new URL(trimmed);
        if (url.protocol === "https:" || url.protocol === "http:") {
            url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
        }
        return url.toString();
    }
    catch {
        return undefined;
    }
};
const FALLBACK_WS_BASE = deriveWsBase(BASE_PATH) ?? "ws://localhost:8080";
// Only initialize in browser contexts
if (typeof window !== "undefined") {
    try {
        let isConnecting = false;
        let lastConnectRequestedAt = 0;
        let currentSendListener = null;
        // Simple local flag: default to true to persist JWT in localStorage
        const shouldPersistJwt = () => {
            try {
                const v = localStorage.getItem("valoride.persistJwt");
                return v === null ? true : v === "true";
            }
            catch {
                return true;
            }
        };
        const getOrCreateInstanceId = () => {
            try {
                let id = localStorage.getItem("valoride.instanceId");
                if (!id) {
                    id = `valoride-${Math.random().toString(36).substring(2, 12)}`;
                    localStorage.setItem("valoride.instanceId", id);
                }
                return id;
            }
            catch {
                return `valoride-${Math.random().toString(36).substring(2, 12)}`;
            }
        };
        // Get JWT token from storage for authentication
        const getAuthenticatedBrokerURL = () => {
            const baseURL = isValidWsUrl(WEBSOCKET_URL) ? WEBSOCKET_URL : FALLBACK_WS_BASE;
            let jwtToken = null;
            try {
                jwtToken = sessionStorage.getItem("jwtToken");
                if (!jwtToken) {
                    // Fall back to localStorage for persisted sessions
                    jwtToken = localStorage.getItem("jwtToken") || localStorage.getItem("authToken");
                    if (jwtToken) {
                        // Mirror into sessionStorage and notify listeners
                        sessionStorage.setItem("jwtToken", jwtToken);
                        try {
                            window.dispatchEvent(new CustomEvent("jwt-token-updated", { detail: { token: jwtToken, timestamp: Date.now(), source: "thorBridge-localStorage" } }));
                        }
                        catch { }
                    }
                }
            }
            catch {
                // ignore storage access issues
            }
            if (!jwtToken) {
                console.warn("thorBridge: No JWT token found in storage");
                return null;
            }
            // Append token as query parameter for authentication
            const separator = baseURL.includes('?') ? '&' : '?';
            return `${baseURL}${separator}token=${jwtToken}`;
        };
        const toAppMessage = (raw) => {
            // Expect Thor WebsocketMessage payload to be either:
            // - a JSON string body with shape { payload: string|object, ... }
            // - or already-parsed object
            // And the payload content to be a JSON string/object with shape:
            //   { topic, payload, senderId, messageId, timestamp }
            try {
                const asObj = typeof raw === "string" ? JSON.parse(raw) : raw;
                const payloadField = asObj?.payload;
                if (!payloadField)
                    return null;
                let decoded = null;
                if (typeof payloadField === "string") {
                    // Some servers wrap the JSON with a human prefix like "MESSAGE RECEIVED: {...}"
                    // Strip any prefix before the first '{' to recover valid JSON.
                    let s = payloadField.trim();
                    const braceIdx = s.indexOf("{");
                    if (braceIdx > 0)
                        s = s.slice(braceIdx);
                    try {
                        decoded = JSON.parse(s);
                    }
                    catch {
                        // Fall back to null if still not parseable
                        decoded = null;
                    }
                }
                else if (typeof payloadField === "object") {
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
                if (!decoded.topic)
                    return null;
                return {
                    type: decoded.topic,
                    payload: decoded.payload,
                    senderId: decoded.senderId || "",
                    messageId: decoded.messageId || Math.random().toString(36).slice(2, 12),
                    timestamp: decoded.timestamp || Date.now(),
                };
            }
            catch (e) {
                // Swallow parse errors but keep the bridge alive
                return null;
            }
        };
        const toThorBody = (msg) => {
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
        const postStatus = (phase) => {
            try {
                const evt = new CustomEvent("P2P-status", { detail: { thorConnected: phase === "connected", phase } });
                window.dispatchEvent(evt);
            }
            catch { }
        };
        let stompClient = null;
        let connectionRetryInterval = null;
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
                            clearInterval(connectionRetryInterval);
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
                    stompClient.subscribe("/topic/messages", (message) => {
                        const app = toAppMessage(message.body);
                        if (app) {
                            const evt = new CustomEvent("websocket-message", { detail: app });
                            window.dispatchEvent(evt);
                        }
                    });
                    stompClient.subscribe("/topic/statuses", (message) => {
                        const app = toAppMessage(message.body);
                        if (app) {
                            const evt = new CustomEvent("websocket-message", { detail: app });
                            window.dispatchEvent(evt);
                        }
                    });
                    // Immediately announce presence and login ACK so peers can tally/roll-call
                    try {
                        const instanceId = getOrCreateInstanceId();
                        const announce = (type, payload) => {
                            const app = {
                                type,
                                payload,
                                senderId: instanceId,
                                messageId: Math.random().toString(36).slice(2, 12),
                                timestamp: Date.now(),
                            };
                            stompClient.publish({ destination: "/app/chat", body: toThorBody(app) });
                        };
                        announce("presence:join", { id: instanceId });
                        announce("auth:ack", { id: instanceId });
                    }
                    catch { }
                }
                catch (e) {
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
            const sendListener = (ev) => {
                const ce = ev;
                const app = ce.detail;
                if (!app || !stompClient)
                    return;
                try {
                    stompClient.publish({ destination: "/app/chat", body: toThorBody(app) });
                }
                catch (e) {
                    console.error("thorBridge publish error", e);
                }
            };
            if (currentSendListener) {
                window.removeEventListener("websocket-send", currentSendListener);
            }
            currentSendListener = sendListener;
            window.addEventListener("websocket-send", sendListener);
            stompClient.activate();
            // Clean up on unload
            window.addEventListener("unload", () => {
                try {
                    if (currentSendListener) {
                        window.removeEventListener("websocket-send", currentSendListener);
                        currentSendListener = null;
                    }
                    // Remove explicit connect-broker listener if present
                    window.removeEventListener("P2P-connect-broker", connectBrokerListener);
                    window.removeEventListener("jwt-token-updated", jwtUpdatedListener);
                    if (stompClient) {
                        stompClient.deactivate();
                    }
                    if (connectionRetryInterval) {
                        clearInterval(connectionRetryInterval);
                    }
                }
                catch {
                    // ignore
                }
            });
        };
        // Start the connection process
        initializeConnection();
        // Allow other views/components to explicitly (re)connect the broker
        // ChatView triggers this via a CustomEvent("P2P-connect-broker", ...)
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
            }
            catch (e) {
                console.warn("thorBridge: connect-broker failed:", e);
            }
        };
        window.addEventListener("P2P-connect-broker", connectBrokerListener);
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
        const jwtUpdatedListener = (ev) => {
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
            }
            catch (e) {
                console.warn("thorBridge: jwt-token-updated handling failed:", e);
            }
        };
        window.addEventListener("jwt-token-updated", jwtUpdatedListener);
    }
    catch (e) {
        console.warn("thorBridge not initialized:", e);
    }
}
//# sourceMappingURL=thorBridge.js.map