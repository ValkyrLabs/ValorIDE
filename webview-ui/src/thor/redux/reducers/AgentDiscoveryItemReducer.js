import { createSlice } from "@reduxjs/toolkit";
const AgentDiscoveryItemSlice = createSlice({
    name: "AgentDiscoveryItems",
    initialState: [],
    reducers: {
        AgentDiscoveryItemAdded(state, action) {
            state.push(action.payload);
        },
        AgentDiscoveryItemValueToggled(state, action) {
            console.log("AgentDiscoveryItem TOGGLE");
            console.warn(JSON.stringify(action));
            const AgentDiscoveryItem = state.find((AgentDiscoveryItem) => AgentDiscoveryItem.id === action.payload.AgentDiscoveryItemId);
            if (AgentDiscoveryItem) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        AgentDiscoveryItempropertySet(state, action) {
            const AgentDiscoveryItem = state.find((AgentDiscoveryItem) => AgentDiscoveryItem.id === action.payload.AgentDiscoveryItemId);
            if (AgentDiscoveryItem) {
                //  AgentDiscoveryItem[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { AgentDiscoveryItemAdded, AgentDiscoveryItemValueToggled, AgentDiscoveryItempropertySet, } = AgentDiscoveryItemSlice.actions;
export default AgentDiscoveryItemSlice.reducer;
//# sourceMappingURL=AgentDiscoveryItemReducer.js.map