import { createSlice } from "@reduxjs/toolkit";
const FileMetadataSlice = createSlice({
    name: "FileMetadatas",
    initialState: [],
    reducers: {
        FileMetadataAdded(state, action) {
            state.push(action.payload);
        },
        FileMetadataValueToggled(state, action) {
            console.log("FileMetadata TOGGLE");
            console.warn(JSON.stringify(action));
            const FileMetadata = state.find((FileMetadata) => FileMetadata.id === action.payload.FileMetadataId);
            if (FileMetadata) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        FileMetadatapropertySet(state, action) {
            const FileMetadata = state.find((FileMetadata) => FileMetadata.id === action.payload.FileMetadataId);
            if (FileMetadata) {
                //  FileMetadata[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { FileMetadataAdded, FileMetadataValueToggled, FileMetadatapropertySet, } = FileMetadataSlice.actions;
export default FileMetadataSlice.reducer;
//# sourceMappingURL=FileMetadataReducer.js.map