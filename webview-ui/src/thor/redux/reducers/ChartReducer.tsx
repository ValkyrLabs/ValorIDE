import { createSlice } from "@reduxjs/toolkit";

import { Chart } from '@thor/model/Chart';

const ChartSlice = createSlice({
  name: "Charts",
  initialState: [],

  reducers: {
    ChartAdded(state, action) {
      state.push(action.payload);
    },

    ChartValueToggled(state, action) {
      console.log("Chart TOGGLE")
      console.warn(JSON.stringify(action))
      const Chart:Chart = state.find((Chart) => Chart.id === action.payload.ChartId);
      if (Chart) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    ChartpropertySet(state, action) {
      const Chart = state.find((Chart) => Chart.id === action.payload.ChartId);
      if (Chart) {
      //  Chart[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  ChartAdded,
  ChartValueToggled,
  ChartpropertySet
} = ChartSlice.actions;
export default ChartSlice.reducer;
