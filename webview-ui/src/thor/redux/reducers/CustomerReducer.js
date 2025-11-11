import { createSlice } from "@reduxjs/toolkit";
const CustomerSlice = createSlice({
    name: "Customers",
    initialState: [],
    reducers: {
        CustomerAdded(state, action) {
            state.push(action.payload);
        },
        CustomerValueToggled(state, action) {
            console.log("Customer TOGGLE");
            console.warn(JSON.stringify(action));
            const Customer = state.find((Customer) => Customer.id === action.payload.CustomerId);
            if (Customer) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        CustomerpropertySet(state, action) {
            const Customer = state.find((Customer) => Customer.id === action.payload.CustomerId);
            if (Customer) {
                //  Customer[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { CustomerAdded, CustomerValueToggled, CustomerpropertySet } = CustomerSlice.actions;
export default CustomerSlice.reducer;
//# sourceMappingURL=CustomerReducer.js.map