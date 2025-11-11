import { createSlice } from "@reduxjs/toolkit";
const OasOpenAPISpecSlice = createSlice({
    name: "OasOpenAPISpecs",
    initialState: [],
    reducers: {
        OasOpenAPISpecAdded(state, action) {
            state.push(action.payload);
        },
        OasOpenAPISpecValueToggled(state, action) {
            console.log("OasOpenAPISpec TOGGLE");
            console.warn(JSON.stringify(action));
            const OasOpenAPISpec = state.find((OasOpenAPISpec) => OasOpenAPISpec.id === action.payload.OasOpenAPISpecId);
            if (OasOpenAPISpec) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        OasOpenAPISpecpropertySet(state, action) {
            const OasOpenAPISpec = state.find((OasOpenAPISpec) => OasOpenAPISpec.id === action.payload.OasOpenAPISpecId);
            if (OasOpenAPISpec) {
                //  OasOpenAPISpec[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { OasOpenAPISpecAdded, OasOpenAPISpecValueToggled, OasOpenAPISpecpropertySet } = OasOpenAPISpecSlice.actions;
export default OasOpenAPISpecSlice.reducer;
//# sourceMappingURL=OasOpenAPISpecReducer.js.map