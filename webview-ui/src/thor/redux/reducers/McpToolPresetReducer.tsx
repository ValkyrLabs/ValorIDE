import { createSlice } from "@reduxjs/toolkit";

import { McpToolPreset } from '@thor/model/McpToolPreset';

const McpToolPresetSlice = createSlice({
  name: "McpToolPresets",
  initialState: [],

  reducers: {
    McpToolPresetAdded(state, action) {
      state.push(action.payload);
    },

    McpToolPresetValueToggled(state, action) {
      console.log("McpToolPreset TOGGLE")
      console.warn(JSON.stringify(action))
      const McpToolPreset:McpToolPreset = state.find((McpToolPreset) => McpToolPreset.id === action.payload.McpToolPresetId);
      if (McpToolPreset) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    McpToolPresetpropertySet(state, action) {
      const McpToolPreset = state.find((McpToolPreset) => McpToolPreset.id === action.payload.McpToolPresetId);
      if (McpToolPreset) {
      //  McpToolPreset[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  McpToolPresetAdded,
  McpToolPresetValueToggled,
  McpToolPresetpropertySet
} = McpToolPresetSlice.actions;
export default McpToolPresetSlice.reducer;
