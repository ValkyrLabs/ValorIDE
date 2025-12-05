import { createSlice } from "@reduxjs/toolkit";
const PublishRestEndpointRequestSlice = createSlice({
    name: "PublishRestEndpointRequests",
    initialState: [],
    reducers: {
        PublishRestEndpointRequestAdded(state, action) {
            state.push(action.payload);
        },
        PublishRestEndpointRequestValueToggled(state, action) {
            console.log("PublishRestEndpointRequest TOGGLE");
            console.warn(JSON.stringify(action));
            const PublishRestEndpointRequest = state.find((PublishRestEndpointRequest) => PublishRestEndpointRequest.id ===
                action.payload.PublishRestEndpointRequestId);
            if (PublishRestEndpointRequest) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        PublishRestEndpointRequestpropertySet(state, action) {
            const PublishRestEndpointRequest = state.find((PublishRestEndpointRequest) => PublishRestEndpointRequest.id ===
                action.payload.PublishRestEndpointRequestId);
            if (PublishRestEndpointRequest) {
                //  PublishRestEndpointRequest[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { PublishRestEndpointRequestAdded, PublishRestEndpointRequestValueToggled, PublishRestEndpointRequestpropertySet, } = PublishRestEndpointRequestSlice.actions;
export default PublishRestEndpointRequestSlice.reducer;
//# sourceMappingURL=PublishRestEndpointRequestReducer.js.map