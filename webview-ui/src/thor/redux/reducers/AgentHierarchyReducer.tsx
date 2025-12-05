import { createSlice } from "@reduxjs/toolkit";

import { AgentHierarchy } from "@thor/model/AgentHierarchy";

const AgentHierarchySlice = createSlice({
  name: "AgentHierarchys",
  initialState: [],

  reducers: {
    AgentHierarchyAdded(state, action) {
      state.push(action.payload);
    },

    AgentHierarchyValueToggled(state, action) {
      console.log("AgentHierarchy TOGGLE");
      console.warn(JSON.stringify(action));
      const AgentHierarchy: AgentHierarchy = state.find(
        (AgentHierarchy) =>
          AgentHierarchy.id === action.payload.AgentHierarchyId,
      );
      if (AgentHierarchy) {
        if (action.payload.target === "SOMETHING") {
        }
      }
    },

    AgentHierarchypropertySet(state, action) {
      const AgentHierarchy = state.find(
        (AgentHierarchy) =>
          AgentHierarchy.id === action.payload.AgentHierarchyId,
      );
      if (AgentHierarchy) {
        //  AgentHierarchy[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  AgentHierarchyAdded,
  AgentHierarchyValueToggled,
  AgentHierarchypropertySet,
} = AgentHierarchySlice.actions;
export default AgentHierarchySlice.reducer;
