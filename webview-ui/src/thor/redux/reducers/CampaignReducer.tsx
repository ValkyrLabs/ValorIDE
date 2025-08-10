import { createSlice } from "@reduxjs/toolkit";

import { Campaign } from "../../model/Campaign";

const CampaignSlice = createSlice({
  name: "Campaigns",
  initialState: [],

  reducers: {
    CampaignAdded(state, action) {
      state.push(action.payload);
    },

    CampaignValueToggled(state, action) {
      console.log("Campaign TOGGLE");
      console.warn(JSON.stringify(action));
      const Campaign: Campaign = state.find(
        (Campaign) => Campaign.id === action.payload.CampaignId,
      );
      if (Campaign) {
        if (action.payload.target === "SOMETHING") {
        }
      }
    },

    CampaignpropertySet(state, action) {
      const Campaign = state.find(
        (Campaign) => Campaign.id === action.payload.CampaignId,
      );
      if (Campaign) {
        //  Campaign[action.property] = action.payload[action.property];
      }
    },
  },
});

export const { CampaignAdded, CampaignValueToggled, CampaignpropertySet } =
  CampaignSlice.actions;
export default CampaignSlice.reducer;
