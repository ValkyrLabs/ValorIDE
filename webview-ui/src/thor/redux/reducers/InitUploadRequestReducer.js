import { createSlice } from "@reduxjs/toolkit";
const InitUploadRequestSlice = createSlice({
    name: "InitUploadRequests",
    initialState: [],
    reducers: {
        InitUploadRequestAdded(state, action) {
            state.push(action.payload);
        },
        InitUploadRequestValueToggled(state, action) {
            console.log("InitUploadRequest TOGGLE");
            console.warn(JSON.stringify(action));
            const InitUploadRequest = state.find((InitUploadRequest) => InitUploadRequest.id === action.payload.InitUploadRequestId);
            if (InitUploadRequest) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        InitUploadRequestpropertySet(state, action) {
            const InitUploadRequest = state.find((InitUploadRequest) => InitUploadRequest.id === action.payload.InitUploadRequestId);
            if (InitUploadRequest) {
                //  InitUploadRequest[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { InitUploadRequestAdded, InitUploadRequestValueToggled, InitUploadRequestpropertySet, } = InitUploadRequestSlice.actions;
export default InitUploadRequestSlice.reducer;
//# sourceMappingURL=InitUploadRequestReducer.js.map