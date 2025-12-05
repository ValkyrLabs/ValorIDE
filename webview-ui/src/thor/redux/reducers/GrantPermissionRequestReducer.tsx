import { createSlice } from "@reduxjs/toolkit";

import { GrantPermissionRequest } from "@thor/model/GrantPermissionRequest";

const GrantPermissionRequestSlice = createSlice({
  name: "GrantPermissionRequests",
  initialState: [],

  reducers: {
    GrantPermissionRequestAdded(state, action) {
      state.push(action.payload);
    },

    GrantPermissionRequestValueToggled(state, action) {
      console.log("GrantPermissionRequest TOGGLE");
      console.warn(JSON.stringify(action));
      const GrantPermissionRequest: GrantPermissionRequest = state.find(
        (GrantPermissionRequest) =>
          GrantPermissionRequest.id === action.payload.GrantPermissionRequestId,
      );
      if (GrantPermissionRequest) {
        if (action.payload.target === "SOMETHING") {
        }
      }
    },

    GrantPermissionRequestpropertySet(state, action) {
      const GrantPermissionRequest = state.find(
        (GrantPermissionRequest) =>
          GrantPermissionRequest.id === action.payload.GrantPermissionRequestId,
      );
      if (GrantPermissionRequest) {
        //  GrantPermissionRequest[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  GrantPermissionRequestAdded,
  GrantPermissionRequestValueToggled,
  GrantPermissionRequestpropertySet,
} = GrantPermissionRequestSlice.actions;
export default GrantPermissionRequestSlice.reducer;
