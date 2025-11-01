import { createSlice } from "@reduxjs/toolkit";

import { Mcp } from '@thor/model/Mcp';

const McpSlice = createSlice({
  name: "Mcps",
  initialState: [],

  reducers: {
    McpAdded(state, action) {
      state.push(action.payload);
    },

    McpValueToggled(state, action) {
      console.log("Mcp TOGGLE")
      console.warn(JSON.stringify(action))
      const Mcp:Mcp = state.find((Mcp) => Mcp.id === action.payload.McpId);
      if (Mcp) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    McppropertySet(state, action) {
      const Mcp = state.find((Mcp) => Mcp.id === action.payload.McpId);
      if (Mcp) {
      //  Mcp[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  McpAdded,
  McpValueToggled,
  McppropertySet
} = McpSlice.actions;
export default McpSlice.reducer;
