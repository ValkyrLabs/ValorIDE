import { createSlice } from "@reduxjs/toolkit";

import { McpMarketplaceItemTag } from "../../model/McpMarketplaceItemTag";

const McpMarketplaceItemTagSlice = createSlice({
  name: "McpMarketplaceItemTags",
  initialState: [],

  reducers: {
    McpMarketplaceItemTagAdded(state, action) {
      state.push(action.payload);
    },

    McpMarketplaceItemTagValueToggled(state, action) {
      console.log("McpMarketplaceItemTag TOGGLE");
      console.warn(JSON.stringify(action));
      const McpMarketplaceItemTag: McpMarketplaceItemTag = state.find(
        (McpMarketplaceItemTag) =>
          McpMarketplaceItemTag.id === action.payload.McpMarketplaceItemTagId,
      );
      if (McpMarketplaceItemTag) {
        if (action.payload.target === "SOMETHING") {
        }
      }
    },

    McpMarketplaceItemTagpropertySet(state, action) {
      const McpMarketplaceItemTag = state.find(
        (McpMarketplaceItemTag) =>
          McpMarketplaceItemTag.id === action.payload.McpMarketplaceItemTagId,
      );
      if (McpMarketplaceItemTag) {
        //  McpMarketplaceItemTag[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  McpMarketplaceItemTagAdded,
  McpMarketplaceItemTagValueToggled,
  McpMarketplaceItemTagpropertySet,
} = McpMarketplaceItemTagSlice.actions;
export default McpMarketplaceItemTagSlice.reducer;
