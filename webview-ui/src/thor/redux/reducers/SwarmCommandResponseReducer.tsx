import { createSlice } from "@reduxjs/toolkit";

import { SwarmCommandResponse } from '@thor/model/SwarmCommandResponse';

const SwarmCommandResponseSlice = createSlice({
  name: "SwarmCommandResponses",
  initialState: [],

  reducers: {
    SwarmCommandResponseAdded(state, action) {
      state.push(action.payload);
    },

    SwarmCommandResponseValueToggled(state, action) {
      console.log("SwarmCommandResponse TOGGLE")
      console.warn(JSON.stringify(action))
      const SwarmCommandResponse:SwarmCommandResponse = state.find((SwarmCommandResponse) => SwarmCommandResponse.id === action.payload.SwarmCommandResponseId);
      if (SwarmCommandResponse) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    SwarmCommandResponsepropertySet(state, action) {
      const SwarmCommandResponse = state.find((SwarmCommandResponse) => SwarmCommandResponse.id === action.payload.SwarmCommandResponseId);
      if (SwarmCommandResponse) {
      //  SwarmCommandResponse[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  SwarmCommandResponseAdded,
  SwarmCommandResponseValueToggled,
  SwarmCommandResponsepropertySet
} = SwarmCommandResponseSlice.actions;
export default SwarmCommandResponseSlice.reducer;
