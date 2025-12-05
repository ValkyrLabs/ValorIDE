import { createSlice } from "@reduxjs/toolkit";

import { AgentChatMessageRequest } from "@thor/model/AgentChatMessageRequest";

const AgentChatMessageRequestSlice = createSlice({
  name: "AgentChatMessageRequests",
  initialState: [],

  reducers: {
    AgentChatMessageRequestAdded(state, action) {
      state.push(action.payload);
    },

    AgentChatMessageRequestValueToggled(state, action) {
      console.log("AgentChatMessageRequest TOGGLE");
      console.warn(JSON.stringify(action));
      const AgentChatMessageRequest: AgentChatMessageRequest = state.find(
        (AgentChatMessageRequest) =>
          AgentChatMessageRequest.id ===
          action.payload.AgentChatMessageRequestId,
      );
      if (AgentChatMessageRequest) {
        if (action.payload.target === "SOMETHING") {
        }
      }
    },

    AgentChatMessageRequestpropertySet(state, action) {
      const AgentChatMessageRequest = state.find(
        (AgentChatMessageRequest) =>
          AgentChatMessageRequest.id ===
          action.payload.AgentChatMessageRequestId,
      );
      if (AgentChatMessageRequest) {
        //  AgentChatMessageRequest[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  AgentChatMessageRequestAdded,
  AgentChatMessageRequestValueToggled,
  AgentChatMessageRequestpropertySet,
} = AgentChatMessageRequestSlice.actions;
export default AgentChatMessageRequestSlice.reducer;
