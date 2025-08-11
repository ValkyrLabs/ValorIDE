import { createSlice } from "@reduxjs/toolkit";

import { WebsocketSession } from "../../model/WebsocketSession";

const WebsocketSessionSlice = createSlice({
  name: "WebsocketSessions",
  initialState: [],

  reducers: {
    WebsocketSessionAdded(state, action) {
      state.push(action.payload);
    },

    WebsocketSessionValueToggled(state, action) {
      console.log("WebsocketSession TOGGLE");
      console.warn(JSON.stringify(action));
      const WebsocketSession: WebsocketSession = state.find(
        (WebsocketSession) =>
          WebsocketSession.id === action.payload.WebsocketSessionId,
      );
      if (WebsocketSession) {
        if (action.payload.target === "SOMETHING") {
        }
      }
    },

    WebsocketSessionpropertySet(state, action) {
      const WebsocketSession = state.find(
        (WebsocketSession) =>
          WebsocketSession.id === action.payload.WebsocketSessionId,
      );
      if (WebsocketSession) {
        //  WebsocketSession[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  WebsocketSessionAdded,
  WebsocketSessionValueToggled,
  WebsocketSessionpropertySet,
} = WebsocketSessionSlice.actions;
export default WebsocketSessionSlice.reducer;
