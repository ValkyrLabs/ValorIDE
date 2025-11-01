import { createSlice } from "@reduxjs/toolkit";

import { SwarmRegisterResponse } from '@thor/model/SwarmRegisterResponse';

const SwarmRegisterResponseSlice = createSlice({
  name: "SwarmRegisterResponses",
  initialState: [],

  reducers: {
    SwarmRegisterResponseAdded(state, action) {
      state.push(action.payload);
    },

    SwarmRegisterResponseValueToggled(state, action) {
      console.log("SwarmRegisterResponse TOGGLE")
      console.warn(JSON.stringify(action))
      const SwarmRegisterResponse:SwarmRegisterResponse = state.find((SwarmRegisterResponse) => SwarmRegisterResponse.id === action.payload.SwarmRegisterResponseId);
      if (SwarmRegisterResponse) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    SwarmRegisterResponsepropertySet(state, action) {
      const SwarmRegisterResponse = state.find((SwarmRegisterResponse) => SwarmRegisterResponse.id === action.payload.SwarmRegisterResponseId);
      if (SwarmRegisterResponse) {
      //  SwarmRegisterResponse[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  SwarmRegisterResponseAdded,
  SwarmRegisterResponseValueToggled,
  SwarmRegisterResponsepropertySet
} = SwarmRegisterResponseSlice.actions;
export default SwarmRegisterResponseSlice.reducer;
