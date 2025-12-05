import { createSlice } from "@reduxjs/toolkit";
const PresignRequestSlice = createSlice({
    name: "PresignRequests",
    initialState: [],
    reducers: {
        PresignRequestAdded(state, action) {
            state.push(action.payload);
        },
        PresignRequestValueToggled(state, action) {
            console.log("PresignRequest TOGGLE");
            console.warn(JSON.stringify(action));
            const PresignRequest = state.find((PresignRequest) => PresignRequest.id === action.payload.PresignRequestId);
            if (PresignRequest) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        PresignRequestpropertySet(state, action) {
            const PresignRequest = state.find((PresignRequest) => PresignRequest.id === action.payload.PresignRequestId);
            if (PresignRequest) {
                //  PresignRequest[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { PresignRequestAdded, PresignRequestValueToggled, PresignRequestpropertySet, } = PresignRequestSlice.actions;
export default PresignRequestSlice.reducer;
//# sourceMappingURL=PresignRequestReducer.js.map