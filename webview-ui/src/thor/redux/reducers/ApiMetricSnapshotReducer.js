import { createSlice } from "@reduxjs/toolkit";
const ApiMetricSnapshotSlice = createSlice({
    name: "ApiMetricSnapshots",
    initialState: [],
    reducers: {
        ApiMetricSnapshotAdded(state, action) {
            state.push(action.payload);
        },
        ApiMetricSnapshotValueToggled(state, action) {
            console.log("ApiMetricSnapshot TOGGLE");
            console.warn(JSON.stringify(action));
            const ApiMetricSnapshot = state.find((ApiMetricSnapshot) => ApiMetricSnapshot.id === action.payload.ApiMetricSnapshotId);
            if (ApiMetricSnapshot) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        ApiMetricSnapshotpropertySet(state, action) {
            const ApiMetricSnapshot = state.find((ApiMetricSnapshot) => ApiMetricSnapshot.id === action.payload.ApiMetricSnapshotId);
            if (ApiMetricSnapshot) {
                //  ApiMetricSnapshot[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { ApiMetricSnapshotAdded, ApiMetricSnapshotValueToggled, ApiMetricSnapshotpropertySet } = ApiMetricSnapshotSlice.actions;
export default ApiMetricSnapshotSlice.reducer;
//# sourceMappingURL=ApiMetricSnapshotReducer.js.map