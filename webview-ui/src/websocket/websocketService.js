import { addMessage } from "../components/ServerConsole/websocketSlice";
import store from "../redux/store"; // Adjust the import path as necessary
import { WebsocketMessageTypeEnum } from "../thor/model";
import { WEBSOCKET_URL, isValidWsUrl } from "./websocket";
let socket = null;
export const connectWebSocket = () => {
    if (!isValidWsUrl(WEBSOCKET_URL)) {
        console.warn("WebSocket disabled: REACT_APP_WS_BASE_PATH is missing or invalid.");
        return;
    }
    try {
        socket = new WebSocket(WEBSOCKET_URL);
    }
    catch (err) {
        console.error("Failed to create WebSocket:", err);
        store.dispatch(addMessage({
            type: WebsocketMessageTypeEnum.ERROR,
            payload: `WebSocket init error: ${err.message}`,
            createdDate: new Date(),
        }));
        return;
    }
    socket.onopen = () => {
        console.log("WebSocket connection established");
    };
    socket.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            store.dispatch(addMessage({
                type: WebsocketMessageTypeEnum.USER,
                payload: message,
                createdDate: new Date(),
            }));
        }
        catch (e) {
            console.error("WebSocket message parse error:", e);
            store.dispatch(addMessage({
                type: WebsocketMessageTypeEnum.ERROR,
                payload: `Parse error: ${e.message}`,
                createdDate: new Date(),
            }));
        }
    };
    socket.onerror = (error) => {
        console.error("WebSocket error:", error);
        store.dispatch(addMessage({
            type: WebsocketMessageTypeEnum.ERROR,
            payload: error.message,
            createdDate: new Date(),
        }));
    };
    socket.onclose = () => {
        console.log("WebSocket connection closed");
    };
};
export const disconnectWebSocket = () => {
    if (socket) {
        socket.close();
        socket = null;
    }
};
//# sourceMappingURL=websocketService.js.map