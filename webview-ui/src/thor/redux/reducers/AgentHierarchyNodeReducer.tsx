import { createSlice } from "@reduxjs/toolkit";

import { AgentHierarchyNode } from "@thor/model/AgentHierarchyNode";

const AgentHierarchyNodeSlice = createSlice({
  name: "AgentHierarchyNodes",
  initialState: [],

  reducers: {
    AgentHierarchyNodeAdded(state, action) {
      state.push(action.payload);
    },

    AgentHierarchyNodeValueToggled(state, action) {
      console.log("AgentHierarchyNode TOGGLE");
      console.warn(JSON.stringify(action));
      const AgentHierarchyNode: AgentHierarchyNode = state.find(
        (AgentHierarchyNode) =>
          AgentHierarchyNode.id === action.payload.AgentHierarchyNodeId,
      );
      if (AgentHierarchyNode) {
        if (action.payload.target === "SOMETHING") {
        }
      }
    },

    AgentHierarchyNodepropertySet(state, action) {
      const AgentHierarchyNode = state.find(
        (AgentHierarchyNode) =>
          AgentHierarchyNode.id === action.payload.AgentHierarchyNodeId,
      );
      if (AgentHierarchyNode) {
        //  AgentHierarchyNode[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  AgentHierarchyNodeAdded,
  AgentHierarchyNodeValueToggled,
  AgentHierarchyNodepropertySet,
} = AgentHierarchyNodeSlice.actions;
export default AgentHierarchyNodeSlice.reducer;
