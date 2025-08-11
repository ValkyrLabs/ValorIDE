import { createSlice } from "@reduxjs/toolkit";

import { ReferralLink } from "../../model/ReferralLink";

const ReferralLinkSlice = createSlice({
  name: "ReferralLinks",
  initialState: [],

  reducers: {
    ReferralLinkAdded(state, action) {
      state.push(action.payload);
    },

    ReferralLinkValueToggled(state, action) {
      console.log("ReferralLink TOGGLE");
      console.warn(JSON.stringify(action));
      const ReferralLink: ReferralLink = state.find(
        (ReferralLink) => ReferralLink.id === action.payload.ReferralLinkId,
      );
      if (ReferralLink) {
        if (action.payload.target === "SOMETHING") {
        }
      }
    },

    ReferralLinkpropertySet(state, action) {
      const ReferralLink = state.find(
        (ReferralLink) => ReferralLink.id === action.payload.ReferralLinkId,
      );
      if (ReferralLink) {
        //  ReferralLink[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  ReferralLinkAdded,
  ReferralLinkValueToggled,
  ReferralLinkpropertySet,
} = ReferralLinkSlice.actions;
export default ReferralLinkSlice.reducer;
