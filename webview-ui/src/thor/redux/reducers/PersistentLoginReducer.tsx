import { createSlice } from "@reduxjs/toolkit";

import { PersistentLogin } from '../../model/PersistentLogin';

const PersistentLoginSlice = createSlice({
  name: "PersistentLogins",
  initialState: [],

  reducers: {
    PersistentLoginAdded(state, action) {
      state.push(action.payload);
    },

    PersistentLoginValueToggled(state, action) {
      console.log("PersistentLogin TOGGLE")
      console.warn(JSON.stringify(action))
      const PersistentLogin:PersistentLogin = state.find((PersistentLogin) => PersistentLogin.id === action.payload.PersistentLoginId);
      if (PersistentLogin) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    PersistentLoginpropertySet(state, action) {
      const PersistentLogin = state.find((PersistentLogin) => PersistentLogin.id === action.payload.PersistentLoginId);
      if (PersistentLogin) {
      //  PersistentLogin[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  PersistentLoginAdded,
  PersistentLoginValueToggled,
  PersistentLoginpropertySet
} = PersistentLoginSlice.actions;
export default PersistentLoginSlice.reducer;
