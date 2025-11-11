import { createSlice } from "@reduxjs/toolkit";
const SpaceMemberSlice = createSlice({
    name: "SpaceMembers",
    initialState: [],
    reducers: {
        SpaceMemberAdded(state, action) {
            state.push(action.payload);
        },
        SpaceMemberValueToggled(state, action) {
            console.log("SpaceMember TOGGLE");
            console.warn(JSON.stringify(action));
            const SpaceMember = state.find((SpaceMember) => SpaceMember.id === action.payload.SpaceMemberId);
            if (SpaceMember) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        SpaceMemberpropertySet(state, action) {
            const SpaceMember = state.find((SpaceMember) => SpaceMember.id === action.payload.SpaceMemberId);
            if (SpaceMember) {
                //  SpaceMember[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { SpaceMemberAdded, SpaceMemberValueToggled, SpaceMemberpropertySet } = SpaceMemberSlice.actions;
export default SpaceMemberSlice.reducer;
//# sourceMappingURL=SpaceMemberReducer.js.map