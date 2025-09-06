import { addMessage } from "../components/ServerConsole/websocketSlice";
import store from "../redux/store"; // Adjust the import path as necessary
import { WebsocketMessage, WebsocketMessageTypeEnum } from "../thor/model";
import { WEBSOCKET_URL, isValidWsUrl } from "./websocket";

let socket: WebSocket | null = null;

export const connectWebSocket = () => {
  if (!isValidWsUrl(WEBSOCKET_URL)) {
    console.warn(
      "WebSocket disabled: REACT_APP_WS_BASE_PATH is missing or invalid.",
    );
    return;
  }

  try {
    socket = new WebSocket(WEBSOCKET_URL);
  } catch (err) {
    console.error("Failed to create WebSocket:", err);
    store.dispatch(
      addMessage({
        type: WebsocketMessageTypeEnum.ERROR,
        payload: `WebSocket init error: ${(err as Error).message}`,
        createdDate: new Date(),
      } as WebsocketMessage),
    );
    return;
  }

  socket.onopen = () => {
    console.log("WebSocket connection established");
  };

  socket.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      store.dispatch(
        addMessage({
          type: WebsocketMessageTypeEnum.USER,
          payload: message,
          createdDate: new Date(),
        } as WebsocketMessage),
      );
    } catch (e) {
      console.error("WebSocket message parse error:", e);
      store.dispatch(
        addMessage({
          type: WebsocketMessageTypeEnum.ERROR,
          payload: `Parse error: ${(e as Error).message}`,
          createdDate: new Date(),
        } as WebsocketMessage),
      );
    }
  };

  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
    store.dispatch(
      addMessage({
        type: WebsocketMessageTypeEnum.ERROR,
        payload: (error as any as Error).message,
        createdDate: new Date(),
      } as WebsocketMessage),
    );
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
