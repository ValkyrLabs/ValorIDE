import { createSlice } from "@reduxjs/toolkit";

import { SkillProfile } from "@thor/model/SkillProfile";

const SkillProfileSlice = createSlice({
  name: "SkillProfiles",
  initialState: [],

  reducers: {
    SkillProfileAdded(state, action) {
      state.push(action.payload);
    },

    SkillProfileValueToggled(state, action) {
      console.log("SkillProfile TOGGLE");
      console.warn(JSON.stringify(action));
      const SkillProfile: SkillProfile = state.find(
        (SkillProfile) => SkillProfile.id === action.payload.SkillProfileId,
      );
      if (SkillProfile) {
        if (action.payload.target === "SOMETHING") {
        }
      }
    },

    SkillProfilepropertySet(state, action) {
      const SkillProfile = state.find(
        (SkillProfile) => SkillProfile.id === action.payload.SkillProfileId,
      );
      if (SkillProfile) {
        //  SkillProfile[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  SkillProfileAdded,
  SkillProfileValueToggled,
  SkillProfilepropertySet,
} = SkillProfileSlice.actions;
export default SkillProfileSlice.reducer;
