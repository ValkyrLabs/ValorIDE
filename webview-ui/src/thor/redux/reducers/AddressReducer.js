import { createSlice } from "@reduxjs/toolkit";
const AddressSlice = createSlice({
    name: "Addresss",
    initialState: [],
    reducers: {
        AddressAdded(state, action) {
            state.push(action.payload);
        },
        AddressValueToggled(state, action) {
            console.log("Address TOGGLE");
            console.warn(JSON.stringify(action));
            const Address = state.find((Address) => Address.id === action.payload.AddressId);
            if (Address) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        AddresspropertySet(state, action) {
            const Address = state.find((Address) => Address.id === action.payload.AddressId);
            if (Address) {
                //  Address[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { AddressAdded, AddressValueToggled, AddresspropertySet } = AddressSlice.actions;
export default AddressSlice.reducer;
//# sourceMappingURL=AddressReducer.js.map