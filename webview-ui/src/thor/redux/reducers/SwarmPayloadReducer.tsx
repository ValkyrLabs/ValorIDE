import { createSlice } from "@reduxjs/toolkit";

import { SwarmPayload } from '@thor/model/SwarmPayload';

const SwarmPayloadSlice = createSlice({
  name: "SwarmPayloads",
  initialState: [],

  reducers: {
    SwarmPayloadAdded(state, action) {
      state.push(action.payload);
    },

    SwarmPayloadValueToggled(state, action) {
      console.log("SwarmPayload TOGGLE")
      console.warn(JSON.stringify(action))
      const SwarmPayload:SwarmPayload = state.find((SwarmPayload) => SwarmPayload.id === action.payload.SwarmPayloadId);
      if (SwarmPayload) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    SwarmPayloadpropertySet(state, action) {
      const SwarmPayload = state.find((SwarmPayload) => SwarmPayload.id === action.payload.SwarmPayloadId);
      if (SwarmPayload) {
      //  SwarmPayload[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  SwarmPayloadAdded,
  SwarmPayloadValueToggled,
  SwarmPayloadpropertySet
} = SwarmPayloadSlice.actions;
export default SwarmPayloadSlice.reducer;
