import { useEffect, useState } from "react";
/**
 * Lightweight hook that mirrors the ServerConsole websocket bridge.
 * It listens for the global websocket events that are relayed through
 * the VS Code extension host and exposes the connection state along
 * with the most recent message payload.
 */
export const useWebSocket = (topic) => {
    const [isConnected, setIsConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState(null);
    useEffect(() => {
        const handleConnected = () => setIsConnected(true);
        const handleDisconnected = () => setIsConnected(false);
        const handleMessage = (event) => {
            const detail = event.detail ?? null;
            setLastMessage(detail);
        };
        window.addEventListener("websocket-connected", handleConnected);
        window.addEventListener("websocket-disconnected", handleDisconnected);
        window.addEventListener("websocket-message", handleMessage);
        // Ask the VS Code host to initiate (or re-use) the broker connection.
        window.dispatchEvent(new CustomEvent("P2P-connect-broker", {
            detail: {
                topic,
                timestamp: Date.now(),
            },
        }));
        return () => {
            window.removeEventListener("websocket-connected", handleConnected);
            window.removeEventListener("websocket-disconnected", handleDisconnected);
            window.removeEventListener("websocket-message", handleMessage);
        };
    }, [topic]);
    return { isConnected, lastMessage };
};
//# sourceMappingURL=useWebSocket.js.map