import { createSlice } from "@reduxjs/toolkit";
const ReactionSlice = createSlice({
    name: "Reactions",
    initialState: [],
    reducers: {
        ReactionAdded(state, action) {
            state.push(action.payload);
        },
        ReactionValueToggled(state, action) {
            console.log("Reaction TOGGLE");
            console.warn(JSON.stringify(action));
            const Reaction = state.find((Reaction) => Reaction.id === action.payload.ReactionId);
            if (Reaction) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        ReactionpropertySet(state, action) {
            const Reaction = state.find((Reaction) => Reaction.id === action.payload.ReactionId);
            if (Reaction) {
                //  Reaction[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { ReactionAdded, ReactionValueToggled, ReactionpropertySet } = ReactionSlice.actions;
export default ReactionSlice.reducer;
//# sourceMappingURL=ReactionReducer.js.map