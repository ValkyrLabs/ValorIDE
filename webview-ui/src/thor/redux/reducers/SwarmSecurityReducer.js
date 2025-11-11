import { createSlice } from "@reduxjs/toolkit";
const SwarmSecuritySlice = createSlice({
    name: "SwarmSecuritys",
    initialState: [],
    reducers: {
        SwarmSecurityAdded(state, action) {
            state.push(action.payload);
        },
        SwarmSecurityValueToggled(state, action) {
            console.log("SwarmSecurity TOGGLE");
            console.warn(JSON.stringify(action));
            const SwarmSecurity = state.find((SwarmSecurity) => SwarmSecurity.id === action.payload.SwarmSecurityId);
            if (SwarmSecurity) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        SwarmSecuritypropertySet(state, action) {
            const SwarmSecurity = state.find((SwarmSecurity) => SwarmSecurity.id === action.payload.SwarmSecurityId);
            if (SwarmSecurity) {
                //  SwarmSecurity[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { SwarmSecurityAdded, SwarmSecurityValueToggled, SwarmSecuritypropertySet } = SwarmSecuritySlice.actions;
export default SwarmSecuritySlice.reducer;
//# sourceMappingURL=SwarmSecurityReducer.js.map