import { createSlice } from "@reduxjs/toolkit";

import { RequeueDeadLetterEntryResponse } from '@thor/model/RequeueDeadLetterEntryResponse';

const RequeueDeadLetterEntryResponseSlice = createSlice({
  name: "RequeueDeadLetterEntryResponses",
  initialState: [],

  reducers: {
    RequeueDeadLetterEntryResponseAdded(state, action) {
      state.push(action.payload);
    },

    RequeueDeadLetterEntryResponseValueToggled(state, action) {
      console.log("RequeueDeadLetterEntryResponse TOGGLE")
      console.warn(JSON.stringify(action))
      const RequeueDeadLetterEntryResponse:RequeueDeadLetterEntryResponse = state.find((RequeueDeadLetterEntryResponse) => RequeueDeadLetterEntryResponse.id === action.payload.RequeueDeadLetterEntryResponseId);
      if (RequeueDeadLetterEntryResponse) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    RequeueDeadLetterEntryResponsepropertySet(state, action) {
      const RequeueDeadLetterEntryResponse = state.find((RequeueDeadLetterEntryResponse) => RequeueDeadLetterEntryResponse.id === action.payload.RequeueDeadLetterEntryResponseId);
      if (RequeueDeadLetterEntryResponse) {
      //  RequeueDeadLetterEntryResponse[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  RequeueDeadLetterEntryResponseAdded,
  RequeueDeadLetterEntryResponseValueToggled,
  RequeueDeadLetterEntryResponsepropertySet
} = RequeueDeadLetterEntryResponseSlice.actions;
export default RequeueDeadLetterEntryResponseSlice.reducer;
