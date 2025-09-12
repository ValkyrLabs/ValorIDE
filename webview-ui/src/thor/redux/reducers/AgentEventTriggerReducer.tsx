import { createSlice } from "@reduxjs/toolkit";

import { AgentEventTrigger } from '@thor/model/AgentEventTrigger';

const AgentEventTriggerSlice = createSlice({
  name: "AgentEventTriggers",
  initialState: [],

  reducers: {
    AgentEventTriggerAdded(state, action) {
      state.push(action.payload);
    },

    AgentEventTriggerValueToggled(state, action) {
      console.log("AgentEventTrigger TOGGLE")
      console.warn(JSON.stringify(action))
      const AgentEventTrigger:AgentEventTrigger = state.find((AgentEventTrigger) => AgentEventTrigger.id === action.payload.AgentEventTriggerId);
      if (AgentEventTrigger) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    AgentEventTriggerpropertySet(state, action) {
      const AgentEventTrigger = state.find((AgentEventTrigger) => AgentEventTrigger.id === action.payload.AgentEventTriggerId);
      if (AgentEventTrigger) {
      //  AgentEventTrigger[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  AgentEventTriggerAdded,
  AgentEventTriggerValueToggled,
  AgentEventTriggerpropertySet
} = AgentEventTriggerSlice.actions;
export default AgentEventTriggerSlice.reducer;
