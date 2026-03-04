import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface ApiErrorPayload {
  id: string;
  status: number;
  endpointName?: string;
  message: string;
  data?: unknown;
}

interface ApiErrorsState {
  lastError: ApiErrorPayload | null;
  showAccountBalance: boolean;
}

const initialState: ApiErrorsState = {
  lastError: null,
  showAccountBalance: false,
};

const apiErrorsSlice = createSlice({
  name: "apiErrors",
  initialState,
  reducers: {
    apiErrorReceived: (state, action: PayloadAction<ApiErrorPayload>) => {
      state.lastError = action.payload;
    },
    insufficientCreditsDetected: (
      state,
      action: PayloadAction<ApiErrorPayload>,
    ) => {
      state.lastError = action.payload;
      state.showAccountBalance = true;
    },
    clearLastError: (state) => {
      state.lastError = null;
    },
    clearAccountBalancePrompt: (state) => {
      state.showAccountBalance = false;
    },
  },
});

export const {
  apiErrorReceived,
  insufficientCreditsDetected,
  clearLastError,
  clearAccountBalancePrompt,
} = apiErrorsSlice.actions;

export default apiErrorsSlice.reducer;
