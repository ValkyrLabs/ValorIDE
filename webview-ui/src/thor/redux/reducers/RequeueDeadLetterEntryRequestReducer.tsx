import { createSlice } from "@reduxjs/toolkit";

import { RequeueDeadLetterEntryRequest } from '@thor/model/RequeueDeadLetterEntryRequest';

const RequeueDeadLetterEntryRequestSlice = createSlice({
  name: "RequeueDeadLetterEntryRequests",
  initialState: [],

  reducers: {
    RequeueDeadLetterEntryRequestAdded(state, action) {
      state.push(action.payload);
    },

    RequeueDeadLetterEntryRequestValueToggled(state, action) {
      console.log("RequeueDeadLetterEntryRequest TOGGLE")
      console.warn(JSON.stringify(action))
      const RequeueDeadLetterEntryRequest:RequeueDeadLetterEntryRequest = state.find((RequeueDeadLetterEntryRequest) => RequeueDeadLetterEntryRequest.id === action.payload.RequeueDeadLetterEntryRequestId);
      if (RequeueDeadLetterEntryRequest) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    RequeueDeadLetterEntryRequestpropertySet(state, action) {
      const RequeueDeadLetterEntryRequest = state.find((RequeueDeadLetterEntryRequest) => RequeueDeadLetterEntryRequest.id === action.payload.RequeueDeadLetterEntryRequestId);
      if (RequeueDeadLetterEntryRequest) {
      //  RequeueDeadLetterEntryRequest[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  RequeueDeadLetterEntryRequestAdded,
  RequeueDeadLetterEntryRequestValueToggled,
  RequeueDeadLetterEntryRequestpropertySet
} = RequeueDeadLetterEntryRequestSlice.actions;
export default RequeueDeadLetterEntryRequestSlice.reducer;
