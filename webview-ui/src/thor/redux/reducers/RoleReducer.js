import { createSlice } from "@reduxjs/toolkit";
const RoleSlice = createSlice({
    name: "Roles",
    initialState: [],
    reducers: {
        RoleAdded(state, action) {
            state.push(action.payload);
        },
        RoleValueToggled(state, action) {
            console.log("Role TOGGLE");
            console.warn(JSON.stringify(action));
            const Role = state.find((Role) => Role.id === action.payload.RoleId);
            if (Role) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        RolepropertySet(state, action) {
            const Role = state.find((Role) => Role.id === action.payload.RoleId);
            if (Role) {
                //  Role[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { RoleAdded, RoleValueToggled, RolepropertySet } = RoleSlice.actions;
export default RoleSlice.reducer;
//# sourceMappingURL=RoleReducer.js.map