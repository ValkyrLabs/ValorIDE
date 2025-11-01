import { createSlice } from "@reduxjs/toolkit";

import { WizardStartResponse } from '@thor/model/WizardStartResponse';

const WizardStartResponseSlice = createSlice({
  name: "WizardStartResponses",
  initialState: [],

  reducers: {
    WizardStartResponseAdded(state, action) {
      state.push(action.payload);
    },

    WizardStartResponseValueToggled(state, action) {
      console.log("WizardStartResponse TOGGLE")
      console.warn(JSON.stringify(action))
      const WizardStartResponse:WizardStartResponse = state.find((WizardStartResponse) => WizardStartResponse.id === action.payload.WizardStartResponseId);
      if (WizardStartResponse) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    WizardStartResponsepropertySet(state, action) {
      const WizardStartResponse = state.find((WizardStartResponse) => WizardStartResponse.id === action.payload.WizardStartResponseId);
      if (WizardStartResponse) {
      //  WizardStartResponse[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  WizardStartResponseAdded,
  WizardStartResponseValueToggled,
  WizardStartResponsepropertySet
} = WizardStartResponseSlice.actions;
export default WizardStartResponseSlice.reducer;
