import { createSlice } from "@reduxjs/toolkit";

import { McpTool } from "../../model/McpTool";

const McpToolSlice = createSlice({
  name: "McpTools",
  initialState: [],

  reducers: {
    McpToolAdded(state, action) {
      state.push(action.payload);
    },

    McpToolValueToggled(state, action) {
      console.log("McpTool TOGGLE");
      console.warn(JSON.stringify(action));
      const McpTool: McpTool = state.find(
        (McpTool) => McpTool.id === action.payload.McpToolId,
      );
      if (McpTool) {
        if (action.payload.target === "SOMETHING") {
        }
      }
    },

    McpToolpropertySet(state, action) {
      const McpTool = state.find(
        (McpTool) => McpTool.id === action.payload.McpToolId,
      );
      if (McpTool) {
        //  McpTool[action.property] = action.payload[action.property];
      }
    },
  },
});

export const { McpToolAdded, McpToolValueToggled, McpToolpropertySet } =
  McpToolSlice.actions;
export default McpToolSlice.reducer;
