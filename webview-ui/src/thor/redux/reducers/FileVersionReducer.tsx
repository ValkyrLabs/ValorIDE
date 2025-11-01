import { createSlice } from "@reduxjs/toolkit";

import { FileVersion } from '@thor/model/FileVersion';

const FileVersionSlice = createSlice({
  name: "FileVersions",
  initialState: [],

  reducers: {
    FileVersionAdded(state, action) {
      state.push(action.payload);
    },

    FileVersionValueToggled(state, action) {
      console.log("FileVersion TOGGLE")
      console.warn(JSON.stringify(action))
      const FileVersion:FileVersion = state.find((FileVersion) => FileVersion.id === action.payload.FileVersionId);
      if (FileVersion) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    FileVersionpropertySet(state, action) {
      const FileVersion = state.find((FileVersion) => FileVersion.id === action.payload.FileVersionId);
      if (FileVersion) {
      //  FileVersion[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  FileVersionAdded,
  FileVersionValueToggled,
  FileVersionpropertySet
} = FileVersionSlice.actions;
export default FileVersionSlice.reducer;
