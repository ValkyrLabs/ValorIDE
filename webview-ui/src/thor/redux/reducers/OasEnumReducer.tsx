import { createSlice } from "@reduxjs/toolkit";

import { OasEnum } from "../../model/OasEnum";

const OasEnumSlice = createSlice({
  name: "OasEnums",
  initialState: [],

  reducers: {
    OasEnumAdded(state, action) {
      state.push(action.payload);
    },

    OasEnumValueToggled(state, action) {
      console.log("OasEnum TOGGLE");
      console.warn(JSON.stringify(action));
      const OasEnum: OasEnum = state.find(
        (OasEnum) => OasEnum.id === action.payload.OasEnumId,
      );
      if (OasEnum) {
        if (action.payload.target === "SOMETHING") {
        }
      }
    },

    OasEnumpropertySet(state, action) {
      const OasEnum = state.find(
        (OasEnum) => OasEnum.id === action.payload.OasEnumId,
      );
      if (OasEnum) {
        //  OasEnum[action.property] = action.payload[action.property];
      }
    },
  },
});

export const { OasEnumAdded, OasEnumValueToggled, OasEnumpropertySet } =
  OasEnumSlice.actions;
export default OasEnumSlice.reducer;
