import { createSlice } from "@reduxjs/toolkit";
const AgentBillingSlice = createSlice({
    name: "AgentBillings",
    initialState: [],
    reducers: {
        AgentBillingAdded(state, action) {
            state.push(action.payload);
        },
        AgentBillingValueToggled(state, action) {
            console.log("AgentBilling TOGGLE");
            console.warn(JSON.stringify(action));
            const AgentBilling = state.find((AgentBilling) => AgentBilling.id === action.payload.AgentBillingId);
            if (AgentBilling) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        AgentBillingpropertySet(state, action) {
            const AgentBilling = state.find((AgentBilling) => AgentBilling.id === action.payload.AgentBillingId);
            if (AgentBilling) {
                //  AgentBilling[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { AgentBillingAdded, AgentBillingValueToggled, AgentBillingpropertySet, } = AgentBillingSlice.actions;
export default AgentBillingSlice.reducer;
//# sourceMappingURL=AgentBillingReducer.js.map