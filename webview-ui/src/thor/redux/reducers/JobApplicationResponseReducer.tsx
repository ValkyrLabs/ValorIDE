import { createSlice } from "@reduxjs/toolkit";

import { JobApplicationResponse } from "@thor/model/JobApplicationResponse";

const JobApplicationResponseSlice = createSlice({
  name: "JobApplicationResponses",
  initialState: [],

  reducers: {
    JobApplicationResponseAdded(state, action) {
      state.push(action.payload);
    },

    JobApplicationResponseValueToggled(state, action) {
      console.log("JobApplicationResponse TOGGLE");
      console.warn(JSON.stringify(action));
      const JobApplicationResponse: JobApplicationResponse = state.find(
        (JobApplicationResponse) =>
          JobApplicationResponse.id === action.payload.JobApplicationResponseId,
      );
      if (JobApplicationResponse) {
        if (action.payload.target === "SOMETHING") {
        }
      }
    },

    JobApplicationResponsepropertySet(state, action) {
      const JobApplicationResponse = state.find(
        (JobApplicationResponse) =>
          JobApplicationResponse.id === action.payload.JobApplicationResponseId,
      );
      if (JobApplicationResponse) {
        //  JobApplicationResponse[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  JobApplicationResponseAdded,
  JobApplicationResponseValueToggled,
  JobApplicationResponsepropertySet,
} = JobApplicationResponseSlice.actions;
export default JobApplicationResponseSlice.reducer;
