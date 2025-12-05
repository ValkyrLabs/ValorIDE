import { createSlice } from "@reduxjs/toolkit";
const QuotaSlice = createSlice({
    name: "Quotas",
    initialState: [],
    reducers: {
        QuotaAdded(state, action) {
            state.push(action.payload);
        },
        QuotaValueToggled(state, action) {
            console.log("Quota TOGGLE");
            console.warn(JSON.stringify(action));
            const Quota = state.find((Quota) => Quota.id === action.payload.QuotaId);
            if (Quota) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        QuotapropertySet(state, action) {
            const Quota = state.find((Quota) => Quota.id === action.payload.QuotaId);
            if (Quota) {
                //  Quota[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { QuotaAdded, QuotaValueToggled, QuotapropertySet } = QuotaSlice.actions;
export default QuotaSlice.reducer;
//# sourceMappingURL=QuotaReducer.js.map