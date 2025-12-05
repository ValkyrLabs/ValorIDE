import { createSlice } from "@reduxjs/toolkit";

import { McpServiceResponse } from "@thor/model/McpServiceResponse";

const McpServiceResponseSlice = createSlice({
  name: "McpServiceResponses",
  initialState: [],

  reducers: {
    McpServiceResponseAdded(state, action) {
      state.push(action.payload);
    },

    McpServiceResponseValueToggled(state, action) {
      console.log("McpServiceResponse TOGGLE");
      console.warn(JSON.stringify(action));
      const McpServiceResponse: McpServiceResponse = state.find(
        (McpServiceResponse) =>
          McpServiceResponse.id === action.payload.McpServiceResponseId,
      );
      if (McpServiceResponse) {
        if (action.payload.target === "SOMETHING") {
        }
      }
    },

    McpServiceResponsepropertySet(state, action) {
      const McpServiceResponse = state.find(
        (McpServiceResponse) =>
          McpServiceResponse.id === action.payload.McpServiceResponseId,
      );
      if (McpServiceResponse) {
        //  McpServiceResponse[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  McpServiceResponseAdded,
  McpServiceResponseValueToggled,
  McpServiceResponsepropertySet,
} = McpServiceResponseSlice.actions;
export default McpServiceResponseSlice.reducer;
