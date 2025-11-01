import { createSlice } from "@reduxjs/toolkit";

import { SwarmGraphNode } from '@thor/model/SwarmGraphNode';

const SwarmGraphNodeSlice = createSlice({
  name: "SwarmGraphNodes",
  initialState: [],

  reducers: {
    SwarmGraphNodeAdded(state, action) {
      state.push(action.payload);
    },

    SwarmGraphNodeValueToggled(state, action) {
      console.log("SwarmGraphNode TOGGLE")
      console.warn(JSON.stringify(action))
      const SwarmGraphNode:SwarmGraphNode = state.find((SwarmGraphNode) => SwarmGraphNode.id === action.payload.SwarmGraphNodeId);
      if (SwarmGraphNode) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    SwarmGraphNodepropertySet(state, action) {
      const SwarmGraphNode = state.find((SwarmGraphNode) => SwarmGraphNode.id === action.payload.SwarmGraphNodeId);
      if (SwarmGraphNode) {
      //  SwarmGraphNode[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  SwarmGraphNodeAdded,
  SwarmGraphNodeValueToggled,
  SwarmGraphNodepropertySet
} = SwarmGraphNodeSlice.actions;
export default SwarmGraphNodeSlice.reducer;
