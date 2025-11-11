import { createSlice } from "@reduxjs/toolkit";
const UsageTransactionSlice = createSlice({
    name: "UsageTransactions",
    initialState: [],
    reducers: {
        UsageTransactionAdded(state, action) {
            state.push(action.payload);
        },
        UsageTransactionValueToggled(state, action) {
            console.log("UsageTransaction TOGGLE");
            console.warn(JSON.stringify(action));
            const UsageTransaction = state.find((UsageTransaction) => UsageTransaction.id === action.payload.UsageTransactionId);
            if (UsageTransaction) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        UsageTransactionpropertySet(state, action) {
            const UsageTransaction = state.find((UsageTransaction) => UsageTransaction.id === action.payload.UsageTransactionId);
            if (UsageTransaction) {
                //  UsageTransaction[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { UsageTransactionAdded, UsageTransactionValueToggled, UsageTransactionpropertySet } = UsageTransactionSlice.actions;
export default UsageTransactionSlice.reducer;
//# sourceMappingURL=UsageTransactionReducer.js.map