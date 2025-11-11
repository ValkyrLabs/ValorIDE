import { createSlice } from "@reduxjs/toolkit";
const DiscardDeadLetterEntryResponseSlice = createSlice({
    name: "DiscardDeadLetterEntryResponses",
    initialState: [],
    reducers: {
        DiscardDeadLetterEntryResponseAdded(state, action) {
            state.push(action.payload);
        },
        DiscardDeadLetterEntryResponseValueToggled(state, action) {
            console.log("DiscardDeadLetterEntryResponse TOGGLE");
            console.warn(JSON.stringify(action));
            const DiscardDeadLetterEntryResponse = state.find((DiscardDeadLetterEntryResponse) => DiscardDeadLetterEntryResponse.id === action.payload.DiscardDeadLetterEntryResponseId);
            if (DiscardDeadLetterEntryResponse) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        DiscardDeadLetterEntryResponsepropertySet(state, action) {
            const DiscardDeadLetterEntryResponse = state.find((DiscardDeadLetterEntryResponse) => DiscardDeadLetterEntryResponse.id === action.payload.DiscardDeadLetterEntryResponseId);
            if (DiscardDeadLetterEntryResponse) {
                //  DiscardDeadLetterEntryResponse[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { DiscardDeadLetterEntryResponseAdded, DiscardDeadLetterEntryResponseValueToggled, DiscardDeadLetterEntryResponsepropertySet } = DiscardDeadLetterEntryResponseSlice.actions;
export default DiscardDeadLetterEntryResponseSlice.reducer;
//# sourceMappingURL=DiscardDeadLetterEntryResponseReducer.js.map