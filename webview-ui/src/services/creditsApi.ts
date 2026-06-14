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
import customBaseQuery from "@thorapi/redux/customBaseQuery";
import type {
  AppGenerationRequest,
  AppGenerationTraceResponse,
  ContextPageCompileRequest,
  ContextPageHydrateRequest,
  ContextPageRecompressRequest,
  ContextPageResponse,
  ContextPageTraverseRequest,
  CreditDebitReceipt,
  GenerationReceipt,
  SkillOptRouteReceipt,
} from "@thorapi/model";
import { v4 as uuidv4 } from "uuid";

// AccountBalance DTO - matches ValkyrAI's AccountBalanceDTO
export interface AccountBalance {
  currentBalance: number;
  payments: PaymentTransaction[];
  usageTransactions: UsageTransaction[];
}

// Usage transaction model
export interface UsageTransaction {
  id?: string;
  spentAt?: string;
  credits?: number;
  modelProvider?: string;
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  tokensTotal?: number;
  description?: string;
}

// Payment transaction model
export interface PaymentTransaction {
  id?: string;
  paidAt?: string;
  amountCents?: number;
  credits?: number;
  paymentMethod?: string;
  transactionId?: string;
  description?: string;
}

// Balance response for mutations
export interface BalanceResponse {
  id?: string;
  currentBalance?: number;
  message?: string;
}

// Error response
export interface ErrorResponse {
  error: string;
  message?: string;
  timestamp: string;
  insufficientFunds?: boolean;
  currentBalance?: number;
  requiredBalance?: number;
}

