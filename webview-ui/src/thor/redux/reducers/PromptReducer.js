import { createSlice } from "@reduxjs/toolkit";
const PromptSlice = createSlice({
    name: "Prompts",
    initialState: [],
    reducers: {
        PromptAdded(state, action) {
            state.push(action.payload);
        },
        PromptValueToggled(state, action) {
            console.log("Prompt TOGGLE");
            console.warn(JSON.stringify(action));
            const Prompt = state.find((Prompt) => Prompt.id === action.payload.PromptId);
            if (Prompt) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        PromptpropertySet(state, action) {
            const Prompt = state.find((Prompt) => Prompt.id === action.payload.PromptId);
            if (Prompt) {
                //  Prompt[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { PromptAdded, PromptValueToggled, PromptpropertySet } = PromptSlice.actions;
export default PromptSlice.reducer;
//# sourceMappingURL=PromptReducer.js.map