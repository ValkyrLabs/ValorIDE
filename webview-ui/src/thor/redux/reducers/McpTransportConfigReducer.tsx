import { createSlice } from "@reduxjs/toolkit";

import { McpTransportConfig } from "@thor/model/McpTransportConfig";

const McpTransportConfigSlice = createSlice({
  name: "McpTransportConfigs",
  initialState: [],

  reducers: {
    McpTransportConfigAdded(state, action) {
      state.push(action.payload);
    },

    McpTransportConfigValueToggled(state, action) {
      console.log("McpTransportConfig TOGGLE");
      console.warn(JSON.stringify(action));
      const McpTransportConfig: McpTransportConfig = state.find(
        (McpTransportConfig) =>
          McpTransportConfig.id === action.payload.McpTransportConfigId,
      );
      if (McpTransportConfig) {
        if (action.payload.target === "SOMETHING") {
        }
      }
    },

    McpTransportConfigpropertySet(state, action) {
      const McpTransportConfig = state.find(
        (McpTransportConfig) =>
          McpTransportConfig.id === action.payload.McpTransportConfigId,
      );
      if (McpTransportConfig) {
        //  McpTransportConfig[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  McpTransportConfigAdded,
  McpTransportConfigValueToggled,
  McpTransportConfigpropertySet,
} = McpTransportConfigSlice.actions;
export default McpTransportConfigSlice.reducer;
