import { createSlice } from "@reduxjs/toolkit";

import { CompleteUploadRequest } from "@thor/model/CompleteUploadRequest";

const CompleteUploadRequestSlice = createSlice({
  name: "CompleteUploadRequests",
  initialState: [],

  reducers: {
    CompleteUploadRequestAdded(state, action) {
      state.push(action.payload);
    },

    CompleteUploadRequestValueToggled(state, action) {
      console.log("CompleteUploadRequest TOGGLE");
      console.warn(JSON.stringify(action));
      const CompleteUploadRequest: CompleteUploadRequest = state.find(
        (CompleteUploadRequest) =>
          CompleteUploadRequest.id === action.payload.CompleteUploadRequestId,
      );
      if (CompleteUploadRequest) {
        if (action.payload.target === "SOMETHING") {
        }
      }
    },

    CompleteUploadRequestpropertySet(state, action) {
      const CompleteUploadRequest = state.find(
        (CompleteUploadRequest) =>
          CompleteUploadRequest.id === action.payload.CompleteUploadRequestId,
      );
      if (CompleteUploadRequest) {
        //  CompleteUploadRequest[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  CompleteUploadRequestAdded,
  CompleteUploadRequestValueToggled,
  CompleteUploadRequestpropertySet,
} = CompleteUploadRequestSlice.actions;
export default CompleteUploadRequestSlice.reducer;
