import { createSlice } from "@reduxjs/toolkit";
const CompleteUploadRequestPartsInnerSlice = createSlice({
    name: "CompleteUploadRequestPartsInners",
    initialState: [],
    reducers: {
        CompleteUploadRequestPartsInnerAdded(state, action) {
            state.push(action.payload);
        },
        CompleteUploadRequestPartsInnerValueToggled(state, action) {
            console.log("CompleteUploadRequestPartsInner TOGGLE");
            console.warn(JSON.stringify(action));
            const CompleteUploadRequestPartsInner = state.find((CompleteUploadRequestPartsInner) => CompleteUploadRequestPartsInner.id ===
                action.payload.CompleteUploadRequestPartsInnerId);
            if (CompleteUploadRequestPartsInner) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        CompleteUploadRequestPartsInnerpropertySet(state, action) {
            const CompleteUploadRequestPartsInner = state.find((CompleteUploadRequestPartsInner) => CompleteUploadRequestPartsInner.id ===
                action.payload.CompleteUploadRequestPartsInnerId);
            if (CompleteUploadRequestPartsInner) {
                //  CompleteUploadRequestPartsInner[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { CompleteUploadRequestPartsInnerAdded, CompleteUploadRequestPartsInnerValueToggled, CompleteUploadRequestPartsInnerpropertySet, } = CompleteUploadRequestPartsInnerSlice.actions;
export default CompleteUploadRequestPartsInnerSlice.reducer;
//# sourceMappingURL=CompleteUploadRequestPartsInnerReducer.js.map