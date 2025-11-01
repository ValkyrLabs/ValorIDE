import { createSlice } from "@reduxjs/toolkit";

import { SwarmRegisterRequest } from '@thor/model/SwarmRegisterRequest';

const SwarmRegisterRequestSlice = createSlice({
  name: "SwarmRegisterRequests",
  initialState: [],

  reducers: {
    SwarmRegisterRequestAdded(state, action) {
      state.push(action.payload);
    },

    SwarmRegisterRequestValueToggled(state, action) {
      console.log("SwarmRegisterRequest TOGGLE")
      console.warn(JSON.stringify(action))
      const SwarmRegisterRequest:SwarmRegisterRequest = state.find((SwarmRegisterRequest) => SwarmRegisterRequest.id === action.payload.SwarmRegisterRequestId);
      if (SwarmRegisterRequest) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    SwarmRegisterRequestpropertySet(state, action) {
      const SwarmRegisterRequest = state.find((SwarmRegisterRequest) => SwarmRegisterRequest.id === action.payload.SwarmRegisterRequestId);
      if (SwarmRegisterRequest) {
      //  SwarmRegisterRequest[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  SwarmRegisterRequestAdded,
  SwarmRegisterRequestValueToggled,
  SwarmRegisterRequestpropertySet
} = SwarmRegisterRequestSlice.actions;
export default SwarmRegisterRequestSlice.reducer;
