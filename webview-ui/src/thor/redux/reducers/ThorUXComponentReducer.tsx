import { createSlice } from "@reduxjs/toolkit";

import { ThorUXComponent } from '../../model/ThorUXComponent';

const ThorUXComponentSlice = createSlice({
  name: "ThorUXComponents",
  initialState: [],

  reducers: {
    ThorUXComponentAdded(state, action) {
      state.push(action.payload);
    },

    ThorUXComponentValueToggled(state, action) {
      console.log("ThorUXComponent TOGGLE")
      console.warn(JSON.stringify(action))
      const ThorUXComponent:ThorUXComponent = state.find((ThorUXComponent) => ThorUXComponent.id === action.payload.ThorUXComponentId);
      if (ThorUXComponent) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    ThorUXComponentpropertySet(state, action) {
      const ThorUXComponent = state.find((ThorUXComponent) => ThorUXComponent.id === action.payload.ThorUXComponentId);
      if (ThorUXComponent) {
      //  ThorUXComponent[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  ThorUXComponentAdded,
  ThorUXComponentValueToggled,
  ThorUXComponentpropertySet
} = ThorUXComponentSlice.actions;
export default ThorUXComponentSlice.reducer;
