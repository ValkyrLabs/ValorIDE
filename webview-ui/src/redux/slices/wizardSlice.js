import { createSlice } from "@reduxjs/toolkit";
const initialState = {
    currentStep: 1,
    specSource: null,
    selectedBundles: [],
    consolidatedSpec: "",
    conflicts: [],
    generationOptions: {
        targetLanguages: ["typescript", "java"],
        generator: "spring",
    },
    jobId: null,
    jobStatus: null,
    progress: 0,
};
export const wizardSlice = createSlice({
    name: "wizard",
    initialState,
    reducers: {
        setSpecSource: (state, action) => {
            state.specSource = action.payload;
        },
        selectBundles: (state, action) => {
            state.selectedBundles = action.payload;
        },
        setConsolidatedSpec: (state, action) => {
            state.consolidatedSpec = action.payload;
        },
        setConflicts: (state, action) => {
            state.conflicts = action.payload;
        },
        setJobId: (state, action) => {
            state.jobId = action.payload;
        },
        updateJobStatus: (state, action) => {
            state.jobStatus = action.payload.status;
            state.progress = action.payload.progress;
        },
        nextStep: (state) => {
            if (state.currentStep < 5)
                state.currentStep++;
        },
        prevStep: (state) => {
            if (state.currentStep > 1)
                state.currentStep--;
        },
        reset: () => initialState,
    },
});
export const wizardActions = wizardSlice.actions;
export const selectWizardState = (state) => state.wizard;
export default wizardSlice.reducer;
//# sourceMappingURL=wizardSlice.js.map