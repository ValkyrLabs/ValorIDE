import { createSlice } from "@reduxjs/toolkit";

import { ToolFailure } from "@thor/model/ToolFailure";

const ToolFailureSlice = createSlice({
  name: "ToolFailures",
  initialState: [],

  reducers: {
    ToolFailureAdded(state, action) {
      state.push(action.payload);
    },

    ToolFailureValueToggled(state, action) {
      console.log("ToolFailure TOGGLE");
      console.warn(JSON.stringify(action));
      const ToolFailure: ToolFailure = state.find(
        (ToolFailure) => ToolFailure.id === action.payload.ToolFailureId,
      );
      if (ToolFailure) {
        if (action.payload.target === "SOMETHING") {
        }
      }
    },

    ToolFailurepropertySet(state, action) {
      const ToolFailure = state.find(
        (ToolFailure) => ToolFailure.id === action.payload.ToolFailureId,
      );
      if (ToolFailure) {
        //  ToolFailure[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  ToolFailureAdded,
  ToolFailureValueToggled,
  ToolFailurepropertySet,
} = ToolFailureSlice.actions;
export default ToolFailureSlice.reducer;
