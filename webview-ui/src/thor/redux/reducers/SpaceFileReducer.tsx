import { createSlice } from "@reduxjs/toolkit";

import { SpaceFile } from '@thor/model/SpaceFile';

const SpaceFileSlice = createSlice({
  name: "SpaceFiles",
  initialState: [],

  reducers: {
    SpaceFileAdded(state, action) {
      state.push(action.payload);
    },

    SpaceFileValueToggled(state, action) {
      console.log("SpaceFile TOGGLE")
      console.warn(JSON.stringify(action))
      const SpaceFile:SpaceFile = state.find((SpaceFile) => SpaceFile.id === action.payload.SpaceFileId);
      if (SpaceFile) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    SpaceFilepropertySet(state, action) {
      const SpaceFile = state.find((SpaceFile) => SpaceFile.id === action.payload.SpaceFileId);
      if (SpaceFile) {
      //  SpaceFile[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  SpaceFileAdded,
  SpaceFileValueToggled,
  SpaceFilepropertySet
} = SpaceFileSlice.actions;
export default SpaceFileSlice.reducer;
