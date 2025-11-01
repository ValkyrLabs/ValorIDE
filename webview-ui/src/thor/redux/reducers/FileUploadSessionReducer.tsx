import { createSlice } from "@reduxjs/toolkit";

import { FileUploadSession } from '@thor/model/FileUploadSession';

const FileUploadSessionSlice = createSlice({
  name: "FileUploadSessions",
  initialState: [],

  reducers: {
    FileUploadSessionAdded(state, action) {
      state.push(action.payload);
    },

    FileUploadSessionValueToggled(state, action) {
      console.log("FileUploadSession TOGGLE")
      console.warn(JSON.stringify(action))
      const FileUploadSession:FileUploadSession = state.find((FileUploadSession) => FileUploadSession.id === action.payload.FileUploadSessionId);
      if (FileUploadSession) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    FileUploadSessionpropertySet(state, action) {
      const FileUploadSession = state.find((FileUploadSession) => FileUploadSession.id === action.payload.FileUploadSessionId);
      if (FileUploadSession) {
      //  FileUploadSession[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  FileUploadSessionAdded,
  FileUploadSessionValueToggled,
  FileUploadSessionpropertySet
} = FileUploadSessionSlice.actions;
export default FileUploadSessionSlice.reducer;
