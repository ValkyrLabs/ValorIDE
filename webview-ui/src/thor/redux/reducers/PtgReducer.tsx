import { createSlice } from "@reduxjs/toolkit";

import { Ptg } from '../../model/Ptg';

const PtgSlice = createSlice({
  name: "Ptgs",
  initialState: [],

  reducers: {
    PtgAdded(state, action) {
      state.push(action.payload);
    },

    PtgValueToggled(state, action) {
      console.log("Ptg TOGGLE")
      console.warn(JSON.stringify(action))
      const Ptg:Ptg = state.find((Ptg) => Ptg.id === action.payload.PtgId);
      if (Ptg) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    PtgpropertySet(state, action) {
      const Ptg = state.find((Ptg) => Ptg.id === action.payload.PtgId);
      if (Ptg) {
      //  Ptg[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  PtgAdded,
  PtgValueToggled,
  PtgpropertySet
} = PtgSlice.actions;
export default PtgSlice.reducer;
