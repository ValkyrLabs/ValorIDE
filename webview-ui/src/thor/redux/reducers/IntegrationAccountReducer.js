import { createSlice } from "@reduxjs/toolkit";
const IntegrationAccountSlice = createSlice({
    name: "IntegrationAccounts",
    initialState: [],
    reducers: {
        IntegrationAccountAdded(state, action) {
            state.push(action.payload);
        },
        IntegrationAccountValueToggled(state, action) {
            console.log("IntegrationAccount TOGGLE");
            console.warn(JSON.stringify(action));
            const IntegrationAccount = state.find((IntegrationAccount) => IntegrationAccount.id === action.payload.IntegrationAccountId);
            if (IntegrationAccount) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        IntegrationAccountpropertySet(state, action) {
            const IntegrationAccount = state.find((IntegrationAccount) => IntegrationAccount.id === action.payload.IntegrationAccountId);
            if (IntegrationAccount) {
                //  IntegrationAccount[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { IntegrationAccountAdded, IntegrationAccountValueToggled, IntegrationAccountpropertySet } = IntegrationAccountSlice.actions;
export default IntegrationAccountSlice.reducer;
//# sourceMappingURL=IntegrationAccountReducer.js.map