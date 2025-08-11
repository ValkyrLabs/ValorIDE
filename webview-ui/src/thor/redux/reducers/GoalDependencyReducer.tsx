import { createSlice } from "@reduxjs/toolkit";

import { GoalDependency } from "../../model/GoalDependency";

const GoalDependencySlice = createSlice({
  name: "GoalDependencys",
  initialState: [],

  reducers: {
    GoalDependencyAdded(state, action) {
      state.push(action.payload);
    },

    GoalDependencyValueToggled(state, action) {
      console.log("GoalDependency TOGGLE");
      console.warn(JSON.stringify(action));
      const GoalDependency: GoalDependency = state.find(
        (GoalDependency) =>
          GoalDependency.id === action.payload.GoalDependencyId,
      );
      if (GoalDependency) {
        if (action.payload.target === "SOMETHING") {
        }
      }
    },

    GoalDependencypropertySet(state, action) {
      const GoalDependency = state.find(
        (GoalDependency) =>
          GoalDependency.id === action.payload.GoalDependencyId,
      );
      if (GoalDependency) {
        //  GoalDependency[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  GoalDependencyAdded,
  GoalDependencyValueToggled,
  GoalDependencypropertySet,
} = GoalDependencySlice.actions;
export default GoalDependencySlice.reducer;
