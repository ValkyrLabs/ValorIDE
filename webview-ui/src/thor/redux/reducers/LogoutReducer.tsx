import { createSlice } from "@reduxjs/toolkit";

import { Logout } from '../../model/Logout';

const LogoutSlice = createSlice({
  name: "Logouts",
  initialState: [],

  reducers: {
    LogoutAdded(state, action) {
      state.push(action.payload);
    },

    LogoutValueToggled(state, action) {
      console.log("Logout TOGGLE")
      console.warn(JSON.stringify(action))
      const Logout:Logout = state.find((Logout) => Logout.id === action.payload.LogoutId);
      if (Logout) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    LogoutpropertySet(state, action) {
      const Logout = state.find((Logout) => Logout.id === action.payload.LogoutId);
      if (Logout) {
      //  Logout[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  LogoutAdded,
  LogoutValueToggled,
  LogoutpropertySet
} = LogoutSlice.actions;
export default LogoutSlice.reducer;
