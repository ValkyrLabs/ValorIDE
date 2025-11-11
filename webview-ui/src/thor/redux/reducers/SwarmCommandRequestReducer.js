import { createSlice } from "@reduxjs/toolkit";
const SwarmCommandRequestSlice = createSlice({
    name: "SwarmCommandRequests",
    initialState: [],
    reducers: {
        SwarmCommandRequestAdded(state, action) {
            state.push(action.payload);
        },
        SwarmCommandRequestValueToggled(state, action) {
            console.log("SwarmCommandRequest TOGGLE");
            console.warn(JSON.stringify(action));
            const SwarmCommandRequest = state.find((SwarmCommandRequest) => SwarmCommandRequest.id === action.payload.SwarmCommandRequestId);
            if (SwarmCommandRequest) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        SwarmCommandRequestpropertySet(state, action) {
            const SwarmCommandRequest = state.find((SwarmCommandRequest) => SwarmCommandRequest.id === action.payload.SwarmCommandRequestId);
            if (SwarmCommandRequest) {
                //  SwarmCommandRequest[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { SwarmCommandRequestAdded, SwarmCommandRequestValueToggled, SwarmCommandRequestpropertySet } = SwarmCommandRequestSlice.actions;
export default SwarmCommandRequestSlice.reducer;
//# sourceMappingURL=SwarmCommandRequestReducer.js.map