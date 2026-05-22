import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { CreditIntent } from "../../types/creditIntent";

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
  creditIntent?: CreditIntent;
}

const initialState: ApiErrorsState = {
  lastError: null,
  showAccountBalance: false,
  creditIntent: undefined,
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
      action: PayloadAction<{
        error: ApiErrorPayload;
        creditIntent?: CreditIntent;
      }>,
    ) => {
      state.lastError = action.payload.error;
      state.showAccountBalance = true;
      state.creditIntent = action.payload.creditIntent;
    },
    clearLastError: (state) => {
      state.lastError = null;
    },
    clearAccountBalancePrompt: (state) => {
      state.showAccountBalance = false;
    },
    clearCreditIntent: (state) => {
      state.creditIntent = undefined;
    },
  },
});

export const {
  apiErrorReceived,
  insufficientCreditsDetected,
  clearLastError,
  clearAccountBalancePrompt,
  clearCreditIntent,
} = apiErrorsSlice.actions;

export default apiErrorsSlice.reducer;
