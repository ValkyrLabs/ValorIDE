import { createSlice } from "@reduxjs/toolkit";
const AgentSlice = createSlice({
    name: "Agents",
    initialState: [],
    reducers: {
        AgentAdded(state, action) {
            state.push(action.payload);
        },
        AgentValueToggled(state, action) {
            console.log("Agent TOGGLE");
            console.warn(JSON.stringify(action));
            const Agent = state.find((Agent) => Agent.id === action.payload.AgentId);
            if (Agent) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        AgentpropertySet(state, action) {
            const Agent = state.find((Agent) => Agent.id === action.payload.AgentId);
            if (Agent) {
                //  Agent[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { AgentAdded, AgentValueToggled, AgentpropertySet } = AgentSlice.actions;
export default AgentSlice.reducer;
//# sourceMappingURL=AgentReducer.js.map