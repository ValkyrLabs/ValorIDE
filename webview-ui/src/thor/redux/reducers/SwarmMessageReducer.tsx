import { createSlice } from "@reduxjs/toolkit";

import { SwarmMessage } from '@thor/model/SwarmMessage';

const SwarmMessageSlice = createSlice({
  name: "SwarmMessages",
  initialState: [],

  reducers: {
    SwarmMessageAdded(state, action) {
      state.push(action.payload);
    },

    SwarmMessageValueToggled(state, action) {
      console.log("SwarmMessage TOGGLE")
      console.warn(JSON.stringify(action))
      const SwarmMessage:SwarmMessage = state.find((SwarmMessage) => SwarmMessage.id === action.payload.SwarmMessageId);
      if (SwarmMessage) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    SwarmMessagepropertySet(state, action) {
      const SwarmMessage = state.find((SwarmMessage) => SwarmMessage.id === action.payload.SwarmMessageId);
      if (SwarmMessage) {
      //  SwarmMessage[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  SwarmMessageAdded,
  SwarmMessageValueToggled,
  SwarmMessagepropertySet
} = SwarmMessageSlice.actions;
export default SwarmMessageSlice.reducer;
