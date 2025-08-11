import React, { createContext, useContext } from "react";

interface WebSocketContextType {
  socket: WebSocket | null;
  isConnected: boolean;
  sendMessage: (message: string) => void;
}

const WebSocketContext = createContext<WebSocketContextType>({
  socket: null,
  isConnected: false,
  sendMessage: () => {},
});

export const WebSocketProvider = WebSocketContext.Provider;

export const useWebSocketContext = () => useContext(WebSocketContext);
