import { createSlice } from "@reduxjs/toolkit";
const StrategicPrioritySlice = createSlice({
    name: "StrategicPrioritys",
    initialState: [],
    reducers: {
        StrategicPriorityAdded(state, action) {
            state.push(action.payload);
        },
        StrategicPriorityValueToggled(state, action) {
            console.log("StrategicPriority TOGGLE");
            console.warn(JSON.stringify(action));
            const StrategicPriority = state.find((StrategicPriority) => StrategicPriority.id === action.payload.StrategicPriorityId);
            if (StrategicPriority) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        StrategicPrioritypropertySet(state, action) {
            const StrategicPriority = state.find((StrategicPriority) => StrategicPriority.id === action.payload.StrategicPriorityId);
            if (StrategicPriority) {
                //  StrategicPriority[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { StrategicPriorityAdded, StrategicPriorityValueToggled, StrategicPrioritypropertySet } = StrategicPrioritySlice.actions;
export default StrategicPrioritySlice.reducer;
//# sourceMappingURL=StrategicPriorityReducer.js.map