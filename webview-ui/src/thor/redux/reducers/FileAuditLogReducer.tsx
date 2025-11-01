import { createSlice } from "@reduxjs/toolkit";

import { FileAuditLog } from '@thor/model/FileAuditLog';

const FileAuditLogSlice = createSlice({
  name: "FileAuditLogs",
  initialState: [],

  reducers: {
    FileAuditLogAdded(state, action) {
      state.push(action.payload);
    },

    FileAuditLogValueToggled(state, action) {
      console.log("FileAuditLog TOGGLE")
      console.warn(JSON.stringify(action))
      const FileAuditLog:FileAuditLog = state.find((FileAuditLog) => FileAuditLog.id === action.payload.FileAuditLogId);
      if (FileAuditLog) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    FileAuditLogpropertySet(state, action) {
      const FileAuditLog = state.find((FileAuditLog) => FileAuditLog.id === action.payload.FileAuditLogId);
      if (FileAuditLog) {
      //  FileAuditLog[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  FileAuditLogAdded,
  FileAuditLogValueToggled,
  FileAuditLogpropertySet
} = FileAuditLogSlice.actions;
export default FileAuditLogSlice.reducer;
