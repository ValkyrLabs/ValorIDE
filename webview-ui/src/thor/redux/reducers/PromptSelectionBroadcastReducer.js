import { createSlice } from "@reduxjs/toolkit";
const PromptSelectionBroadcastSlice = createSlice({
    name: "PromptSelectionBroadcasts",
    initialState: [],
    reducers: {
        PromptSelectionBroadcastAdded(state, action) {
            state.push(action.payload);
        },
        PromptSelectionBroadcastValueToggled(state, action) {
            console.log("PromptSelectionBroadcast TOGGLE");
            console.warn(JSON.stringify(action));
            const PromptSelectionBroadcast = state.find((PromptSelectionBroadcast) => PromptSelectionBroadcast.id ===
                action.payload.PromptSelectionBroadcastId);
            if (PromptSelectionBroadcast) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        PromptSelectionBroadcastpropertySet(state, action) {
            const PromptSelectionBroadcast = state.find((PromptSelectionBroadcast) => PromptSelectionBroadcast.id ===
                action.payload.PromptSelectionBroadcastId);
            if (PromptSelectionBroadcast) {
                //  PromptSelectionBroadcast[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { PromptSelectionBroadcastAdded, PromptSelectionBroadcastValueToggled, PromptSelectionBroadcastpropertySet, } = PromptSelectionBroadcastSlice.actions;
export default PromptSelectionBroadcastSlice.reducer;
//# sourceMappingURL=PromptSelectionBroadcastReducer.js.map