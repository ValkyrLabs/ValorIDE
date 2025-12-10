import { createContext, useContext } from "react";
const WebSocketContext = createContext({
    socket: null,
    isConnected: false,
    sendMessage: () => { },
});
export const WebSocketProvider = WebSocketContext.Provider;
export const useWebSocketContext = () => useContext(WebSocketContext);
//# sourceMappingURL=WebSocketContext.js.map