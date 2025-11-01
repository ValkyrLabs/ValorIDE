import { createSlice } from "@reduxjs/toolkit";

import { FileProcessingJob } from '@thor/model/FileProcessingJob';

const FileProcessingJobSlice = createSlice({
  name: "FileProcessingJobs",
  initialState: [],

  reducers: {
    FileProcessingJobAdded(state, action) {
      state.push(action.payload);
    },

    FileProcessingJobValueToggled(state, action) {
      console.log("FileProcessingJob TOGGLE")
      console.warn(JSON.stringify(action))
      const FileProcessingJob:FileProcessingJob = state.find((FileProcessingJob) => FileProcessingJob.id === action.payload.FileProcessingJobId);
      if (FileProcessingJob) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    FileProcessingJobpropertySet(state, action) {
      const FileProcessingJob = state.find((FileProcessingJob) => FileProcessingJob.id === action.payload.FileProcessingJobId);
      if (FileProcessingJob) {
      //  FileProcessingJob[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  FileProcessingJobAdded,
  FileProcessingJobValueToggled,
  FileProcessingJobpropertySet
} = FileProcessingJobSlice.actions;
export default FileProcessingJobSlice.reducer;
