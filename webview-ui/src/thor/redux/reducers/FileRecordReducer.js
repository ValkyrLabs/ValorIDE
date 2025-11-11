import { createSlice } from "@reduxjs/toolkit";
const FileRecordSlice = createSlice({
    name: "FileRecords",
    initialState: [],
    reducers: {
        FileRecordAdded(state, action) {
            state.push(action.payload);
        },
        FileRecordValueToggled(state, action) {
            console.log("FileRecord TOGGLE");
            console.warn(JSON.stringify(action));
            const FileRecord = state.find((FileRecord) => FileRecord.id === action.payload.FileRecordId);
            if (FileRecord) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        FileRecordpropertySet(state, action) {
            const FileRecord = state.find((FileRecord) => FileRecord.id === action.payload.FileRecordId);
            if (FileRecord) {
                //  FileRecord[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { FileRecordAdded, FileRecordValueToggled, FileRecordpropertySet } = FileRecordSlice.actions;
export default FileRecordSlice.reducer;
//# sourceMappingURL=FileRecordReducer.js.map