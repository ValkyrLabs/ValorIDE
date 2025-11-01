import { useEffect, useRef, useState, useCallback } from 'react';

export interface WebSocketMessage {
    type: string;
    [key: string]: any;
}

interface UseWebSocketOptions {
    reconnectInterval?: number;
    maxReconnectAttempts?: number;
}

export function useWebSocket(
    url: string,
    options: UseWebSocketOptions = {}
) {
    const { reconnectInterval = 3000, maxReconnectAttempts = 5 } = options;

    const [isConnected, setIsConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
    const [error, setError] = useState<Error | null>(null);

    const wsRef = useRef<WebSocket | null>(null);
    const reconnectAttemptsRef = useRef(0);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const connect = useCallback(() => {
        try {
            // Convert HTTP/HTTPS URLs to WebSocket URLs if needed
            let wsUrl = url;
            if (url.startsWith('http://')) {
                wsUrl = url.replace('http://', 'ws://');
            } else if (url.startsWith('https://')) {
                wsUrl = url.replace('https://', 'wss://');
            }

            const ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                console.log('[WebSocket] Connected to', wsUrl);
                setIsConnected(true);
                setError(null);
                reconnectAttemptsRef.current = 0;
            };

            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data) as WebSocketMessage;
                    setLastMessage(message);
                } catch (e) {
                    console.warn('[WebSocket] Failed to parse message', e);
                }
            };

            ws.onerror = (event) => {
                const err = new Error('WebSocket error');
                console.error('[WebSocket] Error:', err, event);
                setError(err);
            };

            ws.onclose = () => {
                console.log('[WebSocket] Disconnected from', wsUrl);
                setIsConnected(false);
                wsRef.current = null;

                // Attempt reconnection
                if (reconnectAttemptsRef.current < maxReconnectAttempts) {
                    reconnectAttemptsRef.current += 1;
                    console.log(
                        `[WebSocket] Reconnecting... (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`
                    );
                    reconnectTimeoutRef.current = setTimeout(connect, reconnectInterval);
                } else {
                    console.error('[WebSocket] Max reconnection attempts reached');
                }
            };

            wsRef.current = ws;
        } catch (e) {
            const err = e instanceof Error ? e : new Error('Unknown error');
            console.error('[WebSocket] Connection failed:', err);
            setError(err);
        }
    }, [url, reconnectInterval, maxReconnectAttempts]);

    useEffect(() => {
        connect();

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.close();
            }
        };
    }, [connect]);

    const send = useCallback((message: WebSocketMessage) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(message));
        } else {
            console.warn('[WebSocket] Cannot send message - not connected');
        }
    }, []);

    return {
        isConnected,
        lastMessage,
        error,
        send,
    };
}
