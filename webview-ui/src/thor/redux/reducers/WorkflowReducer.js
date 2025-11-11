import { createSlice } from "@reduxjs/toolkit";
const WorkflowSlice = createSlice({
    name: "Workflows",
    initialState: [],
    reducers: {
        WorkflowAdded(state, action) {
            state.push(action.payload);
        },
        WorkflowValueToggled(state, action) {
            console.log("Workflow TOGGLE");
            console.warn(JSON.stringify(action));
            const Workflow = state.find((Workflow) => Workflow.id === action.payload.WorkflowId);
            if (Workflow) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        WorkflowpropertySet(state, action) {
            const Workflow = state.find((Workflow) => Workflow.id === action.payload.WorkflowId);
            if (Workflow) {
                //  Workflow[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { WorkflowAdded, WorkflowValueToggled, WorkflowpropertySet } = WorkflowSlice.actions;
export default WorkflowSlice.reducer;
//# sourceMappingURL=WorkflowReducer.js.map