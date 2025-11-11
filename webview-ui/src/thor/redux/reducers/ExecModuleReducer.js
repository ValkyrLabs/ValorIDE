import { createSlice } from "@reduxjs/toolkit";
const ExecModuleSlice = createSlice({
    name: "ExecModules",
    initialState: [],
    reducers: {
        ExecModuleAdded(state, action) {
            state.push(action.payload);
        },
        ExecModuleValueToggled(state, action) {
            console.log("ExecModule TOGGLE");
            console.warn(JSON.stringify(action));
            const ExecModule = state.find((ExecModule) => ExecModule.id === action.payload.ExecModuleId);
            if (ExecModule) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        ExecModulepropertySet(state, action) {
            const ExecModule = state.find((ExecModule) => ExecModule.id === action.payload.ExecModuleId);
            if (ExecModule) {
                //  ExecModule[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { ExecModuleAdded, ExecModuleValueToggled, ExecModulepropertySet } = ExecModuleSlice.actions;
export default ExecModuleSlice.reducer;
//# sourceMappingURL=ExecModuleReducer.js.map