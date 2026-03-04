import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface WizardState {
  currentStep: number;
  specSource: "upload" | "existing" | "bundles" | null;
  selectedBundles: string[];
  consolidatedSpec: string;
  conflicts: any[];
  generationOptions: {
    targetLanguages: string[];
    generator: string;
  };
  jobId: string | null;
  jobStatus: "queued" | "processing" | "completed" | "failed" | null;
  progress: number;
}

const initialState: WizardState = {
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
    setSpecSource: (
      state,
      action: PayloadAction<"upload" | "existing" | "bundles">,
    ) => {
      state.specSource = action.payload;
    },
    selectBundles: (state, action: PayloadAction<string[]>) => {
      state.selectedBundles = action.payload;
    },
    setConsolidatedSpec: (state, action: PayloadAction<string>) => {
      state.consolidatedSpec = action.payload;
    },
    setConflicts: (state, action: PayloadAction<any[]>) => {
      state.conflicts = action.payload;
    },
    setJobId: (state, action: PayloadAction<string>) => {
      state.jobId = action.payload;
    },
    updateJobStatus: (
      state,
      action: PayloadAction<{ status: any; progress: number }>,
    ) => {
      state.jobStatus = action.payload.status;
      state.progress = action.payload.progress;
    },
    nextStep: (state) => {
      if (state.currentStep < 5) state.currentStep++;
    },
    prevStep: (state) => {
      if (state.currentStep > 1) state.currentStep--;
    },
    reset: () => initialState,
  },
});

export const wizardActions = wizardSlice.actions;
export const selectWizardState = (state: any) => state.wizard;
export default wizardSlice.reducer;
