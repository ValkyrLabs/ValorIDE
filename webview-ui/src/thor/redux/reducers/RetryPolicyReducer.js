import { createSlice } from "@reduxjs/toolkit";
const RetryPolicySlice = createSlice({
    name: "RetryPolicys",
    initialState: [],
    reducers: {
        RetryPolicyAdded(state, action) {
            state.push(action.payload);
        },
        RetryPolicyValueToggled(state, action) {
            console.log("RetryPolicy TOGGLE");
            console.warn(JSON.stringify(action));
            const RetryPolicy = state.find((RetryPolicy) => RetryPolicy.id === action.payload.RetryPolicyId);
            if (RetryPolicy) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        RetryPolicypropertySet(state, action) {
            const RetryPolicy = state.find((RetryPolicy) => RetryPolicy.id === action.payload.RetryPolicyId);
            if (RetryPolicy) {
                //  RetryPolicy[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { RetryPolicyAdded, RetryPolicyValueToggled, RetryPolicypropertySet } = RetryPolicySlice.actions;
export default RetryPolicySlice.reducer;
//# sourceMappingURL=RetryPolicyReducer.js.map