import { createSlice } from "@reduxjs/toolkit";

import { PromptRating } from "@thor/model/PromptRating";

const PromptRatingSlice = createSlice({
  name: "PromptRatings",
  initialState: [],

  reducers: {
    PromptRatingAdded(state, action) {
      state.push(action.payload);
    },

    PromptRatingValueToggled(state, action) {
      console.log("PromptRating TOGGLE");
      console.warn(JSON.stringify(action));
      const PromptRating: PromptRating = state.find(
        (PromptRating) => PromptRating.id === action.payload.PromptRatingId,
      );
      if (PromptRating) {
        if (action.payload.target === "SOMETHING") {
        }
      }
    },

    PromptRatingpropertySet(state, action) {
      const PromptRating = state.find(
        (PromptRating) => PromptRating.id === action.payload.PromptRatingId,
      );
      if (PromptRating) {
        //  PromptRating[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  PromptRatingAdded,
  PromptRatingValueToggled,
  PromptRatingpropertySet,
} = PromptRatingSlice.actions;
export default PromptRatingSlice.reducer;
