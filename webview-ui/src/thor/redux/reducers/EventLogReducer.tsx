import { createSlice } from "@reduxjs/toolkit";

import { EventLog } from '../../model/EventLog';

const EventLogSlice = createSlice({
  name: "EventLogs",
  initialState: [],

  reducers: {
    EventLogAdded(state, action) {
      state.push(action.payload);
    },

    EventLogValueToggled(state, action) {
      console.log("EventLog TOGGLE")
      console.warn(JSON.stringify(action))
      const EventLog:EventLog = state.find((EventLog) => EventLog.id === action.payload.EventLogId);
      if (EventLog) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    EventLogpropertySet(state, action) {
      const EventLog = state.find((EventLog) => EventLog.id === action.payload.EventLogId);
      if (EventLog) {
      //  EventLog[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  EventLogAdded,
  EventLogValueToggled,
  EventLogpropertySet
} = EventLogSlice.actions;
export default EventLogSlice.reducer;
