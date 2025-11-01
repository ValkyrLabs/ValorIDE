import { createSlice } from "@reduxjs/toolkit";

import { ApiMetricsResponse } from '@thor/model/ApiMetricsResponse';

const ApiMetricsResponseSlice = createSlice({
  name: "ApiMetricsResponses",
  initialState: [],

  reducers: {
    ApiMetricsResponseAdded(state, action) {
      state.push(action.payload);
    },

    ApiMetricsResponseValueToggled(state, action) {
      console.log("ApiMetricsResponse TOGGLE")
      console.warn(JSON.stringify(action))
      const ApiMetricsResponse:ApiMetricsResponse = state.find((ApiMetricsResponse) => ApiMetricsResponse.id === action.payload.ApiMetricsResponseId);
      if (ApiMetricsResponse) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    ApiMetricsResponsepropertySet(state, action) {
      const ApiMetricsResponse = state.find((ApiMetricsResponse) => ApiMetricsResponse.id === action.payload.ApiMetricsResponseId);
      if (ApiMetricsResponse) {
      //  ApiMetricsResponse[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  ApiMetricsResponseAdded,
  ApiMetricsResponseValueToggled,
  ApiMetricsResponsepropertySet
} = ApiMetricsResponseSlice.actions;
export default ApiMetricsResponseSlice.reducer;
