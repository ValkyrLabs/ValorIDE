import { createSlice } from "@reduxjs/toolkit";
const SheetSlice = createSlice({
    name: "Sheets",
    initialState: [],
    reducers: {
        SheetAdded(state, action) {
            state.push(action.payload);
        },
        SheetValueToggled(state, action) {
            console.log("Sheet TOGGLE");
            console.warn(JSON.stringify(action));
            const Sheet = state.find((Sheet) => Sheet.id === action.payload.SheetId);
            if (Sheet) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        SheetpropertySet(state, action) {
            const Sheet = state.find((Sheet) => Sheet.id === action.payload.SheetId);
            if (Sheet) {
                //  Sheet[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { SheetAdded, SheetValueToggled, SheetpropertySet } = SheetSlice.actions;
export default SheetSlice.reducer;
//# sourceMappingURL=SheetReducer.js.map