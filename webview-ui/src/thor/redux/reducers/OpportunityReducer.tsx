import { createSlice } from "@reduxjs/toolkit";

import { Opportunity } from "../../model/Opportunity";

const OpportunitySlice = createSlice({
  name: "Opportunitys",
  initialState: [],

  reducers: {
    OpportunityAdded(state, action) {
      state.push(action.payload);
    },

    OpportunityValueToggled(state, action) {
      console.log("Opportunity TOGGLE");
      console.warn(JSON.stringify(action));
      const Opportunity: Opportunity = state.find(
        (Opportunity) => Opportunity.id === action.payload.OpportunityId,
      );
      if (Opportunity) {
        if (action.payload.target === "SOMETHING") {
        }
      }
    },

    OpportunitypropertySet(state, action) {
      const Opportunity = state.find(
        (Opportunity) => Opportunity.id === action.payload.OpportunityId,
      );
      if (Opportunity) {
        //  Opportunity[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  OpportunityAdded,
  OpportunityValueToggled,
  OpportunitypropertySet,
} = OpportunitySlice.actions;
export default OpportunitySlice.reducer;
