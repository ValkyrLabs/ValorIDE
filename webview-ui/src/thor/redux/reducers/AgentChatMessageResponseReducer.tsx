import { createSlice } from "@reduxjs/toolkit";

import { AgentChatMessageResponse } from "@thor/model/AgentChatMessageResponse";

const AgentChatMessageResponseSlice = createSlice({
  name: "AgentChatMessageResponses",
  initialState: [],

  reducers: {
    AgentChatMessageResponseAdded(state, action) {
      state.push(action.payload);
    },

    AgentChatMessageResponseValueToggled(state, action) {
      console.log("AgentChatMessageResponse TOGGLE");
      console.warn(JSON.stringify(action));
      const AgentChatMessageResponse: AgentChatMessageResponse = state.find(
        (AgentChatMessageResponse) =>
          AgentChatMessageResponse.id ===
          action.payload.AgentChatMessageResponseId,
      );
      if (AgentChatMessageResponse) {
        if (action.payload.target === "SOMETHING") {
        }
      }
    },

    AgentChatMessageResponsepropertySet(state, action) {
      const AgentChatMessageResponse = state.find(
        (AgentChatMessageResponse) =>
          AgentChatMessageResponse.id ===
          action.payload.AgentChatMessageResponseId,
      );
      if (AgentChatMessageResponse) {
        //  AgentChatMessageResponse[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  AgentChatMessageResponseAdded,
  AgentChatMessageResponseValueToggled,
  AgentChatMessageResponsepropertySet,
} = AgentChatMessageResponseSlice.actions;
export default AgentChatMessageResponseSlice.reducer;
