import { createSlice } from "@reduxjs/toolkit";

import { DownloadAccess } from '@thor/model/DownloadAccess';

const DownloadAccessSlice = createSlice({
  name: "DownloadAccesss",
  initialState: [],

  reducers: {
    DownloadAccessAdded(state, action) {
      state.push(action.payload);
    },

    DownloadAccessValueToggled(state, action) {
      console.log("DownloadAccess TOGGLE")
      console.warn(JSON.stringify(action))
      const DownloadAccess:DownloadAccess = state.find((DownloadAccess) => DownloadAccess.id === action.payload.DownloadAccessId);
      if (DownloadAccess) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    DownloadAccesspropertySet(state, action) {
      const DownloadAccess = state.find((DownloadAccess) => DownloadAccess.id === action.payload.DownloadAccessId);
      if (DownloadAccess) {
      //  DownloadAccess[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  DownloadAccessAdded,
  DownloadAccessValueToggled,
  DownloadAccesspropertySet
} = DownloadAccessSlice.actions;
export default DownloadAccessSlice.reducer;
