import { createSlice } from "@reduxjs/toolkit";
const InvokeMcpToolRequestSlice = createSlice({
    name: "InvokeMcpToolRequests",
    initialState: [],
    reducers: {
        InvokeMcpToolRequestAdded(state, action) {
            state.push(action.payload);
        },
        InvokeMcpToolRequestValueToggled(state, action) {
            console.log("InvokeMcpToolRequest TOGGLE");
            console.warn(JSON.stringify(action));
            const InvokeMcpToolRequest = state.find((InvokeMcpToolRequest) => InvokeMcpToolRequest.id === action.payload.InvokeMcpToolRequestId);
            if (InvokeMcpToolRequest) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        InvokeMcpToolRequestpropertySet(state, action) {
            const InvokeMcpToolRequest = state.find((InvokeMcpToolRequest) => InvokeMcpToolRequest.id === action.payload.InvokeMcpToolRequestId);
            if (InvokeMcpToolRequest) {
                //  InvokeMcpToolRequest[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { InvokeMcpToolRequestAdded, InvokeMcpToolRequestValueToggled, InvokeMcpToolRequestpropertySet, } = InvokeMcpToolRequestSlice.actions;
export default InvokeMcpToolRequestSlice.reducer;
//# sourceMappingURL=InvokeMcpToolRequestReducer.js.map