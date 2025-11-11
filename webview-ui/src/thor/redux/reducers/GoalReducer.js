import { createSlice } from "@reduxjs/toolkit";
const GoalSlice = createSlice({
    name: "Goals",
    initialState: [],
    reducers: {
        GoalAdded(state, action) {
            state.push(action.payload);
        },
        GoalValueToggled(state, action) {
            console.log("Goal TOGGLE");
            console.warn(JSON.stringify(action));
            const Goal = state.find((Goal) => Goal.id === action.payload.GoalId);
            if (Goal) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        GoalpropertySet(state, action) {
            const Goal = state.find((Goal) => Goal.id === action.payload.GoalId);
            if (Goal) {
                //  Goal[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { GoalAdded, GoalValueToggled, GoalpropertySet } = GoalSlice.actions;
export default GoalSlice.reducer;
//# sourceMappingURL=GoalReducer.js.map