import { createSlice } from "@reduxjs/toolkit";

import { DeadLetterQueue } from '@thor/model/DeadLetterQueue';

const DeadLetterQueueSlice = createSlice({
  name: "DeadLetterQueues",
  initialState: [],

  reducers: {
    DeadLetterQueueAdded(state, action) {
      state.push(action.payload);
    },

    DeadLetterQueueValueToggled(state, action) {
      console.log("DeadLetterQueue TOGGLE")
      console.warn(JSON.stringify(action))
      const DeadLetterQueue:DeadLetterQueue = state.find((DeadLetterQueue) => DeadLetterQueue.id === action.payload.DeadLetterQueueId);
      if (DeadLetterQueue) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    DeadLetterQueuepropertySet(state, action) {
      const DeadLetterQueue = state.find((DeadLetterQueue) => DeadLetterQueue.id === action.payload.DeadLetterQueueId);
      if (DeadLetterQueue) {
      //  DeadLetterQueue[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  DeadLetterQueueAdded,
  DeadLetterQueueValueToggled,
  DeadLetterQueuepropertySet
} = DeadLetterQueueSlice.actions;
export default DeadLetterQueueSlice.reducer;
