import { createSlice } from "@reduxjs/toolkit";

import { PtgRef } from '@thor/model/PtgRef';

const PtgRefSlice = createSlice({
  name: "PtgRefs",
  initialState: [],

  reducers: {
    PtgRefAdded(state, action) {
      state.push(action.payload);
    },

    PtgRefValueToggled(state, action) {
      console.log("PtgRef TOGGLE")
      console.warn(JSON.stringify(action))
      const PtgRef:PtgRef = state.find((PtgRef) => PtgRef.id === action.payload.PtgRefId);
      if (PtgRef) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    PtgRefpropertySet(state, action) {
      const PtgRef = state.find((PtgRef) => PtgRef.id === action.payload.PtgRefId);
      if (PtgRef) {
      //  PtgRef[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  PtgRefAdded,
  PtgRefValueToggled,
  PtgRefpropertySet
} = PtgRefSlice.actions;
export default PtgRefSlice.reducer;
