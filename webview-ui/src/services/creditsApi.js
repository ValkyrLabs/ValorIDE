/**
 * Credits API Service for ValorIDE
 *
 * Unified credit management system that mirrors ValkyrAI's dashboard.
 * Single source of truth: /v1/credits/{accountId}/balance
 *
 * Balance Calculation: currentBalance = sum(payments.credits) - sum(usage.credits)
 * This server-side computation ensures consistency across all clients.
 */
import { createApi } from "@reduxjs/toolkit/query/react";
import customBaseQuery from "@/thor/redux/customBaseQuery";
import { v4 as uuidv4 } from "uuid";
// RTK Query API - matches ValkyrAI's creditsApi pattern
export const creditsApi = createApi({
  reducerPath: "creditsApi",
  baseQuery: customBaseQuery,
  tagTypes: ["AccountBalance", "Credits"],
  endpoints: (builder) => ({
    /**
     * GET /v1/credits/{accountId}/balance
     * This is the SOURCE OF TRUTH for credit balance
     * Returns AccountBalance with computed currentBalance from payments - usage
     */
    getAccountBalance: builder.query({
      query: (accountId) => `credits/${accountId}/balance`,
      providesTags: (result, error, accountId) => [
        { type: "AccountBalance", id: accountId },
        { type: "Credits", id: "BALANCE" },
      ],
    }),
    /**
     * POST /v1/credits/{accountId}/usage
     * Record a usage transaction (debit)
     */
    recordUsageTransaction: builder.mutation({
      query: ({ accountId, usage, idempotencyKey }) => ({
        url: `credits/${accountId}/usage`,
        method: "POST",
        body: usage,
        headers: {
          "Idempotency-Key": idempotencyKey || uuidv4(),
        },
      }),
      invalidatesTags: (result, error, { accountId }) => [
        { type: "AccountBalance", id: accountId },
        { type: "Credits", id: "BALANCE" },
      ],
    }),
    /**
     * POST /v1/credits/{accountId}/payment
     * Record a payment transaction (credit)
     */
    recordPaymentTransaction: builder.mutation({
      query: ({ accountId, payment, idempotencyKey }) => ({
        url: `credits/${accountId}/payment`,
        method: "POST",
        body: payment,
        headers: {
          "Idempotency-Key": idempotencyKey || uuidv4(),
        },
      }),
      invalidatesTags: (result, error, { accountId }) => [
        { type: "AccountBalance", id: accountId },
        { type: "Credits", id: "BALANCE" },
      ],
    }),
  }),
});
// Export hooks
export const {
  useGetAccountBalanceQuery,
  useLazyGetAccountBalanceQuery,
  useRecordUsageTransactionMutation,
  useRecordPaymentTransactionMutation,
} = creditsApi;
/**
 * Error Response Type Guard
 * Safely checks if an error is a structured ErrorResponse from the API
 * @param error - Any error object
 * @returns true if error has expected ErrorResponse structure
 */
export const isErrorResponse = (error) => {
  return error?.data?.error !== undefined;
};
/**
 * Extract human-readable error message
 * Prioritizes explicit message over error code
 * @param error - Any error object
 * @returns Formatted error message string
 */
export const getErrorMessage = (error) => {
  if (isErrorResponse(error)) {
    return error.data.message || error.data.error;
  }
  return "An unexpected error occurred";
};
/**
 * Check if error indicates insufficient credit balance
 * Detects multiple indicator patterns to handle different error formats
 * @param error - Any error object
 * @returns true if error is due to insufficient funds
 */
export const isInsufficientFunds = (error) => {
  if (isErrorResponse(error)) {
    return (
      error.data.error === "INSUFFICIENT_FUNDS" ||
      error.data.insufficientFunds === true ||
      (error.data.message?.toLowerCase().includes("insufficient") ?? false)
    );
  }
  return false;
};
/**
 * Extract balance information from error response
 * Useful for displaying current vs required balance in UI
 * @param error - Any error object
 * @returns Object with current and required balance, or null if not present
 */
export const getBalanceFromError = (error) => {
  if (isErrorResponse(error)) {
    if (error.data.currentBalance !== undefined) {
      return {
        current: error.data.currentBalance,
        required: error.data.requiredBalance || 0,
      };
    }
  }
  return null;
};
//# sourceMappingURL=creditsApi.js.map
