import { createSlice } from "@reduxjs/toolkit";

import { McpResource } from '@thor/model/McpResource';

const McpResourceSlice = createSlice({
  name: "McpResources",
  initialState: [],

  reducers: {
    McpResourceAdded(state, action) {
      state.push(action.payload);
    },

    McpResourceValueToggled(state, action) {
      console.log("McpResource TOGGLE")
      console.warn(JSON.stringify(action))
      const McpResource:McpResource = state.find((McpResource) => McpResource.id === action.payload.McpResourceId);
      if (McpResource) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    McpResourcepropertySet(state, action) {
      const McpResource = state.find((McpResource) => McpResource.id === action.payload.McpResourceId);
      if (McpResource) {
      //  McpResource[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  McpResourceAdded,
  McpResourceValueToggled,
  McpResourcepropertySet
} = McpResourceSlice.actions;
export default McpResourceSlice.reducer;
