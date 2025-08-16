import { createSlice } from "@reduxjs/toolkit";

import { OasResponse } from '../../model/OasResponse';

const OasResponseSlice = createSlice({
  name: "OasResponses",
  initialState: [],

  reducers: {
    OasResponseAdded(state, action) {
      state.push(action.payload);
    },

    OasResponseValueToggled(state, action) {
      console.log("OasResponse TOGGLE")
      console.warn(JSON.stringify(action))
      const OasResponse:OasResponse = state.find((OasResponse) => OasResponse.id === action.payload.OasResponseId);
      if (OasResponse) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    OasResponsepropertySet(state, action) {
      const OasResponse = state.find((OasResponse) => OasResponse.id === action.payload.OasResponseId);
      if (OasResponse) {
      //  OasResponse[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  OasResponseAdded,
  OasResponseValueToggled,
  OasResponsepropertySet
} = OasResponseSlice.actions;
export default OasResponseSlice.reducer;
