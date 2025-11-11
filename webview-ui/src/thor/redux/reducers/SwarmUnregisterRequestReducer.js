import { createSlice } from "@reduxjs/toolkit";
const SwarmUnregisterRequestSlice = createSlice({
    name: "SwarmUnregisterRequests",
    initialState: [],
    reducers: {
        SwarmUnregisterRequestAdded(state, action) {
            state.push(action.payload);
        },
        SwarmUnregisterRequestValueToggled(state, action) {
            console.log("SwarmUnregisterRequest TOGGLE");
            console.warn(JSON.stringify(action));
            const SwarmUnregisterRequest = state.find((SwarmUnregisterRequest) => SwarmUnregisterRequest.id === action.payload.SwarmUnregisterRequestId);
            if (SwarmUnregisterRequest) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        SwarmUnregisterRequestpropertySet(state, action) {
            const SwarmUnregisterRequest = state.find((SwarmUnregisterRequest) => SwarmUnregisterRequest.id === action.payload.SwarmUnregisterRequestId);
            if (SwarmUnregisterRequest) {
                //  SwarmUnregisterRequest[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { SwarmUnregisterRequestAdded, SwarmUnregisterRequestValueToggled, SwarmUnregisterRequestpropertySet } = SwarmUnregisterRequestSlice.actions;
export default SwarmUnregisterRequestSlice.reducer;
//# sourceMappingURL=SwarmUnregisterRequestReducer.js.map