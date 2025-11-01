import { createSlice } from "@reduxjs/toolkit";

import { McpResourceTemplate } from '@thor/model/McpResourceTemplate';

const McpResourceTemplateSlice = createSlice({
  name: "McpResourceTemplates",
  initialState: [],

  reducers: {
    McpResourceTemplateAdded(state, action) {
      state.push(action.payload);
    },

    McpResourceTemplateValueToggled(state, action) {
      console.log("McpResourceTemplate TOGGLE")
      console.warn(JSON.stringify(action))
      const McpResourceTemplate:McpResourceTemplate = state.find((McpResourceTemplate) => McpResourceTemplate.id === action.payload.McpResourceTemplateId);
      if (McpResourceTemplate) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    McpResourceTemplatepropertySet(state, action) {
      const McpResourceTemplate = state.find((McpResourceTemplate) => McpResourceTemplate.id === action.payload.McpResourceTemplateId);
      if (McpResourceTemplate) {
      //  McpResourceTemplate[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  McpResourceTemplateAdded,
  McpResourceTemplateValueToggled,
  McpResourceTemplatepropertySet
} = McpResourceTemplateSlice.actions;
export default McpResourceTemplateSlice.reducer;
