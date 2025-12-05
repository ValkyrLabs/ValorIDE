import { createSlice } from "@reduxjs/toolkit";

import { JobApplicationRequest } from "@thor/model/JobApplicationRequest";

const JobApplicationRequestSlice = createSlice({
  name: "JobApplicationRequests",
  initialState: [],

  reducers: {
    JobApplicationRequestAdded(state, action) {
      state.push(action.payload);
    },

    JobApplicationRequestValueToggled(state, action) {
      console.log("JobApplicationRequest TOGGLE");
      console.warn(JSON.stringify(action));
      const JobApplicationRequest: JobApplicationRequest = state.find(
        (JobApplicationRequest) =>
          JobApplicationRequest.id === action.payload.JobApplicationRequestId,
      );
      if (JobApplicationRequest) {
        if (action.payload.target === "SOMETHING") {
        }
      }
    },

    JobApplicationRequestpropertySet(state, action) {
      const JobApplicationRequest = state.find(
        (JobApplicationRequest) =>
          JobApplicationRequest.id === action.payload.JobApplicationRequestId,
      );
      if (JobApplicationRequest) {
        //  JobApplicationRequest[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  JobApplicationRequestAdded,
  JobApplicationRequestValueToggled,
  JobApplicationRequestpropertySet,
} = JobApplicationRequestSlice.actions;
export default JobApplicationRequestSlice.reducer;
