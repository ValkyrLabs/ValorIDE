import { createSlice } from "@reduxjs/toolkit";
const ApplicationSlice = createSlice({
    name: "Applications",
    initialState: [],
    reducers: {
        ApplicationAdded(state, action) {
            state.push(action.payload);
        },
        ApplicationValueToggled(state, action) {
            console.log("Application TOGGLE");
            console.warn(JSON.stringify(action));
            const Application = state.find((Application) => Application.id === action.payload.ApplicationId);
            if (Application) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        ApplicationpropertySet(state, action) {
            const Application = state.find((Application) => Application.id === action.payload.ApplicationId);
            if (Application) {
                //  Application[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { ApplicationAdded, ApplicationValueToggled, ApplicationpropertySet } = ApplicationSlice.actions;
export default ApplicationSlice.reducer;
//# sourceMappingURL=ApplicationReducer.js.map