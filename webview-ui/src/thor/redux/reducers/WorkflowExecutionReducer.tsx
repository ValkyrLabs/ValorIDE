import { createSlice } from "@reduxjs/toolkit";

import { WorkflowExecution } from '@thor/model/WorkflowExecution';

const WorkflowExecutionSlice = createSlice({
  name: "WorkflowExecutions",
  initialState: [],

  reducers: {
    WorkflowExecutionAdded(state, action) {
      state.push(action.payload);
    },

    WorkflowExecutionValueToggled(state, action) {
      console.log("WorkflowExecution TOGGLE")
      console.warn(JSON.stringify(action))
      const WorkflowExecution:WorkflowExecution = state.find((WorkflowExecution) => WorkflowExecution.id === action.payload.WorkflowExecutionId);
      if (WorkflowExecution) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    WorkflowExecutionpropertySet(state, action) {
      const WorkflowExecution = state.find((WorkflowExecution) => WorkflowExecution.id === action.payload.WorkflowExecutionId);
      if (WorkflowExecution) {
      //  WorkflowExecution[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  WorkflowExecutionAdded,
  WorkflowExecutionValueToggled,
  WorkflowExecutionpropertySet
} = WorkflowExecutionSlice.actions;
export default WorkflowExecutionSlice.reducer;
