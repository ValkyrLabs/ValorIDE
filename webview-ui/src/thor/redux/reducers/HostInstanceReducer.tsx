import { createSlice } from "@reduxjs/toolkit";

import { HostInstance } from '@thor/model/HostInstance';

const HostInstanceSlice = createSlice({
  name: "HostInstances",
  initialState: [],

  reducers: {
    HostInstanceAdded(state, action) {
      state.push(action.payload);
    },

    HostInstanceValueToggled(state, action) {
      console.log("HostInstance TOGGLE")
      console.warn(JSON.stringify(action))
      const HostInstance:HostInstance = state.find((HostInstance) => HostInstance.id === action.payload.HostInstanceId);
      if (HostInstance) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    HostInstancepropertySet(state, action) {
      const HostInstance = state.find((HostInstance) => HostInstance.id === action.payload.HostInstanceId);
      if (HostInstance) {
      //  HostInstance[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  HostInstanceAdded,
  HostInstanceValueToggled,
  HostInstancepropertySet
} = HostInstanceSlice.actions;
export default HostInstanceSlice.reducer;
