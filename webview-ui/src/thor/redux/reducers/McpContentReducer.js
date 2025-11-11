import { createSlice } from "@reduxjs/toolkit";
const McpContentSlice = createSlice({
    name: "McpContents",
    initialState: [],
    reducers: {
        McpContentAdded(state, action) {
            state.push(action.payload);
        },
        McpContentValueToggled(state, action) {
            console.log("McpContent TOGGLE");
            console.warn(JSON.stringify(action));
            const McpContent = state.find((McpContent) => McpContent.id === action.payload.McpContentId);
            if (McpContent) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        McpContentpropertySet(state, action) {
            const McpContent = state.find((McpContent) => McpContent.id === action.payload.McpContentId);
            if (McpContent) {
                //  McpContent[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { McpContentAdded, McpContentValueToggled, McpContentpropertySet } = McpContentSlice.actions;
export default McpContentSlice.reducer;
//# sourceMappingURL=McpContentReducer.js.map