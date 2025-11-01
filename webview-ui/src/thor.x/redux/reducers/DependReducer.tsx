import { createSlice } from "@reduxjs/toolkit";

import { Depend } from '@thor/model/Depend';

const DependSlice = createSlice({
  name: "Depends",
  initialState: [],

  reducers: {
    DependAdded(state, action) {
      state.push(action.payload);
    },

    DependValueToggled(state, action) {
      console.log("Depend TOGGLE")
      console.warn(JSON.stringify(action))
      const Depend:Depend = state.find((Depend) => Depend.id === action.payload.DependId);
      if (Depend) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    DependpropertySet(state, action) {
      const Depend = state.find((Depend) => Depend.id === action.payload.DependId);
      if (Depend) {
      //  Depend[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  DependAdded,
  DependValueToggled,
  DependpropertySet
} = DependSlice.actions;
export default DependSlice.reducer;
