import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { getStoredJwtToken } from "@thorapi/utils/authTokenStorage";
import { getWebsocketUrl, isValidWsUrl } from "../websocket/websocket";

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

interface UseWebSocketOptions {
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

const toWsProtocol = (value: string): string =>
  value.startsWith("http://")
    ? value.replace("http://", "ws://")
    : value.startsWith("https://")
      ? value.replace("https://", "wss://")
      : value;

const appendAuthToken = (value: string, token: string | null): string => {
  if (!token) {
    return value;
  }

  try {
    const url = new URL(value);
    if (!url.searchParams.has("token")) {
      url.searchParams.set("token", token);
    }
    return url.toString();
  } catch {
    return value;
  }
};

const resolveWebSocketUrl = (value: string): string => {
  const candidate = toWsProtocol(value.trim());
  if (/^wss?:\/\//i.test(candidate)) {
    return appendAuthToken(candidate, getStoredJwtToken());
  }

  const configuredBase = getWebsocketUrl();
  if (!isValidWsUrl(configuredBase)) {
    return candidate;
  }

  try {
    const base = new URL(configuredBase);
    if (candidate.startsWith("/")) {
      base.searchParams.set("topic", candidate);
      return appendAuthToken(base.toString(), getStoredJwtToken());
    }

    const resolved = new URL(
      candidate,
      `${base.toString().replace(/\/+$/, "")}/`,
    );
    return appendAuthToken(resolved.toString(), getStoredJwtToken());
  } catch {
    return candidate;
  }
};

const useJwtTokenVersion = () => {
  const [tokenVersion, setTokenVersion] = useState(0);

  useEffect(() => {
    const bumpTokenVersion = () => {
      setTokenVersion((version) => version + 1);
    };
    const handleStorage = (event: StorageEvent) => {
      if (
        event.key === "jwtToken" ||
        event.key === "jwtSession" ||
        event.key === "authToken"
      ) {
        bumpTokenVersion();
      }
    };

    window.addEventListener("jwtTokenChanged", bumpTokenVersion);
    window.addEventListener("jwt-token-updated", bumpTokenVersion);
    window.addEventListener("credentialsHydrated", bumpTokenVersion);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("jwtTokenChanged", bumpTokenVersion);
      window.removeEventListener("jwt-token-updated", bumpTokenVersion);
      window.removeEventListener("credentialsHydrated", bumpTokenVersion);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return tokenVersion;
};

export function useWebSocket(url: string, options: UseWebSocketOptions = {}) {
  const { reconnectInterval = 3000, maxReconnectAttempts = 5 } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const tokenVersion = useJwtTokenVersion();
  const resolvedUrl = useMemo(
    () => resolveWebSocketUrl(url),
    [url, tokenVersion],
  );

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(resolvedUrl);

      ws.onopen = () => {
        console.log("[WebSocket] Connected to", resolvedUrl);
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          setLastMessage(message);
        } catch (e) {
          console.warn("[WebSocket] Failed to parse message", e);
        }
      };

      ws.onerror = (event) => {
        const err = new Error("WebSocket error");
        console.error("[WebSocket] Error:", err, event);
        setError(err);
      };

      ws.onclose = () => {
        console.log("[WebSocket] Disconnected from", resolvedUrl);
        setIsConnected(false);
        wsRef.current = null;

        // Attempt reconnection
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          console.log(
            `[WebSocket] Reconnecting... (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`,
          );
          reconnectTimeoutRef.current = setTimeout(connect, reconnectInterval);
        } else {
          console.error("[WebSocket] Max reconnection attempts reached");
        }
      };

      wsRef.current = ws;
    } catch (e) {
      const err = e instanceof Error ? e : new Error("Unknown error");
      console.error("[WebSocket] Connection failed:", err);
      setError(err);
    }
  }, [resolvedUrl, reconnectInterval, maxReconnectAttempts]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (
        wsRef.current &&
        (wsRef.current.readyState === WebSocket.CONNECTING ||
          wsRef.current.readyState === WebSocket.OPEN)
      ) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
      wsRef.current = null;
    };
  }, [connect]);

  const send = useCallback((message: WebSocketMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn("[WebSocket] Cannot send message - not connected");
    }
  }, []);

  return {
    isConnected,
    lastMessage,
    error,
    send,
  };
}
