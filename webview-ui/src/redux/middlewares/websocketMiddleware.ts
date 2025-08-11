import * as StompJs from "@stomp/stompjs";
import type { Middleware } from "redux";
import {
  addMessage,
  setConnected,
} from "../../components/ServerConsole/websocketSlice";
import { WEBSOCKET_URL } from "../../websocket/websocket";

import WebSocketState from "../services/websocketSlice";

const socketUrl = WEBSOCKET_URL;

const stompClient = new StompJs.Client({
  brokerURL: socketUrl,
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

interface RootStateWithWebsocket {
  websocket: typeof WebSocketState;
}

type AppMiddleware = Middleware<{}, RootStateWithWebsocket>;

export const websocketMiddleware: AppMiddleware =
  (store) => (next) => (action: any) => {
    switch (action.type) {
      case "WEBSOCKET_CONNECT":
        stompClient.configure({
          brokerURL: socketUrl,
          reconnectDelay: 5000,
          onConnect: () => {
            store.dispatch(setConnected(true));
            stompClient.subscribe("/topic/messages", (message) => {
              const parsedMessage = JSON.parse(message.body);
              store.dispatch(addMessage(parsedMessage));
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
