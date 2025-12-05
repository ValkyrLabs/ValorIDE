import { createSlice } from "@reduxjs/toolkit";

import { ExecuteModuleRequest } from "@thor/model/ExecuteModuleRequest";

const ExecuteModuleRequestSlice = createSlice({
  name: "ExecuteModuleRequests",
  initialState: [],

  reducers: {
    ExecuteModuleRequestAdded(state, action) {
      state.push(action.payload);
    },

    ExecuteModuleRequestValueToggled(state, action) {
      console.log("ExecuteModuleRequest TOGGLE");
      console.warn(JSON.stringify(action));
      const ExecuteModuleRequest: ExecuteModuleRequest = state.find(
        (ExecuteModuleRequest) =>
          ExecuteModuleRequest.id === action.payload.ExecuteModuleRequestId,
      );
      if (ExecuteModuleRequest) {
        if (action.payload.target === "SOMETHING") {
        }
      }
    },

    ExecuteModuleRequestpropertySet(state, action) {
      const ExecuteModuleRequest = state.find(
        (ExecuteModuleRequest) =>
          ExecuteModuleRequest.id === action.payload.ExecuteModuleRequestId,
      );
      if (ExecuteModuleRequest) {
        //  ExecuteModuleRequest[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  ExecuteModuleRequestAdded,
  ExecuteModuleRequestValueToggled,
  ExecuteModuleRequestpropertySet,
} = ExecuteModuleRequestSlice.actions;
export default ExecuteModuleRequestSlice.reducer;
