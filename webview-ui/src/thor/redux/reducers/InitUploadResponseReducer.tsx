import { createSlice } from "@reduxjs/toolkit";

import { InitUploadResponse } from "@thor/model/InitUploadResponse";

const InitUploadResponseSlice = createSlice({
  name: "InitUploadResponses",
  initialState: [],

  reducers: {
    InitUploadResponseAdded(state, action) {
      state.push(action.payload);
    },

    InitUploadResponseValueToggled(state, action) {
      console.log("InitUploadResponse TOGGLE");
      console.warn(JSON.stringify(action));
      const InitUploadResponse: InitUploadResponse = state.find(
        (InitUploadResponse) =>
          InitUploadResponse.id === action.payload.InitUploadResponseId,
      );
      if (InitUploadResponse) {
        if (action.payload.target === "SOMETHING") {
        }
      }
    },

    InitUploadResponsepropertySet(state, action) {
      const InitUploadResponse = state.find(
        (InitUploadResponse) =>
          InitUploadResponse.id === action.payload.InitUploadResponseId,
      );
      if (InitUploadResponse) {
        //  InitUploadResponse[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  InitUploadResponseAdded,
  InitUploadResponseValueToggled,
  InitUploadResponsepropertySet,
} = InitUploadResponseSlice.actions;
export default InitUploadResponseSlice.reducer;
