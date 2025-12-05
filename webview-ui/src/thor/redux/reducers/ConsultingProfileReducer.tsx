import { createSlice } from "@reduxjs/toolkit";

import { ConsultingProfile } from "@thor/model/ConsultingProfile";

const ConsultingProfileSlice = createSlice({
  name: "ConsultingProfiles",
  initialState: [],

  reducers: {
    ConsultingProfileAdded(state, action) {
      state.push(action.payload);
    },

    ConsultingProfileValueToggled(state, action) {
      console.log("ConsultingProfile TOGGLE");
      console.warn(JSON.stringify(action));
      const ConsultingProfile: ConsultingProfile = state.find(
        (ConsultingProfile) =>
          ConsultingProfile.id === action.payload.ConsultingProfileId,
      );
      if (ConsultingProfile) {
        if (action.payload.target === "SOMETHING") {
        }
      }
    },

    ConsultingProfilepropertySet(state, action) {
      const ConsultingProfile = state.find(
        (ConsultingProfile) =>
          ConsultingProfile.id === action.payload.ConsultingProfileId,
      );
      if (ConsultingProfile) {
        //  ConsultingProfile[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  ConsultingProfileAdded,
  ConsultingProfileValueToggled,
  ConsultingProfilepropertySet,
} = ConsultingProfileSlice.actions;
export default ConsultingProfileSlice.reducer;
