import { createSlice } from "@reduxjs/toolkit";

import { McpMarketplaceItem } from '../../model/McpMarketplaceItem';

const McpMarketplaceItemSlice = createSlice({
  name: "McpMarketplaceItems",
  initialState: [],

  reducers: {
    McpMarketplaceItemAdded(state, action) {
      state.push(action.payload);
    },

    McpMarketplaceItemValueToggled(state, action) {
      console.log("McpMarketplaceItem TOGGLE")
      console.warn(JSON.stringify(action))
      const McpMarketplaceItem:McpMarketplaceItem = state.find((McpMarketplaceItem) => McpMarketplaceItem.id === action.payload.McpMarketplaceItemId);
      if (McpMarketplaceItem) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    McpMarketplaceItempropertySet(state, action) {
      const McpMarketplaceItem = state.find((McpMarketplaceItem) => McpMarketplaceItem.id === action.payload.McpMarketplaceItemId);
      if (McpMarketplaceItem) {
      //  McpMarketplaceItem[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  McpMarketplaceItemAdded,
  McpMarketplaceItemValueToggled,
  McpMarketplaceItempropertySet
} = McpMarketplaceItemSlice.actions;
export default McpMarketplaceItemSlice.reducer;
