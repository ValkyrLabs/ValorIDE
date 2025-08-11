import { createSlice } from "@reduxjs/toolkit";

import { AclSid } from "../../model/AclSid";

const AclSidSlice = createSlice({
  name: "AclSids",
  initialState: [],

  reducers: {
    AclSidAdded(state, action) {
      state.push(action.payload);
    },

    AclSidValueToggled(state, action) {
      console.log("AclSid TOGGLE");
      console.warn(JSON.stringify(action));
      const AclSid: AclSid = state.find(
        (AclSid) => AclSid.id === action.payload.AclSidId,
      );
      if (AclSid) {
        if (action.payload.target === "SOMETHING") {
        }
      }
    },

    AclSidpropertySet(state, action) {
      const AclSid = state.find(
        (AclSid) => AclSid.id === action.payload.AclSidId,
      );
      if (AclSid) {
        //  AclSid[action.property] = action.payload[action.property];
      }
    },
  },
});

export const { AclSidAdded, AclSidValueToggled, AclSidpropertySet } =
  AclSidSlice.actions;
export default AclSidSlice.reducer;
