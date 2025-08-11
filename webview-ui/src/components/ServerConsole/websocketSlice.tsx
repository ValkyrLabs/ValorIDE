import { createSlice } from "@reduxjs/toolkit";
// Import or define Principal
import { WebsocketSession } from "../../thor/model/WebsocketSession";

const websocketSlice = createSlice({
  name: "websocket",
  initialState: {
    connected: false,
    messages: [] as WebsocketSession["messages"],
    statuses: [] as WebsocketSession["statuses"],
  } as WebsocketSession,
  reducers: {
    setConnected: (state, action) => {
      // state.connected = action.payload;
    },
    addMessage: (state, action) => {
      state.messages = state.messages || [];
      state.messages.push(action.payload);
    },
    addStatus: (state, action) => {
      state.statuses = state.statuses || [];
      state.statuses.push(action.payload);
    },
  },
});

export const { setConnected, addMessage, addStatus } = websocketSlice.actions;
export default websocketSlice.reducer;
