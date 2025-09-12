import { createSlice } from "@reduxjs/toolkit";

import { McpToolCallResponse } from '@thor/model/McpToolCallResponse';

const McpToolCallResponseSlice = createSlice({
  name: "McpToolCallResponses",
  initialState: [],

  reducers: {
    McpToolCallResponseAdded(state, action) {
      state.push(action.payload);
    },

    McpToolCallResponseValueToggled(state, action) {
      console.log("McpToolCallResponse TOGGLE")
      console.warn(JSON.stringify(action))
      const McpToolCallResponse:McpToolCallResponse = state.find((McpToolCallResponse) => McpToolCallResponse.id === action.payload.McpToolCallResponseId);
      if (McpToolCallResponse) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    McpToolCallResponsepropertySet(state, action) {
      const McpToolCallResponse = state.find((McpToolCallResponse) => McpToolCallResponse.id === action.payload.McpToolCallResponseId);
      if (McpToolCallResponse) {
      //  McpToolCallResponse[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  McpToolCallResponseAdded,
  McpToolCallResponseValueToggled,
  McpToolCallResponsepropertySet
} = McpToolCallResponseSlice.actions;
export default McpToolCallResponseSlice.reducer;
