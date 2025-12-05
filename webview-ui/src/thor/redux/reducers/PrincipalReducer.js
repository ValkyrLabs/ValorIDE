import { createSlice } from "@reduxjs/toolkit";
const PrincipalSlice = createSlice({
    name: "Principals",
    initialState: [],
    reducers: {
        PrincipalAdded(state, action) {
            state.push(action.payload);
        },
        PrincipalValueToggled(state, action) {
            console.log("Principal TOGGLE");
            console.warn(JSON.stringify(action));
            const Principal = state.find((Principal) => Principal.id === action.payload.PrincipalId);
            if (Principal) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        PrincipalpropertySet(state, action) {
            const Principal = state.find((Principal) => Principal.id === action.payload.PrincipalId);
            if (Principal) {
                //  Principal[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { PrincipalAdded, PrincipalValueToggled, PrincipalpropertySet } = PrincipalSlice.actions;
export default PrincipalSlice.reducer;
//# sourceMappingURL=PrincipalReducer.js.map