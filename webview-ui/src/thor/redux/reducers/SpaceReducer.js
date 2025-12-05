import { createSlice } from "@reduxjs/toolkit";
const SpaceSlice = createSlice({
    name: "Spaces",
    initialState: [],
    reducers: {
        SpaceAdded(state, action) {
            state.push(action.payload);
        },
        SpaceValueToggled(state, action) {
            console.log("Space TOGGLE");
            console.warn(JSON.stringify(action));
            const Space = state.find((Space) => Space.id === action.payload.SpaceId);
            if (Space) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        SpacepropertySet(state, action) {
            const Space = state.find((Space) => Space.id === action.payload.SpaceId);
            if (Space) {
                //  Space[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { SpaceAdded, SpaceValueToggled, SpacepropertySet } = SpaceSlice.actions;
export default SpaceSlice.reducer;
//# sourceMappingURL=SpaceReducer.js.map