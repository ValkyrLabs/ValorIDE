import { createSlice } from "@reduxjs/toolkit";

import { BlankRange } from '@thor/model/BlankRange';

const BlankRangeSlice = createSlice({
  name: "BlankRanges",
  initialState: [],

  reducers: {
    BlankRangeAdded(state, action) {
      state.push(action.payload);
    },

    BlankRangeValueToggled(state, action) {
      console.log("BlankRange TOGGLE")
      console.warn(JSON.stringify(action))
      const BlankRange:BlankRange = state.find((BlankRange) => BlankRange.id === action.payload.BlankRangeId);
      if (BlankRange) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    BlankRangepropertySet(state, action) {
      const BlankRange = state.find((BlankRange) => BlankRange.id === action.payload.BlankRangeId);
      if (BlankRange) {
      //  BlankRange[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  BlankRangeAdded,
  BlankRangeValueToggled,
  BlankRangepropertySet
} = BlankRangeSlice.actions;
export default BlankRangeSlice.reducer;
