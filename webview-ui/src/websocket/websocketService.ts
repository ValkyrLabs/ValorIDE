import { addMessage } from "../components/ServerConsole/websocketSlice";
import store from "../redux/store"; // Adjust the import path as necessary
import { WebsocketMessage, WebsocketMessageTypeEnum } from "../thor/model";
import { WEBSOCKET_URL } from "./websocket";

let socket: WebSocket | null = null;

export const connectWebSocket = () => {
  socket = new WebSocket(WEBSOCKET_URL);

  socket.onopen = () => {
    console.log("WebSocket connection established");
  };

  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    store.dispatch(
      addMessage({
        type: WebsocketMessageTypeEnum.USER,
        payload: message,
        createdDate: new Date(),
      } as WebsocketMessage),
    );
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
