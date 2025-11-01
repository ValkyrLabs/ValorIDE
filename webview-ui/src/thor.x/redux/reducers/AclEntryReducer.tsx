import { createSlice } from "@reduxjs/toolkit";

import { AclEntry } from '@thor/model/AclEntry';

const AclEntrySlice = createSlice({
  name: "AclEntrys",
  initialState: [],

  reducers: {
    AclEntryAdded(state, action) {
      state.push(action.payload);
    },

    AclEntryValueToggled(state, action) {
      console.log("AclEntry TOGGLE")
      console.warn(JSON.stringify(action))
      const AclEntry:AclEntry = state.find((AclEntry) => AclEntry.id === action.payload.AclEntryId);
      if (AclEntry) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    AclEntrypropertySet(state, action) {
      const AclEntry = state.find((AclEntry) => AclEntry.id === action.payload.AclEntryId);
      if (AclEntry) {
      //  AclEntry[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  AclEntryAdded,
  AclEntryValueToggled,
  AclEntrypropertySet
} = AclEntrySlice.actions;
export default AclEntrySlice.reducer;
