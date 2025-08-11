import { createSlice } from "@reduxjs/toolkit";

import { OasInfo } from "../../model/OasInfo";

const OasInfoSlice = createSlice({
  name: "OasInfos",
  initialState: [],

  reducers: {
    OasInfoAdded(state, action) {
      state.push(action.payload);
    },

    OasInfoValueToggled(state, action) {
      console.log("OasInfo TOGGLE");
      console.warn(JSON.stringify(action));
      const OasInfo: OasInfo = state.find(
        (OasInfo) => OasInfo.id === action.payload.OasInfoId,
      );
      if (OasInfo) {
        if (action.payload.target === "SOMETHING") {
        }
      }
    },

    OasInfopropertySet(state, action) {
      const OasInfo = state.find(
        (OasInfo) => OasInfo.id === action.payload.OasInfoId,
      );
      if (OasInfo) {
        //  OasInfo[action.property] = action.payload[action.property];
      }
    },
  },
});

export const { OasInfoAdded, OasInfoValueToggled, OasInfopropertySet } =
  OasInfoSlice.actions;
export default OasInfoSlice.reducer;
