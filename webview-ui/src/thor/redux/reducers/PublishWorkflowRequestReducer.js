import { createSlice } from "@reduxjs/toolkit";
const PublishWorkflowRequestSlice = createSlice({
    name: "PublishWorkflowRequests",
    initialState: [],
    reducers: {
        PublishWorkflowRequestAdded(state, action) {
            state.push(action.payload);
        },
        PublishWorkflowRequestValueToggled(state, action) {
            console.log("PublishWorkflowRequest TOGGLE");
            console.warn(JSON.stringify(action));
            const PublishWorkflowRequest = state.find((PublishWorkflowRequest) => PublishWorkflowRequest.id === action.payload.PublishWorkflowRequestId);
            if (PublishWorkflowRequest) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        PublishWorkflowRequestpropertySet(state, action) {
            const PublishWorkflowRequest = state.find((PublishWorkflowRequest) => PublishWorkflowRequest.id === action.payload.PublishWorkflowRequestId);
            if (PublishWorkflowRequest) {
                //  PublishWorkflowRequest[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { PublishWorkflowRequestAdded, PublishWorkflowRequestValueToggled, PublishWorkflowRequestpropertySet, } = PublishWorkflowRequestSlice.actions;
export default PublishWorkflowRequestSlice.reducer;
//# sourceMappingURL=PublishWorkflowRequestReducer.js.map