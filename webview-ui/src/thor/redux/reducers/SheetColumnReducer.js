import { createSlice } from "@reduxjs/toolkit";
const SheetColumnSlice = createSlice({
    name: "SheetColumns",
    initialState: [],
    reducers: {
        SheetColumnAdded(state, action) {
            state.push(action.payload);
        },
        SheetColumnValueToggled(state, action) {
            console.log("SheetColumn TOGGLE");
            console.warn(JSON.stringify(action));
            const SheetColumn = state.find((SheetColumn) => SheetColumn.id === action.payload.SheetColumnId);
            if (SheetColumn) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        SheetColumnpropertySet(state, action) {
            const SheetColumn = state.find((SheetColumn) => SheetColumn.id === action.payload.SheetColumnId);
            if (SheetColumn) {
                //  SheetColumn[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { SheetColumnAdded, SheetColumnValueToggled, SheetColumnpropertySet } = SheetColumnSlice.actions;
export default SheetColumnSlice.reducer;
//# sourceMappingURL=SheetColumnReducer.js.map