import { createSlice } from "@reduxjs/toolkit";
const DiscardDeadLetterEntryRequestSlice = createSlice({
    name: "DiscardDeadLetterEntryRequests",
    initialState: [],
    reducers: {
        DiscardDeadLetterEntryRequestAdded(state, action) {
            state.push(action.payload);
        },
        DiscardDeadLetterEntryRequestValueToggled(state, action) {
            console.log("DiscardDeadLetterEntryRequest TOGGLE");
            console.warn(JSON.stringify(action));
            const DiscardDeadLetterEntryRequest = state.find((DiscardDeadLetterEntryRequest) => DiscardDeadLetterEntryRequest.id === action.payload.DiscardDeadLetterEntryRequestId);
            if (DiscardDeadLetterEntryRequest) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        DiscardDeadLetterEntryRequestpropertySet(state, action) {
            const DiscardDeadLetterEntryRequest = state.find((DiscardDeadLetterEntryRequest) => DiscardDeadLetterEntryRequest.id === action.payload.DiscardDeadLetterEntryRequestId);
            if (DiscardDeadLetterEntryRequest) {
                //  DiscardDeadLetterEntryRequest[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { DiscardDeadLetterEntryRequestAdded, DiscardDeadLetterEntryRequestValueToggled, DiscardDeadLetterEntryRequestpropertySet } = DiscardDeadLetterEntryRequestSlice.actions;
export default DiscardDeadLetterEntryRequestSlice.reducer;
//# sourceMappingURL=DiscardDeadLetterEntryRequestReducer.js.map