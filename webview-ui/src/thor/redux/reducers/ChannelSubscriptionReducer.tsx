import { createSlice } from "@reduxjs/toolkit";

import { ChannelSubscription } from '@thor/model/ChannelSubscription';

const ChannelSubscriptionSlice = createSlice({
  name: "ChannelSubscriptions",
  initialState: [],

  reducers: {
    ChannelSubscriptionAdded(state, action) {
      state.push(action.payload);
    },

    ChannelSubscriptionValueToggled(state, action) {
      console.log("ChannelSubscription TOGGLE")
      console.warn(JSON.stringify(action))
      const ChannelSubscription:ChannelSubscription = state.find((ChannelSubscription) => ChannelSubscription.id === action.payload.ChannelSubscriptionId);
      if (ChannelSubscription) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    ChannelSubscriptionpropertySet(state, action) {
      const ChannelSubscription = state.find((ChannelSubscription) => ChannelSubscription.id === action.payload.ChannelSubscriptionId);
      if (ChannelSubscription) {
      //  ChannelSubscription[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  ChannelSubscriptionAdded,
  ChannelSubscriptionValueToggled,
  ChannelSubscriptionpropertySet
} = ChannelSubscriptionSlice.actions;
export default ChannelSubscriptionSlice.reducer;
