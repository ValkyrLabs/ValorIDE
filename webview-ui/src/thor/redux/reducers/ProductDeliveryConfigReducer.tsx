import { createSlice } from "@reduxjs/toolkit";

import { ProductDeliveryConfig } from '@thor/model/ProductDeliveryConfig';

const ProductDeliveryConfigSlice = createSlice({
  name: "ProductDeliveryConfigs",
  initialState: [],

  reducers: {
    ProductDeliveryConfigAdded(state, action) {
      state.push(action.payload);
    },

    ProductDeliveryConfigValueToggled(state, action) {
      console.log("ProductDeliveryConfig TOGGLE")
      console.warn(JSON.stringify(action))
      const ProductDeliveryConfig:ProductDeliveryConfig = state.find((ProductDeliveryConfig) => ProductDeliveryConfig.id === action.payload.ProductDeliveryConfigId);
      if (ProductDeliveryConfig) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    ProductDeliveryConfigpropertySet(state, action) {
      const ProductDeliveryConfig = state.find((ProductDeliveryConfig) => ProductDeliveryConfig.id === action.payload.ProductDeliveryConfigId);
      if (ProductDeliveryConfig) {
      //  ProductDeliveryConfig[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  ProductDeliveryConfigAdded,
  ProductDeliveryConfigValueToggled,
  ProductDeliveryConfigpropertySet
} = ProductDeliveryConfigSlice.actions;
export default ProductDeliveryConfigSlice.reducer;
