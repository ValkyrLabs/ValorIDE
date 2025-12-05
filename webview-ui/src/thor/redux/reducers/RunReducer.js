import { createSlice } from "@reduxjs/toolkit";
const RunSlice = createSlice({
    name: "Runs",
    initialState: [],
    reducers: {
        RunAdded(state, action) {
            state.push(action.payload);
        },
        RunValueToggled(state, action) {
            console.log("Run TOGGLE");
            console.warn(JSON.stringify(action));
            const Run = state.find((Run) => Run.id === action.payload.RunId);
            if (Run) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        RunpropertySet(state, action) {
            const Run = state.find((Run) => Run.id === action.payload.RunId);
            if (Run) {
                //  Run[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { RunAdded, RunValueToggled, RunpropertySet } = RunSlice.actions;
export default RunSlice.reducer;
//# sourceMappingURL=RunReducer.js.map