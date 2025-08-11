import { createSlice } from "@reduxjs/toolkit";

import { Organization } from "../../model/Organization";

const OrganizationSlice = createSlice({
  name: "Organizations",
  initialState: [],

  reducers: {
    OrganizationAdded(state, action) {
      state.push(action.payload);
    },

    OrganizationValueToggled(state, action) {
      console.log("Organization TOGGLE");
      console.warn(JSON.stringify(action));
      const Organization: Organization = state.find(
        (Organization) => Organization.id === action.payload.OrganizationId,
      );
      if (Organization) {
        if (action.payload.target === "SOMETHING") {
        }
      }
    },

    OrganizationpropertySet(state, action) {
      const Organization = state.find(
        (Organization) => Organization.id === action.payload.OrganizationId,
      );
      if (Organization) {
        //  Organization[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  OrganizationAdded,
  OrganizationValueToggled,
  OrganizationpropertySet,
} = OrganizationSlice.actions;
export default OrganizationSlice.reducer;
