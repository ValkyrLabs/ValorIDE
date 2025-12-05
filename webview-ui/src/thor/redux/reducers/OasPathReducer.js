import { createSlice } from "@reduxjs/toolkit";
const OasPathSlice = createSlice({
    name: "OasPaths",
    initialState: [],
    reducers: {
        OasPathAdded(state, action) {
            state.push(action.payload);
        },
        OasPathValueToggled(state, action) {
            console.log("OasPath TOGGLE");
            console.warn(JSON.stringify(action));
            const OasPath = state.find((OasPath) => OasPath.id === action.payload.OasPathId);
            if (OasPath) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        OasPathpropertySet(state, action) {
            const OasPath = state.find((OasPath) => OasPath.id === action.payload.OasPathId);
            if (OasPath) {
                //  OasPath[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { OasPathAdded, OasPathValueToggled, OasPathpropertySet } = OasPathSlice.actions;
export default OasPathSlice.reducer;
//# sourceMappingURL=OasPathReducer.js.map