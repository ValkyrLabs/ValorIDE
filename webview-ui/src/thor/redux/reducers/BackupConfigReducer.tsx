import { createSlice } from "@reduxjs/toolkit";

import { BackupConfig } from '../../model/BackupConfig';

const BackupConfigSlice = createSlice({
  name: "BackupConfigs",
  initialState: [],

  reducers: {
    BackupConfigAdded(state, action) {
      state.push(action.payload);
    },

    BackupConfigValueToggled(state, action) {
      console.log("BackupConfig TOGGLE")
      console.warn(JSON.stringify(action))
      const BackupConfig:BackupConfig = state.find((BackupConfig) => BackupConfig.id === action.payload.BackupConfigId);
      if (BackupConfig) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    BackupConfigpropertySet(state, action) {
      const BackupConfig = state.find((BackupConfig) => BackupConfig.id === action.payload.BackupConfigId);
      if (BackupConfig) {
      //  BackupConfig[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  BackupConfigAdded,
  BackupConfigValueToggled,
  BackupConfigpropertySet
} = BackupConfigSlice.actions;
export default BackupConfigSlice.reducer;
