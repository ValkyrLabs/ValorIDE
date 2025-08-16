import { createSlice } from "@reduxjs/toolkit";

import { BuildOutput } from '../../model/BuildOutput';

const BuildOutputSlice = createSlice({
  name: "BuildOutputs",
  initialState: [],

  reducers: {
    BuildOutputAdded(state, action) {
      state.push(action.payload);
    },

    BuildOutputValueToggled(state, action) {
      console.log("BuildOutput TOGGLE")
      console.warn(JSON.stringify(action))
      const BuildOutput:BuildOutput = state.find((BuildOutput) => BuildOutput.id === action.payload.BuildOutputId);
      if (BuildOutput) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    BuildOutputpropertySet(state, action) {
      const BuildOutput = state.find((BuildOutput) => BuildOutput.id === action.payload.BuildOutputId);
      if (BuildOutput) {
      //  BuildOutput[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  BuildOutputAdded,
  BuildOutputValueToggled,
  BuildOutputpropertySet
} = BuildOutputSlice.actions;
export default BuildOutputSlice.reducer;
