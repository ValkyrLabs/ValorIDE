import { createSlice } from "@reduxjs/toolkit";

import { DefaultResponse } from '@thor/model/DefaultResponse';

const DefaultResponseSlice = createSlice({
  name: "DefaultResponses",
  initialState: [],

  reducers: {
    DefaultResponseAdded(state, action) {
      state.push(action.payload);
    },

    DefaultResponseValueToggled(state, action) {
      console.log("DefaultResponse TOGGLE")
      console.warn(JSON.stringify(action))
      const DefaultResponse:DefaultResponse = state.find((DefaultResponse) => DefaultResponse.id === action.payload.DefaultResponseId);
      if (DefaultResponse) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    DefaultResponsepropertySet(state, action) {
      const DefaultResponse = state.find((DefaultResponse) => DefaultResponse.id === action.payload.DefaultResponseId);
      if (DefaultResponse) {
      //  DefaultResponse[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  DefaultResponseAdded,
  DefaultResponseValueToggled,
  DefaultResponsepropertySet
} = DefaultResponseSlice.actions;
export default DefaultResponseSlice.reducer;
