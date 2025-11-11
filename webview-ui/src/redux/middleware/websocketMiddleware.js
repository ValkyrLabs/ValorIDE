import * as StompJs from "@stomp/stompjs";
import { addMessage, setConnected, } from "../../components/ServerConsole/websocketSlice";
import { WEBSOCKET_URL, isValidWsUrl } from "../../websocket/websocket";
const socketUrl = WEBSOCKET_URL;
// Initialize client without brokerURL; validate and configure on connect
const stompClient = new StompJs.Client({
    reconnectDelay: 5000,
    onConnect: () => {
        console.log("Connected to WebSocket");
    },
    onDisconnect: () => {
        console.log("Disconnected from WebSocket");
    },
    onStompError: (frame) => {
        console.error("Broker reported error: " + frame.headers["message"]);
        console.error("Additional details: " + frame.body);
    },
});
export const websocketMiddleware = (store) => (next) => (action) => {
    switch (action.type) {
        case "WEBSOCKET_CONNECT":
            if (!isValidWsUrl(socketUrl)) {
                console.warn("WEBSOCKET_CONNECT skipped: REACT_APP_WS_BASE_PATH is missing or invalid.");
                return next(action);
            }
            stompClient.configure({
                brokerURL: socketUrl,
                reconnectDelay: 5000,
                onConnect: () => {
                    store.dispatch(setConnected(true));
                    stompClient.subscribe("/topic/messages", (message) => {
                        try {
                            const parsedMessage = JSON.parse(message.body);
                            store.dispatch(addMessage(parsedMessage));
                        }
                        catch (e) {
                            console.error("STOMP message parse error:", e);
                        }
                    });
                },
                onDisconnect: () => {
                    store.dispatch(setConnected(false));
                },
                onStompError: (frame) => {
                    console.error("Broker error: " + frame.headers["message"]);
                    console.error("Details: " + frame.body);
                },
            });
            stompClient.activate();
            break;
        case "WEBSOCKET_DISCONNECT":
            stompClient.deactivate();
            break;
        case "SEND_MESSAGE":
            const message = {
                payload: action.payload,
                type: "user",
            };
            stompClient.publish({
                destination: "/app/chat",
                body: JSON.stringify(message),
            });
            break;
        default:
            return next(action);
    }
    return next(action);
};
//# sourceMappingURL=websocketMiddleware.js.map