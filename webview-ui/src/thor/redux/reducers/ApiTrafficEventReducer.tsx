import { createSlice } from "@reduxjs/toolkit";

import { ApiTrafficEvent } from '@thor/model/ApiTrafficEvent';

const ApiTrafficEventSlice = createSlice({
  name: "ApiTrafficEvents",
  initialState: [],

  reducers: {
    ApiTrafficEventAdded(state, action) {
      state.push(action.payload);
    },

    ApiTrafficEventValueToggled(state, action) {
      console.log("ApiTrafficEvent TOGGLE")
      console.warn(JSON.stringify(action))
      const ApiTrafficEvent:ApiTrafficEvent = state.find((ApiTrafficEvent) => ApiTrafficEvent.id === action.payload.ApiTrafficEventId);
      if (ApiTrafficEvent) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    ApiTrafficEventpropertySet(state, action) {
      const ApiTrafficEvent = state.find((ApiTrafficEvent) => ApiTrafficEvent.id === action.payload.ApiTrafficEventId);
      if (ApiTrafficEvent) {
      //  ApiTrafficEvent[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  ApiTrafficEventAdded,
  ApiTrafficEventValueToggled,
  ApiTrafficEventpropertySet
} = ApiTrafficEventSlice.actions;
export default ApiTrafficEventSlice.reducer;
