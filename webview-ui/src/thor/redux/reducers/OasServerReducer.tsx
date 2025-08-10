import { createSlice } from "@reduxjs/toolkit";

import { OasServer } from "../../model/OasServer";

const OasServerSlice = createSlice({
  name: "OasServers",
  initialState: [],

  reducers: {
    OasServerAdded(state, action) {
      state.push(action.payload);
    },

    OasServerValueToggled(state, action) {
      console.log("OasServer TOGGLE");
      console.warn(JSON.stringify(action));
      const OasServer: OasServer = state.find(
        (OasServer) => OasServer.id === action.payload.OasServerId,
      );
      if (OasServer) {
        if (action.payload.target === "SOMETHING") {
        }
      }
    },

    OasServerpropertySet(state, action) {
      const OasServer = state.find(
        (OasServer) => OasServer.id === action.payload.OasServerId,
      );
      if (OasServer) {
        //  OasServer[action.property] = action.payload[action.property];
      }
    },
  },
});

export const { OasServerAdded, OasServerValueToggled, OasServerpropertySet } =
  OasServerSlice.actions;
export default OasServerSlice.reducer;
