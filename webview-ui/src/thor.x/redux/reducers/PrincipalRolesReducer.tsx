import { createSlice } from "@reduxjs/toolkit";

import { PrincipalRoles } from '@thor/model/PrincipalRoles';

const PrincipalRolesSlice = createSlice({
  name: "PrincipalRoless",
  initialState: [],

  reducers: {
    PrincipalRolesAdded(state, action) {
      state.push(action.payload);
    },

    PrincipalRolesValueToggled(state, action) {
      console.log("PrincipalRoles TOGGLE")
      console.warn(JSON.stringify(action))
      const PrincipalRoles:PrincipalRoles = state.find((PrincipalRoles) => PrincipalRoles.id === action.payload.PrincipalRolesId);
      if (PrincipalRoles) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    PrincipalRolespropertySet(state, action) {
      const PrincipalRoles = state.find((PrincipalRoles) => PrincipalRoles.id === action.payload.PrincipalRolesId);
      if (PrincipalRoles) {
      //  PrincipalRoles[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  PrincipalRolesAdded,
  PrincipalRolesValueToggled,
  PrincipalRolespropertySet
} = PrincipalRolesSlice.actions;
export default PrincipalRolesSlice.reducer;
