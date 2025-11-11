import { createSlice } from "@reduxjs/toolkit";
const SalesOrderSlice = createSlice({
    name: "SalesOrders",
    initialState: [],
    reducers: {
        SalesOrderAdded(state, action) {
            state.push(action.payload);
        },
        SalesOrderValueToggled(state, action) {
            console.log("SalesOrder TOGGLE");
            console.warn(JSON.stringify(action));
            const SalesOrder = state.find((SalesOrder) => SalesOrder.id === action.payload.SalesOrderId);
            if (SalesOrder) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        SalesOrderpropertySet(state, action) {
            const SalesOrder = state.find((SalesOrder) => SalesOrder.id === action.payload.SalesOrderId);
            if (SalesOrder) {
                //  SalesOrder[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { SalesOrderAdded, SalesOrderValueToggled, SalesOrderpropertySet } = SalesOrderSlice.actions;
export default SalesOrderSlice.reducer;
//# sourceMappingURL=SalesOrderReducer.js.map