import { createSlice } from "@reduxjs/toolkit";

import { JobMetadata } from "@thor/model/JobMetadata";

const JobMetadataSlice = createSlice({
  name: "JobMetadatas",
  initialState: [],

  reducers: {
    JobMetadataAdded(state, action) {
      state.push(action.payload);
    },

    JobMetadataValueToggled(state, action) {
      console.log("JobMetadata TOGGLE");
      console.warn(JSON.stringify(action));
      const JobMetadata: JobMetadata = state.find(
        (JobMetadata) => JobMetadata.id === action.payload.JobMetadataId,
      );
      if (JobMetadata) {
        if (action.payload.target === "SOMETHING") {
        }
      }
    },

    JobMetadatapropertySet(state, action) {
      const JobMetadata = state.find(
        (JobMetadata) => JobMetadata.id === action.payload.JobMetadataId,
      );
      if (JobMetadata) {
        //  JobMetadata[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  JobMetadataAdded,
  JobMetadataValueToggled,
  JobMetadatapropertySet,
} = JobMetadataSlice.actions;
export default JobMetadataSlice.reducer;
