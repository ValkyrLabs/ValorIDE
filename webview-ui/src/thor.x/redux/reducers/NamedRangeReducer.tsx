import { createSlice } from "@reduxjs/toolkit";

import { NamedRange } from '@thor/model/NamedRange';

const NamedRangeSlice = createSlice({
  name: "NamedRanges",
  initialState: [],

  reducers: {
    NamedRangeAdded(state, action) {
      state.push(action.payload);
    },

    NamedRangeValueToggled(state, action) {
      console.log("NamedRange TOGGLE")
      console.warn(JSON.stringify(action))
      const NamedRange:NamedRange = state.find((NamedRange) => NamedRange.id === action.payload.NamedRangeId);
      if (NamedRange) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    NamedRangepropertySet(state, action) {
      const NamedRange = state.find((NamedRange) => NamedRange.id === action.payload.NamedRangeId);
      if (NamedRange) {
      //  NamedRange[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  NamedRangeAdded,
  NamedRangeValueToggled,
  NamedRangepropertySet
} = NamedRangeSlice.actions;
export default NamedRangeSlice.reducer;
