import { createSlice } from "@reduxjs/toolkit";

import { AclClass } from '../../model/AclClass';

const AclClassSlice = createSlice({
  name: "AclClasss",
  initialState: [],

  reducers: {
    AclClassAdded(state, action) {
      state.push(action.payload);
    },

    AclClassValueToggled(state, action) {
      console.log("AclClass TOGGLE")
      console.warn(JSON.stringify(action))
      const AclClass:AclClass = state.find((AclClass) => AclClass.id === action.payload.AclClassId);
      if (AclClass) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    AclClasspropertySet(state, action) {
      const AclClass = state.find((AclClass) => AclClass.id === action.payload.AclClassId);
      if (AclClass) {
      //  AclClass[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  AclClassAdded,
  AclClassValueToggled,
  AclClasspropertySet
} = AclClassSlice.actions;
export default AclClassSlice.reducer;
