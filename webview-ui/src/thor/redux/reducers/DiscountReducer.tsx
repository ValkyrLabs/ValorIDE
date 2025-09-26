import { createSlice } from "@reduxjs/toolkit";

import { Discount } from '@thor/model/Discount';

const DiscountSlice = createSlice({
  name: "Discounts",
  initialState: [],

  reducers: {
    DiscountAdded(state, action) {
      state.push(action.payload);
    },

    DiscountValueToggled(state, action) {
      console.log("Discount TOGGLE")
      console.warn(JSON.stringify(action))
      const Discount:Discount = state.find((Discount) => Discount.id === action.payload.DiscountId);
      if (Discount) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    DiscountpropertySet(state, action) {
      const Discount = state.find((Discount) => Discount.id === action.payload.DiscountId);
      if (Discount) {
      //  Discount[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  DiscountAdded,
  DiscountValueToggled,
  DiscountpropertySet
} = DiscountSlice.actions;
export default DiscountSlice.reducer;
