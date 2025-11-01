import { createSlice } from "@reduxjs/toolkit";

import { FileDownloadToken } from '@thor/model/FileDownloadToken';

const FileDownloadTokenSlice = createSlice({
  name: "FileDownloadTokens",
  initialState: [],

  reducers: {
    FileDownloadTokenAdded(state, action) {
      state.push(action.payload);
    },

    FileDownloadTokenValueToggled(state, action) {
      console.log("FileDownloadToken TOGGLE")
      console.warn(JSON.stringify(action))
      const FileDownloadToken:FileDownloadToken = state.find((FileDownloadToken) => FileDownloadToken.id === action.payload.FileDownloadTokenId);
      if (FileDownloadToken) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    FileDownloadTokenpropertySet(state, action) {
      const FileDownloadToken = state.find((FileDownloadToken) => FileDownloadToken.id === action.payload.FileDownloadTokenId);
      if (FileDownloadToken) {
      //  FileDownloadToken[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  FileDownloadTokenAdded,
  FileDownloadTokenValueToggled,
  FileDownloadTokenpropertySet
} = FileDownloadTokenSlice.actions;
export default FileDownloadTokenSlice.reducer;
