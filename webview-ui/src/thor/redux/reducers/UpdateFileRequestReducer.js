import { createSlice } from "@reduxjs/toolkit";
const UpdateFileRequestSlice = createSlice({
    name: "UpdateFileRequests",
    initialState: [],
    reducers: {
        UpdateFileRequestAdded(state, action) {
            state.push(action.payload);
        },
        UpdateFileRequestValueToggled(state, action) {
            console.log("UpdateFileRequest TOGGLE");
            console.warn(JSON.stringify(action));
            const UpdateFileRequest = state.find((UpdateFileRequest) => UpdateFileRequest.id === action.payload.UpdateFileRequestId);
            if (UpdateFileRequest) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        UpdateFileRequestpropertySet(state, action) {
            const UpdateFileRequest = state.find((UpdateFileRequest) => UpdateFileRequest.id === action.payload.UpdateFileRequestId);
            if (UpdateFileRequest) {
                //  UpdateFileRequest[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { UpdateFileRequestAdded, UpdateFileRequestValueToggled, UpdateFileRequestpropertySet, } = UpdateFileRequestSlice.actions;
export default UpdateFileRequestSlice.reducer;
//# sourceMappingURL=UpdateFileRequestReducer.js.map