import { createSlice } from "@reduxjs/toolkit";
const CircuitBreakerStateSlice = createSlice({
    name: "CircuitBreakerStates",
    initialState: [],
    reducers: {
        CircuitBreakerStateAdded(state, action) {
            state.push(action.payload);
        },
        CircuitBreakerStateValueToggled(state, action) {
            console.log("CircuitBreakerState TOGGLE");
            console.warn(JSON.stringify(action));
            const CircuitBreakerState = state.find((CircuitBreakerState) => CircuitBreakerState.id === action.payload.CircuitBreakerStateId);
            if (CircuitBreakerState) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        CircuitBreakerStatepropertySet(state, action) {
            const CircuitBreakerState = state.find((CircuitBreakerState) => CircuitBreakerState.id === action.payload.CircuitBreakerStateId);
            if (CircuitBreakerState) {
                //  CircuitBreakerState[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { CircuitBreakerStateAdded, CircuitBreakerStateValueToggled, CircuitBreakerStatepropertySet } = CircuitBreakerStateSlice.actions;
export default CircuitBreakerStateSlice.reducer;
//# sourceMappingURL=CircuitBreakerStateReducer.js.map