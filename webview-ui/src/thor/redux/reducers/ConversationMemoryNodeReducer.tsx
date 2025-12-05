import { createSlice } from "@reduxjs/toolkit";

import { ConversationMemoryNode } from "@thor/model/ConversationMemoryNode";

const ConversationMemoryNodeSlice = createSlice({
  name: "ConversationMemoryNodes",
  initialState: [],

  reducers: {
    ConversationMemoryNodeAdded(state, action) {
      state.push(action.payload);
    },

    ConversationMemoryNodeValueToggled(state, action) {
      console.log("ConversationMemoryNode TOGGLE");
      console.warn(JSON.stringify(action));
      const ConversationMemoryNode: ConversationMemoryNode = state.find(
        (ConversationMemoryNode) =>
          ConversationMemoryNode.id === action.payload.ConversationMemoryNodeId,
      );
      if (ConversationMemoryNode) {
        if (action.payload.target === "SOMETHING") {
        }
      }
    },

    ConversationMemoryNodepropertySet(state, action) {
      const ConversationMemoryNode = state.find(
        (ConversationMemoryNode) =>
          ConversationMemoryNode.id === action.payload.ConversationMemoryNodeId,
      );
      if (ConversationMemoryNode) {
        //  ConversationMemoryNode[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  ConversationMemoryNodeAdded,
  ConversationMemoryNodeValueToggled,
  ConversationMemoryNodepropertySet,
} = ConversationMemoryNodeSlice.actions;
export default ConversationMemoryNodeSlice.reducer;
