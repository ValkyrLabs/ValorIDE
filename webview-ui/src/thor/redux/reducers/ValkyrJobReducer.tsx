import { createSlice } from "@reduxjs/toolkit";

import { ValkyrJob } from '@thor/model/ValkyrJob';

const ValkyrJobSlice = createSlice({
  name: "ValkyrJobs",
  initialState: [],

  reducers: {
    ValkyrJobAdded(state, action) {
      state.push(action.payload);
    },

    ValkyrJobValueToggled(state, action) {
      console.log("ValkyrJob TOGGLE")
      console.warn(JSON.stringify(action))
      const ValkyrJob:ValkyrJob = state.find((ValkyrJob) => ValkyrJob.id === action.payload.ValkyrJobId);
      if (ValkyrJob) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    ValkyrJobpropertySet(state, action) {
      const ValkyrJob = state.find((ValkyrJob) => ValkyrJob.id === action.payload.ValkyrJobId);
      if (ValkyrJob) {
      //  ValkyrJob[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  ValkyrJobAdded,
  ValkyrJobValueToggled,
  ValkyrJobpropertySet
} = ValkyrJobSlice.actions;
export default ValkyrJobSlice.reducer;
