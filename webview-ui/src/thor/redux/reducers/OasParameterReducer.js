import { createSlice } from "@reduxjs/toolkit";
const OasParameterSlice = createSlice({
    name: "OasParameters",
    initialState: [],
    reducers: {
        OasParameterAdded(state, action) {
            state.push(action.payload);
        },
        OasParameterValueToggled(state, action) {
            console.log("OasParameter TOGGLE");
            console.warn(JSON.stringify(action));
            const OasParameter = state.find((OasParameter) => OasParameter.id === action.payload.OasParameterId);
            if (OasParameter) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        OasParameterpropertySet(state, action) {
            const OasParameter = state.find((OasParameter) => OasParameter.id === action.payload.OasParameterId);
            if (OasParameter) {
                //  OasParameter[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { OasParameterAdded, OasParameterValueToggled, OasParameterpropertySet } = OasParameterSlice.actions;
export default OasParameterSlice.reducer;
//# sourceMappingURL=OasParameterReducer.js.map