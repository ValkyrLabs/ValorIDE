import { createSlice } from "@reduxjs/toolkit";

import { LineItem } from '@thor/model/LineItem';

const LineItemSlice = createSlice({
  name: "LineItems",
  initialState: [],

  reducers: {
    LineItemAdded(state, action) {
      state.push(action.payload);
    },

    LineItemValueToggled(state, action) {
      console.log("LineItem TOGGLE")
      console.warn(JSON.stringify(action))
      const LineItem:LineItem = state.find((LineItem) => LineItem.id === action.payload.LineItemId);
      if (LineItem) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    LineItempropertySet(state, action) {
      const LineItem = state.find((LineItem) => LineItem.id === action.payload.LineItemId);
      if (LineItem) {
      //  LineItem[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  LineItemAdded,
  LineItemValueToggled,
  LineItempropertySet
} = LineItemSlice.actions;
export default LineItemSlice.reducer;
