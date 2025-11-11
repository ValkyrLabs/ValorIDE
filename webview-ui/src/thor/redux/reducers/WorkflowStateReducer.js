import { createSlice } from "@reduxjs/toolkit";
const WorkflowStateSlice = createSlice({
    name: "WorkflowStates",
    initialState: [],
    reducers: {
        WorkflowStateAdded(state, action) {
            state.push(action.payload);
        },
        WorkflowStateValueToggled(state, action) {
            console.log("WorkflowState TOGGLE");
            console.warn(JSON.stringify(action));
            const WorkflowState = state.find((WorkflowState) => WorkflowState.id === action.payload.WorkflowStateId);
            if (WorkflowState) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        WorkflowStatepropertySet(state, action) {
            const WorkflowState = state.find((WorkflowState) => WorkflowState.id === action.payload.WorkflowStateId);
            if (WorkflowState) {
                //  WorkflowState[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { WorkflowStateAdded, WorkflowStateValueToggled, WorkflowStatepropertySet } = WorkflowStateSlice.actions;
export default WorkflowStateSlice.reducer;
//# sourceMappingURL=WorkflowStateReducer.js.map