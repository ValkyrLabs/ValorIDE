import { createSlice } from "@reduxjs/toolkit";

import { McpDownloadResponse } from '@thor/model/McpDownloadResponse';

const McpDownloadResponseSlice = createSlice({
  name: "McpDownloadResponses",
  initialState: [],

  reducers: {
    McpDownloadResponseAdded(state, action) {
      state.push(action.payload);
    },

    McpDownloadResponseValueToggled(state, action) {
      console.log("McpDownloadResponse TOGGLE")
      console.warn(JSON.stringify(action))
      const McpDownloadResponse:McpDownloadResponse = state.find((McpDownloadResponse) => McpDownloadResponse.id === action.payload.McpDownloadResponseId);
      if (McpDownloadResponse) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    McpDownloadResponsepropertySet(state, action) {
      const McpDownloadResponse = state.find((McpDownloadResponse) => McpDownloadResponse.id === action.payload.McpDownloadResponseId);
      if (McpDownloadResponse) {
      //  McpDownloadResponse[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  McpDownloadResponseAdded,
  McpDownloadResponseValueToggled,
  McpDownloadResponsepropertySet
} = McpDownloadResponseSlice.actions;
export default McpDownloadResponseSlice.reducer;
