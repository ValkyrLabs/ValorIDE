import { createSlice } from "@reduxjs/toolkit";

import { McpMarketplaceCatalog } from "../../model/McpMarketplaceCatalog";

const McpMarketplaceCatalogSlice = createSlice({
  name: "McpMarketplaceCatalogs",
  initialState: [],

  reducers: {
    McpMarketplaceCatalogAdded(state, action) {
      state.push(action.payload);
    },

    McpMarketplaceCatalogValueToggled(state, action) {
      console.log("McpMarketplaceCatalog TOGGLE");
      console.warn(JSON.stringify(action));
      const McpMarketplaceCatalog: McpMarketplaceCatalog = state.find(
        (McpMarketplaceCatalog) =>
          McpMarketplaceCatalog.id === action.payload.McpMarketplaceCatalogId,
      );
      if (McpMarketplaceCatalog) {
        if (action.payload.target === "SOMETHING") {
        }
      }
    },

    McpMarketplaceCatalogpropertySet(state, action) {
      const McpMarketplaceCatalog = state.find(
        (McpMarketplaceCatalog) =>
          McpMarketplaceCatalog.id === action.payload.McpMarketplaceCatalogId,
      );
      if (McpMarketplaceCatalog) {
        //  McpMarketplaceCatalog[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  McpMarketplaceCatalogAdded,
  McpMarketplaceCatalogValueToggled,
  McpMarketplaceCatalogpropertySet,
} = McpMarketplaceCatalogSlice.actions;
export default McpMarketplaceCatalogSlice.reducer;
