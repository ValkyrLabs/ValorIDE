import { createSlice } from "@reduxjs/toolkit";
const SwarmGraphEdgeSlice = createSlice({
    name: "SwarmGraphEdges",
    initialState: [],
    reducers: {
        SwarmGraphEdgeAdded(state, action) {
            state.push(action.payload);
        },
        SwarmGraphEdgeValueToggled(state, action) {
            console.log("SwarmGraphEdge TOGGLE");
            console.warn(JSON.stringify(action));
            const SwarmGraphEdge = state.find((SwarmGraphEdge) => SwarmGraphEdge.id === action.payload.SwarmGraphEdgeId);
            if (SwarmGraphEdge) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        SwarmGraphEdgepropertySet(state, action) {
            const SwarmGraphEdge = state.find((SwarmGraphEdge) => SwarmGraphEdge.id === action.payload.SwarmGraphEdgeId);
            if (SwarmGraphEdge) {
                //  SwarmGraphEdge[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { SwarmGraphEdgeAdded, SwarmGraphEdgeValueToggled, SwarmGraphEdgepropertySet } = SwarmGraphEdgeSlice.actions;
export default SwarmGraphEdgeSlice.reducer;
//# sourceMappingURL=SwarmGraphEdgeReducer.js.map