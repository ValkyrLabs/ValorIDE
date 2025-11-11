import { createSlice } from "@reduxjs/toolkit";
const McpResourceResponseSlice = createSlice({
    name: "McpResourceResponses",
    initialState: [],
    reducers: {
        McpResourceResponseAdded(state, action) {
            state.push(action.payload);
        },
        McpResourceResponseValueToggled(state, action) {
            console.log("McpResourceResponse TOGGLE");
            console.warn(JSON.stringify(action));
            const McpResourceResponse = state.find((McpResourceResponse) => McpResourceResponse.id === action.payload.McpResourceResponseId);
            if (McpResourceResponse) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        McpResourceResponsepropertySet(state, action) {
            const McpResourceResponse = state.find((McpResourceResponse) => McpResourceResponse.id === action.payload.McpResourceResponseId);
            if (McpResourceResponse) {
                //  McpResourceResponse[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { McpResourceResponseAdded, McpResourceResponseValueToggled, McpResourceResponsepropertySet } = McpResourceResponseSlice.actions;
export default McpResourceResponseSlice.reducer;
//# sourceMappingURL=McpResourceResponseReducer.js.map