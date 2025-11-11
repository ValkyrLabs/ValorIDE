import { createSlice } from "@reduxjs/toolkit";
const SwarmUnregisterResponseSlice = createSlice({
    name: "SwarmUnregisterResponses",
    initialState: [],
    reducers: {
        SwarmUnregisterResponseAdded(state, action) {
            state.push(action.payload);
        },
        SwarmUnregisterResponseValueToggled(state, action) {
            console.log("SwarmUnregisterResponse TOGGLE");
            console.warn(JSON.stringify(action));
            const SwarmUnregisterResponse = state.find((SwarmUnregisterResponse) => SwarmUnregisterResponse.id === action.payload.SwarmUnregisterResponseId);
            if (SwarmUnregisterResponse) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        SwarmUnregisterResponsepropertySet(state, action) {
            const SwarmUnregisterResponse = state.find((SwarmUnregisterResponse) => SwarmUnregisterResponse.id === action.payload.SwarmUnregisterResponseId);
            if (SwarmUnregisterResponse) {
                //  SwarmUnregisterResponse[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { SwarmUnregisterResponseAdded, SwarmUnregisterResponseValueToggled, SwarmUnregisterResponsepropertySet } = SwarmUnregisterResponseSlice.actions;
export default SwarmUnregisterResponseSlice.reducer;
//# sourceMappingURL=SwarmUnregisterResponseReducer.js.map