import { createSlice } from "@reduxjs/toolkit";

import { PresignResponse } from "@thor/model/PresignResponse";

const PresignResponseSlice = createSlice({
  name: "PresignResponses",
  initialState: [],

  reducers: {
    PresignResponseAdded(state, action) {
      state.push(action.payload);
    },

    PresignResponseValueToggled(state, action) {
      console.log("PresignResponse TOGGLE");
      console.warn(JSON.stringify(action));
      const PresignResponse: PresignResponse = state.find(
        (PresignResponse) =>
          PresignResponse.id === action.payload.PresignResponseId,
      );
      if (PresignResponse) {
        if (action.payload.target === "SOMETHING") {
        }
      }
    },

    PresignResponsepropertySet(state, action) {
      const PresignResponse = state.find(
        (PresignResponse) =>
          PresignResponse.id === action.payload.PresignResponseId,
      );
      if (PresignResponse) {
        //  PresignResponse[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  PresignResponseAdded,
  PresignResponseValueToggled,
  PresignResponsepropertySet,
} = PresignResponseSlice.actions;
export default PresignResponseSlice.reducer;
