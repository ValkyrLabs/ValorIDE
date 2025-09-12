import { createSlice } from "@reduxjs/toolkit";

import { LegalPrecedent } from '@thor/model/LegalPrecedent';

const LegalPrecedentSlice = createSlice({
  name: "LegalPrecedents",
  initialState: [],

  reducers: {
    LegalPrecedentAdded(state, action) {
      state.push(action.payload);
    },

    LegalPrecedentValueToggled(state, action) {
      console.log("LegalPrecedent TOGGLE")
      console.warn(JSON.stringify(action))
      const LegalPrecedent:LegalPrecedent = state.find((LegalPrecedent) => LegalPrecedent.id === action.payload.LegalPrecedentId);
      if (LegalPrecedent) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    LegalPrecedentpropertySet(state, action) {
      const LegalPrecedent = state.find((LegalPrecedent) => LegalPrecedent.id === action.payload.LegalPrecedentId);
      if (LegalPrecedent) {
      //  LegalPrecedent[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  LegalPrecedentAdded,
  LegalPrecedentValueToggled,
  LegalPrecedentpropertySet
} = LegalPrecedentSlice.actions;
export default LegalPrecedentSlice.reducer;
