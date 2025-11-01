import { createSlice } from "@reduxjs/toolkit";

import { Authority } from '@thor/model/Authority';

const AuthoritySlice = createSlice({
  name: "Authoritys",
  initialState: [],

  reducers: {
    AuthorityAdded(state, action) {
      state.push(action.payload);
    },

    AuthorityValueToggled(state, action) {
      console.log("Authority TOGGLE")
      console.warn(JSON.stringify(action))
      const Authority:Authority = state.find((Authority) => Authority.id === action.payload.AuthorityId);
      if (Authority) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    AuthoritypropertySet(state, action) {
      const Authority = state.find((Authority) => Authority.id === action.payload.AuthorityId);
      if (Authority) {
      //  Authority[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  AuthorityAdded,
  AuthorityValueToggled,
  AuthoritypropertySet
} = AuthoritySlice.actions;
export default AuthoritySlice.reducer;
