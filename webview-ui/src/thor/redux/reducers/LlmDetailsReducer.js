import { createSlice } from "@reduxjs/toolkit";
const LlmDetailsSlice = createSlice({
    name: "LlmDetailss",
    initialState: [],
    reducers: {
        LlmDetailsAdded(state, action) {
            state.push(action.payload);
        },
        LlmDetailsValueToggled(state, action) {
            console.log("LlmDetails TOGGLE");
            console.warn(JSON.stringify(action));
            const LlmDetails = state.find((LlmDetails) => LlmDetails.id === action.payload.LlmDetailsId);
            if (LlmDetails) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        LlmDetailspropertySet(state, action) {
            const LlmDetails = state.find((LlmDetails) => LlmDetails.id === action.payload.LlmDetailsId);
            if (LlmDetails) {
                //  LlmDetails[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { LlmDetailsAdded, LlmDetailsValueToggled, LlmDetailspropertySet } = LlmDetailsSlice.actions;
export default LlmDetailsSlice.reducer;
//# sourceMappingURL=LlmDetailsReducer.js.map