import { createSlice } from "@reduxjs/toolkit";
const AccountBalanceSlice = createSlice({
    name: "AccountBalances",
    initialState: [],
    reducers: {
        AccountBalanceAdded(state, action) {
            state.push(action.payload);
        },
        AccountBalanceValueToggled(state, action) {
            console.log("AccountBalance TOGGLE");
            console.warn(JSON.stringify(action));
            const AccountBalance = state.find((AccountBalance) => AccountBalance.id === action.payload.AccountBalanceId);
            if (AccountBalance) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        AccountBalancepropertySet(state, action) {
            const AccountBalance = state.find((AccountBalance) => AccountBalance.id === action.payload.AccountBalanceId);
            if (AccountBalance) {
                //  AccountBalance[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { AccountBalanceAdded, AccountBalanceValueToggled, AccountBalancepropertySet } = AccountBalanceSlice.actions;
export default AccountBalanceSlice.reducer;
//# sourceMappingURL=AccountBalanceReducer.js.map