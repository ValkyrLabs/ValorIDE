import { createSlice } from "@reduxjs/toolkit";

import { SwarmAgentSummary } from '@thor/model/SwarmAgentSummary';

const SwarmAgentSummarySlice = createSlice({
  name: "SwarmAgentSummarys",
  initialState: [],

  reducers: {
    SwarmAgentSummaryAdded(state, action) {
      state.push(action.payload);
    },

    SwarmAgentSummaryValueToggled(state, action) {
      console.log("SwarmAgentSummary TOGGLE")
      console.warn(JSON.stringify(action))
      const SwarmAgentSummary:SwarmAgentSummary = state.find((SwarmAgentSummary) => SwarmAgentSummary.id === action.payload.SwarmAgentSummaryId);
      if (SwarmAgentSummary) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    SwarmAgentSummarypropertySet(state, action) {
      const SwarmAgentSummary = state.find((SwarmAgentSummary) => SwarmAgentSummary.id === action.payload.SwarmAgentSummaryId);
      if (SwarmAgentSummary) {
      //  SwarmAgentSummary[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  SwarmAgentSummaryAdded,
  SwarmAgentSummaryValueToggled,
  SwarmAgentSummarypropertySet
} = SwarmAgentSummarySlice.actions;
export default SwarmAgentSummarySlice.reducer;
