import { createSlice } from "@reduxjs/toolkit";

import { WizardStatusResponse } from '@thor/model/WizardStatusResponse';

const WizardStatusResponseSlice = createSlice({
  name: "WizardStatusResponses",
  initialState: [],

  reducers: {
    WizardStatusResponseAdded(state, action) {
      state.push(action.payload);
    },

    WizardStatusResponseValueToggled(state, action) {
      console.log("WizardStatusResponse TOGGLE")
      console.warn(JSON.stringify(action))
      const WizardStatusResponse:WizardStatusResponse = state.find((WizardStatusResponse) => WizardStatusResponse.id === action.payload.WizardStatusResponseId);
      if (WizardStatusResponse) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    WizardStatusResponsepropertySet(state, action) {
      const WizardStatusResponse = state.find((WizardStatusResponse) => WizardStatusResponse.id === action.payload.WizardStatusResponseId);
      if (WizardStatusResponse) {
      //  WizardStatusResponse[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  WizardStatusResponseAdded,
  WizardStatusResponseValueToggled,
  WizardStatusResponsepropertySet
} = WizardStatusResponseSlice.actions;
export default WizardStatusResponseSlice.reducer;
