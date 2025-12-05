import { createSlice } from "@reduxjs/toolkit";
const FormulaSlice = createSlice({
    name: "Formulas",
    initialState: [],
    reducers: {
        FormulaAdded(state, action) {
            state.push(action.payload);
        },
        FormulaValueToggled(state, action) {
            console.log("Formula TOGGLE");
            console.warn(JSON.stringify(action));
            const Formula = state.find((Formula) => Formula.id === action.payload.FormulaId);
            if (Formula) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        FormulapropertySet(state, action) {
            const Formula = state.find((Formula) => Formula.id === action.payload.FormulaId);
            if (Formula) {
                //  Formula[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { FormulaAdded, FormulaValueToggled, FormulapropertySet } = FormulaSlice.actions;
export default FormulaSlice.reducer;
//# sourceMappingURL=FormulaReducer.js.map