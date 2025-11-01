import { createSlice } from "@reduxjs/toolkit";

import { Metrics } from '@thor/model/Metrics';

const MetricsSlice = createSlice({
  name: "Metricss",
  initialState: [],

  reducers: {
    MetricsAdded(state, action) {
      state.push(action.payload);
    },

    MetricsValueToggled(state, action) {
      console.log("Metrics TOGGLE")
      console.warn(JSON.stringify(action))
      const Metrics:Metrics = state.find((Metrics) => Metrics.id === action.payload.MetricsId);
      if (Metrics) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    MetricspropertySet(state, action) {
      const Metrics = state.find((Metrics) => Metrics.id === action.payload.MetricsId);
      if (Metrics) {
      //  Metrics[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  MetricsAdded,
  MetricsValueToggled,
  MetricspropertySet
} = MetricsSlice.actions;
export default MetricsSlice.reducer;
