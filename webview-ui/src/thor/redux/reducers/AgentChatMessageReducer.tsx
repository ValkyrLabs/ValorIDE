import { createSlice } from "@reduxjs/toolkit";

import { AgentChatMessage } from "@thor/model/AgentChatMessage";

const AgentChatMessageSlice = createSlice({
  name: "AgentChatMessages",
  initialState: [],

  reducers: {
    AgentChatMessageAdded(state, action) {
      state.push(action.payload);
    },

    AgentChatMessageValueToggled(state, action) {
      console.log("AgentChatMessage TOGGLE");
      console.warn(JSON.stringify(action));
      const AgentChatMessage: AgentChatMessage = state.find(
        (AgentChatMessage) =>
          AgentChatMessage.id === action.payload.AgentChatMessageId,
      );
      if (AgentChatMessage) {
        if (action.payload.target === "SOMETHING") {
        }
      }
    },

    AgentChatMessagepropertySet(state, action) {
      const AgentChatMessage = state.find(
        (AgentChatMessage) =>
          AgentChatMessage.id === action.payload.AgentChatMessageId,
      );
      if (AgentChatMessage) {
        //  AgentChatMessage[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  AgentChatMessageAdded,
  AgentChatMessageValueToggled,
  AgentChatMessagepropertySet,
} = AgentChatMessageSlice.actions;
export default AgentChatMessageSlice.reducer;
