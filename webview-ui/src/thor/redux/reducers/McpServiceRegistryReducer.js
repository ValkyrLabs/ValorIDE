import { createSlice } from "@reduxjs/toolkit";
const McpServiceRegistrySlice = createSlice({
    name: "McpServiceRegistrys",
    initialState: [],
    reducers: {
        McpServiceRegistryAdded(state, action) {
            state.push(action.payload);
        },
        McpServiceRegistryValueToggled(state, action) {
            console.log("McpServiceRegistry TOGGLE");
            console.warn(JSON.stringify(action));
            const McpServiceRegistry = state.find((McpServiceRegistry) => McpServiceRegistry.id === action.payload.McpServiceRegistryId);
            if (McpServiceRegistry) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        McpServiceRegistrypropertySet(state, action) {
            const McpServiceRegistry = state.find((McpServiceRegistry) => McpServiceRegistry.id === action.payload.McpServiceRegistryId);
            if (McpServiceRegistry) {
                //  McpServiceRegistry[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { McpServiceRegistryAdded, McpServiceRegistryValueToggled, McpServiceRegistrypropertySet, } = McpServiceRegistrySlice.actions;
export default McpServiceRegistrySlice.reducer;
//# sourceMappingURL=McpServiceRegistryReducer.js.map