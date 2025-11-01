import { createSlice } from "@reduxjs/toolkit";

import { Solution } from '@thor/model/Solution';

const SolutionSlice = createSlice({
  name: "Solutions",
  initialState: [],

  reducers: {
    SolutionAdded(state, action) {
      state.push(action.payload);
    },

    SolutionValueToggled(state, action) {
      console.log("Solution TOGGLE")
      console.warn(JSON.stringify(action))
      const Solution:Solution = state.find((Solution) => Solution.id === action.payload.SolutionId);
      if (Solution) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    SolutionpropertySet(state, action) {
      const Solution = state.find((Solution) => Solution.id === action.payload.SolutionId);
      if (Solution) {
      //  Solution[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  SolutionAdded,
  SolutionValueToggled,
  SolutionpropertySet
} = SolutionSlice.actions;
export default SolutionSlice.reducer;
