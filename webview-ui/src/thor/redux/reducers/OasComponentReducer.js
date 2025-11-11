import { createSlice } from "@reduxjs/toolkit";
const OasComponentSlice = createSlice({
    name: "OasComponents",
    initialState: [],
    reducers: {
        OasComponentAdded(state, action) {
            state.push(action.payload);
        },
        OasComponentValueToggled(state, action) {
            console.log("OasComponent TOGGLE");
            console.warn(JSON.stringify(action));
            const OasComponent = state.find((OasComponent) => OasComponent.id === action.payload.OasComponentId);
            if (OasComponent) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        OasComponentpropertySet(state, action) {
            const OasComponent = state.find((OasComponent) => OasComponent.id === action.payload.OasComponentId);
            if (OasComponent) {
                //  OasComponent[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { OasComponentAdded, OasComponentValueToggled, OasComponentpropertySet } = OasComponentSlice.actions;
export default OasComponentSlice.reducer;
//# sourceMappingURL=OasComponentReducer.js.map