// RTK Query API - matches ValkyrAI's creditsApi pattern
export const creditsApi = createApi({
  reducerPath: "creditsApi",
  baseQuery: customBaseQuery,
  tagTypes: [
    "AccountBalance",
    "Credits",
    "Receipts",
    "AppGeneration",
    "GrayMatter",
  ],
  endpoints: (builder) => ({
    /**
     * GET /v1/credits/{accountId}/balance
     * This is the SOURCE OF TRUTH for credit balance
     * Returns AccountBalance with computed currentBalance from payments - usage
     */
    getAccountBalance: builder.query<AccountBalance, string>({
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
    recordUsageTransaction: builder.mutation<
      BalanceResponse,
      {
        accountId: string;
        usage: UsageTransaction;
        idempotencyKey?: string;
      }
    >({
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
    recordPaymentTransaction: builder.mutation<
      BalanceResponse,
      {
        accountId: string;
        payment: PaymentTransaction;
        idempotencyKey?: string;
      }
    >({
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

    getAppGenerationTrace: builder.query<AppGenerationTraceResponse, string>({
      query: (receiptRef) =>
        `app_generation_ops/traces/${encodeURIComponent(receiptRef)}`,
      providesTags: (result, error, receiptRef) => [
        { type: "Receipts", id: `app-generation-trace:${receiptRef}` },
      ],
    }),

    createAppGenerationRequest: builder.mutation<
      AppGenerationRequest,
      AppGenerationRequest
    >({
      query: (appGenerationRequest) => ({
        url: "app_generation_ops/requests",
        method: "POST",
        body: appGenerationRequest,
      }),
      invalidatesTags: (result) => [
        { type: "AppGeneration", id: result?.requestRef || "REQUEST" },
      ],
    }),

    getAppGenerationRequest: builder.query<AppGenerationRequest, string>({
      query: (requestRef) =>
        `app_generation_ops/requests/${encodeURIComponent(requestRef)}`,
      providesTags: (result, error, requestRef) => [
        { type: "AppGeneration", id: requestRef },
      ],
    }),

    runAppGenerationRequest: builder.mutation<GenerationReceipt, string>({
      query: (requestRef) => ({
        url: `app_generation_ops/requests/${encodeURIComponent(requestRef)}/run`,
        method: "POST",
      }),
      invalidatesTags: (result, error, requestRef) => [
        { type: "AppGeneration", id: requestRef },
        { type: "Receipts", id: `app-generation-trace:${result?.receiptRef}` },
      ],
    }),

    compileContextPage: builder.mutation<
      ContextPageResponse,
      ContextPageCompileRequest
    >({
      query: (contextPageCompileRequest) => ({
        url: "graymatter_ops/context_page/compile",
        method: "POST",
        body: contextPageCompileRequest,
      }),
      invalidatesTags: (result) => [
        { type: "GrayMatter", id: result?.contextPage?.pageRef || "CONTEXT" },
      ],
    }),

    getContextPage: builder.query<ContextPageResponse, string>({
      query: (contextPageRef) =>
        `graymatter_ops/context_page/${encodeURIComponent(contextPageRef)}`,
      providesTags: (result, error, contextPageRef) => [
        { type: "GrayMatter", id: contextPageRef },
      ],
    }),

    hydrateContextPage: builder.mutation<
      ContextPageResponse,
      ContextPageHydrateRequest
    >({
      query: (contextPageHydrateRequest) => ({
        url: "graymatter_ops/context_page/hydrate",
        method: "POST",
        body: contextPageHydrateRequest,
      }),
      invalidatesTags: (result) => [
        { type: "GrayMatter", id: result?.contextPage?.pageRef || "CONTEXT" },
      ],
    }),

    recompressContextPage: builder.mutation<
      ContextPageResponse,
      ContextPageRecompressRequest
    >({
      query: (contextPageRecompressRequest) => ({
        url: "graymatter_ops/context_page/recompress",
        method: "POST",
        body: contextPageRecompressRequest,
      }),
      invalidatesTags: (result) => [
        { type: "GrayMatter", id: result?.contextPage?.pageRef || "CONTEXT" },
      ],
    }),

    traverseContextPage: builder.mutation<
      ContextPageResponse,
      ContextPageTraverseRequest
    >({
      query: (contextPageTraverseRequest) => ({
        url: "graymatter_ops/context_page/traverse",
        method: "POST",
        body: contextPageTraverseRequest,
      }),
      invalidatesTags: (result) => [
        { type: "GrayMatter", id: result?.contextPage?.pageRef || "CONTEXT" },
      ],
    }),

    getSkilloptRouteReceipt: builder.query<
      SkillOptRouteReceipt,
      { accountId: string; receiptRef: string }
    >({
      query: ({ accountId, receiptRef }) =>
        `skillopt_ops/${encodeURIComponent(accountId)}/route_receipts/${encodeURIComponent(receiptRef)}`,
      providesTags: (result, error, { receiptRef }) => [
        { type: "Receipts", id: `skillopt-route:${receiptRef}` },
      ],
    }),

    listSkilloptRouteReceipts: builder.query<
      SkillOptRouteReceipt[],
      { accountId: string }
    >({
      query: ({ accountId }) =>
        `skillopt_ops/${encodeURIComponent(accountId)}/route_receipts`,
      providesTags: (result, error, { accountId }) => [
        { type: "Receipts", id: `skillopt-route-list:${accountId}` },
      ],
    }),

    getCreditDebitReceiptByReceiptRef: builder.query<
      CreditDebitReceipt,
      { accountId: string; receiptRef: string }
    >({
      query: ({ accountId, receiptRef }) =>
        `credits/${encodeURIComponent(accountId)}/credit_debit_receipts/${encodeURIComponent(receiptRef)}`,
      providesTags: (result, error, { receiptRef }) => [
        { type: "Receipts", id: `credit-debit:${receiptRef}` },
      ],
    }),

    listCreditDebitReceipts: builder.query<
      CreditDebitReceipt[],
      { accountId: string }
    >({
      query: ({ accountId }) =>
        `credits/${encodeURIComponent(accountId)}/credit_debit_receipts`,
      providesTags: (result, error, { accountId }) => [
        { type: "Receipts", id: `credit-debit-list:${accountId}` },
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
  useCreateAppGenerationRequestMutation,
  useCompileContextPageMutation,
  useGetAppGenerationRequestQuery,
  useGetAppGenerationTraceQuery,
  useGetContextPageQuery,
  useHydrateContextPageMutation,
  useRecompressContextPageMutation,
  useRunAppGenerationRequestMutation,
  useTraverseContextPageMutation,
  useGetSkilloptRouteReceiptQuery,
  useListSkilloptRouteReceiptsQuery,
  useGetCreditDebitReceiptByReceiptRefQuery,
  useListCreditDebitReceiptsQuery,
} = creditsApi;

/**
 * Error Response Type Guard
 * Safely checks if an error is a structured ErrorResponse from the API
 * @param error - Any error object
 * @returns true if error has expected ErrorResponse structure
 */
export const isErrorResponse = (
  error: any,
): error is { data: ErrorResponse } => {
  return error?.data?.error !== undefined;
};

/**
 * Extract human-readable error message
 * Prioritizes explicit message over error code
 * @param error - Any error object
 * @returns Formatted error message string
 */
export const getErrorMessage = (error: any): string => {
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
export const isInsufficientFunds = (error: any): boolean => {
  if (isErrorResponse(error)) {
    return (
      error.data.error === "INSUFFICIENT_CREDITS" ||
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
export const getBalanceFromError = (
  error: any,
): { current: number; required: number } | null => {
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
