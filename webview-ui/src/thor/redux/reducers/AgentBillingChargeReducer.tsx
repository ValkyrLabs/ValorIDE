import { createSlice } from "@reduxjs/toolkit";

import { AgentBillingCharge } from "@thor/model/AgentBillingCharge";

const AgentBillingChargeSlice = createSlice({
  name: "AgentBillingCharges",
  initialState: [],

  reducers: {
    AgentBillingChargeAdded(state, action) {
      state.push(action.payload);
    },

    AgentBillingChargeValueToggled(state, action) {
      console.log("AgentBillingCharge TOGGLE");
      console.warn(JSON.stringify(action));
      const AgentBillingCharge: AgentBillingCharge = state.find(
        (AgentBillingCharge) =>
          AgentBillingCharge.id === action.payload.AgentBillingChargeId,
      );
      if (AgentBillingCharge) {
        if (action.payload.target === "SOMETHING") {
        }
      }
    },

    AgentBillingChargepropertySet(state, action) {
      const AgentBillingCharge = state.find(
        (AgentBillingCharge) =>
          AgentBillingCharge.id === action.payload.AgentBillingChargeId,
      );
      if (AgentBillingCharge) {
        //  AgentBillingCharge[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  AgentBillingChargeAdded,
  AgentBillingChargeValueToggled,
  AgentBillingChargepropertySet,
} = AgentBillingChargeSlice.actions;
export default AgentBillingChargeSlice.reducer;
