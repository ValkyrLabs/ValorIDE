import { createSlice } from "@reduxjs/toolkit";
const OasOperationSlice = createSlice({
    name: "OasOperations",
    initialState: [],
    reducers: {
        OasOperationAdded(state, action) {
            state.push(action.payload);
        },
        OasOperationValueToggled(state, action) {
            console.log("OasOperation TOGGLE");
            console.warn(JSON.stringify(action));
            const OasOperation = state.find((OasOperation) => OasOperation.id === action.payload.OasOperationId);
            if (OasOperation) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        OasOperationpropertySet(state, action) {
            const OasOperation = state.find((OasOperation) => OasOperation.id === action.payload.OasOperationId);
            if (OasOperation) {
                //  OasOperation[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { OasOperationAdded, OasOperationValueToggled, OasOperationpropertySet } = OasOperationSlice.actions;
export default OasOperationSlice.reducer;
//# sourceMappingURL=OasOperationReducer.js.map