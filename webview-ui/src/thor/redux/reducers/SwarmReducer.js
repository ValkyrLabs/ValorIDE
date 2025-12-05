import { createSlice } from "@reduxjs/toolkit";
const SwarmSlice = createSlice({
    name: "Swarms",
    initialState: [],
    reducers: {
        SwarmAdded(state, action) {
            state.push(action.payload);
        },
        SwarmValueToggled(state, action) {
            console.log("Swarm TOGGLE");
            console.warn(JSON.stringify(action));
            const Swarm = state.find((Swarm) => Swarm.id === action.payload.SwarmId);
            if (Swarm) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        SwarmpropertySet(state, action) {
            const Swarm = state.find((Swarm) => Swarm.id === action.payload.SwarmId);
            if (Swarm) {
                //  Swarm[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { SwarmAdded, SwarmValueToggled, SwarmpropertySet } = SwarmSlice.actions;
export default SwarmSlice.reducer;
//# sourceMappingURL=SwarmReducer.js.map