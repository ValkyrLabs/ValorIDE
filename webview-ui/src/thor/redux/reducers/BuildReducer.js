import { createSlice } from "@reduxjs/toolkit";
const BuildSlice = createSlice({
    name: "Builds",
    initialState: [],
    reducers: {
        BuildAdded(state, action) {
            state.push(action.payload);
        },
        BuildValueToggled(state, action) {
            console.log("Build TOGGLE");
            console.warn(JSON.stringify(action));
            const Build = state.find((Build) => Build.id === action.payload.BuildId);
            if (Build) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        BuildpropertySet(state, action) {
            const Build = state.find((Build) => Build.id === action.payload.BuildId);
            if (Build) {
                //  Build[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { BuildAdded, BuildValueToggled, BuildpropertySet } = BuildSlice.actions;
export default BuildSlice.reducer;
//# sourceMappingURL=BuildReducer.js.map