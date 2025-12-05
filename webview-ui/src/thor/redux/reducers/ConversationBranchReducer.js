import { createSlice } from "@reduxjs/toolkit";
const ConversationBranchSlice = createSlice({
    name: "ConversationBranchs",
    initialState: [],
    reducers: {
        ConversationBranchAdded(state, action) {
            state.push(action.payload);
        },
        ConversationBranchValueToggled(state, action) {
            console.log("ConversationBranch TOGGLE");
            console.warn(JSON.stringify(action));
            const ConversationBranch = state.find((ConversationBranch) => ConversationBranch.id === action.payload.ConversationBranchId);
            if (ConversationBranch) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        ConversationBranchpropertySet(state, action) {
            const ConversationBranch = state.find((ConversationBranch) => ConversationBranch.id === action.payload.ConversationBranchId);
            if (ConversationBranch) {
                //  ConversationBranch[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { ConversationBranchAdded, ConversationBranchValueToggled, ConversationBranchpropertySet, } = ConversationBranchSlice.actions;
export default ConversationBranchSlice.reducer;
//# sourceMappingURL=ConversationBranchReducer.js.map