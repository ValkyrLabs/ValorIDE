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
import customBaseQuery from "../redux/customBaseQuery";
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
  customerId?: string;
  currentBalance: number;
  payments: PaymentTransaction[];
  paymentTransactions?: PaymentTransaction[];
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

export interface CreateCartOrderLineArgs {
  productId?: string;
  sku?: string;
  quantity?: number;
  lineItemAmount?: number;
  type?: string;
}

export interface CreateCartOrderArgs {
  subtotalAmount?: number;
  totalAmount?: number;
  taxAmount?: number;
  lineItems: CreateCartOrderLineArgs[];
}

export interface CreateCartOrderResponse {
  id?: string;
  orderId?: string;
  lineItemCount?: number;
  error?: string;
  [key: string]: any;
}

export interface CreateCheckoutSessionArgs {
  orderId: string;
  successUrl: string;
  cancelUrl: string;
  currency?: string;
  mode?: "payment" | "subscription";
  idempotencyKey?: string;
  amountCents?: never;
  itemName?: never;
  productType?: never;
  sku?: never;
  termMonths?: never;
  creditsAmountCents?: never;
}

export interface CreateCheckoutSessionResponse {
  session_id?: string;
  checkout_url?: string;
  checkoutUrl?: string;
  url?: string;
  error?: string;
  [key: string]: any;
}

export const VALORIDE_CREDIT_PACKAGE = {
  sku: "prod_ThB4xwTOkam2P3",
  dollars: 5,
  credits: 500,
} as const;

export const normalizeCreditCheckoutDollars = (dollars: number): number => {
  if (!Number.isFinite(dollars)) {
    return VALORIDE_CREDIT_PACKAGE.dollars;
  }
  return Math.max(
    VALORIDE_CREDIT_PACKAGE.dollars,
    Math.round(dollars / VALORIDE_CREDIT_PACKAGE.dollars) *
      VALORIDE_CREDIT_PACKAGE.dollars,
  );
};

export const buildValorIdeCreditCartOrder = (
  dollars: number,
): CreateCartOrderArgs => {
  const normalizedDollars = normalizeCreditCheckoutDollars(dollars);
  return {
    lineItems: [
      {
        sku: VALORIDE_CREDIT_PACKAGE.sku,
        quantity: normalizedDollars / VALORIDE_CREDIT_PACKAGE.dollars,
        type: "product",
      },
    ],
  };
};

export const buildValorIdeCheckoutUrls = () => ({
  successUrl:
    "https://valkyrlabs.com/checkout/success?session_id={CHECKOUT_SESSION_ID}&source=valoride",
  cancelUrl: "https://valkyrlabs.com/cart?source=valoride",
});

export const getCheckoutUrl = (
  payload: CreateCheckoutSessionResponse,
): string | undefined => {
  const url = payload.checkout_url ?? payload.checkoutUrl ?? payload.url;
  return typeof url === "string" && url.trim() ? url.trim() : undefined;
};

const finiteNumber = (...values: unknown[]): number | undefined => {
  for (const value of values) {
    const numeric =
      typeof value === "number"
        ? value
        : typeof value === "string" && value.trim()
          ? Number(value)
          : Number.NaN;
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }
  return undefined;
};

const normalizeCredits = (value: unknown): number => finiteNumber(value) ?? 0;

const firstArray = (source: Record<string, any>, ...keys: string[]): any[] => {
  for (const key of keys) {
    const value = source[key];
    if (Array.isArray(value)) {
      return value;
    }
    if (Array.isArray(value?.content)) {
      return value.content;
    }
    if (Array.isArray(value?.items)) {
      return value.items;
    }
    if (Array.isArray(value?.results)) {
      return value.results;
    }
    if (Array.isArray(value?.data)) {
      return value.data;
    }
  }
  return [];
};

const normalizeUsageRows = (
  source: Record<string, any>,
): UsageTransaction[] => {
  const directRows = firstArray(
    source,
    "usageTransactions",
    "usage",
    "usageHistory",
    "usage_history",
  );
  if (directRows.length) {
    return directRows;
  }

  return firstArray(source, "creditDebitReceipts", "receipts").map(
    (receipt) => ({
      ...(receipt?.usageTransaction ?? receipt),
      id: receipt?.usageTransaction?.id ?? receipt?.id ?? receipt?.receiptRef,
      spentAt:
        receipt?.usageTransaction?.spentAt ??
        receipt?.spentAt ??
        receipt?.createdAt ??
        receipt?.createdDate,
      credits:
        receipt?.usageTransaction?.credits ??
        receipt?.credits ??
        receipt?.amountCredits,
      description:
        receipt?.description ??
        receipt?.actionType ??
        receipt?.actionRef ??
        receipt?.receiptRef,
    }),
  );
};

export const normalizeAccountBalance = (payload: any): AccountBalance => {
  const source = payload?.data ?? payload?.accountBalance ?? payload ?? {};
  const payments = firstArray(
    source,
    "payments",
    "paymentTransactions",
    "paymentHistory",
    "payment_history",
  );
  const usageTransactions = normalizeUsageRows(source);
  const derivedBalance =
    payments.reduce(
      (sum: number, payment: PaymentTransaction) =>
        sum + normalizeCredits((payment as any).credits),
      0,
    ) -
    usageTransactions.reduce(
      (sum: number, usage: UsageTransaction) =>
        sum +
        normalizeCredits((usage as any).credits ?? (usage as any).meteredUnits),
      0,
    );
  const explicitBalance = finiteNumber(
    source.currentBalance,
    source.current_balance,
    source.balance,
    source.availableCredits,
    source.creditBalance,
    source.credits,
  );

  return {
    ...source,
    customerId:
      source.customerId ??
      source.customer_id ??
      source.accountId ??
      source.account_id ??
      source.billingAccountId ??
      source.creditAccountId ??
      source.customer?.id ??
      source.account?.id,
    currentBalance:
      explicitBalance !== undefined &&
      !(explicitBalance === 0 && derivedBalance !== 0)
        ? explicitBalance
        : derivedBalance,
    payments,
    paymentTransactions: payments,
    usageTransactions,
  };
};

const getCustomerId = (payload: unknown): string | undefined => {
  const value = (payload as any)?.data ?? payload;
  const customerId =
    value?.customerId ??
    value?.customer_id ??
    value?.accountId ??
    value?.account_id ??
    value?.billingAccountId ??
    value?.creditAccountId ??
    value?.customer?.id ??
    value?.account?.id ??
    value?.id;
  return typeof customerId === "string" && customerId.trim()
    ? customerId.trim()
    : undefined;
};

const hasQueryError = (
  result: unknown,
): result is {
  error: { status?: number | string; data?: unknown; error?: string };
} => Boolean((result as any)?.error);

const getQueryData = (result: unknown): unknown => (result as any)?.data;

const shouldSurfaceQueryError = (error: {
  status?: number | string;
}): boolean =>
  error.status === 401 ||
  error.status === 403 ||
  error.status === "FETCH_ERROR" ||
  error.status === "TIMEOUT_ERROR" ||
  error.status === "PARSING_ERROR";

const getLedgerRowCount = (balance?: AccountBalance): number =>
  (balance?.payments?.length ?? balance?.paymentTransactions?.length ?? 0) +
  (balance?.usageTransactions?.length ?? 0);

const hasLedgerRows = (balance?: AccountBalance): boolean =>
  getLedgerRowCount(balance) > 0;

const uniqueStrings = (values: Array<string | undefined>): string[] =>
  Array.from(
    new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  );

export const getAccountBalancePath = (accountId: string): string =>
  accountId === "me"
    ? "credits/me/balance"
    : `credits/${encodeURIComponent(accountId)}/balance`;

export const getAccountBalanceSummaryPath = (accountId: string): string =>
  accountId === "me"
    ? "credits/me/balance/summary"
    : `credits/${encodeURIComponent(accountId)}/balance/summary`;

export const resolvePrimaryBalanceAccountId = (
  accountId: string,
  summaryAccountId?: string,
): string => (accountId === "me" ? summaryAccountId || "me" : accountId);

export const resolveBalanceLookupAccountIds = (
  accountId: string,
  summaryAccountId?: string,
): string[] =>
  uniqueStrings([
    accountId,
    summaryAccountId,
    accountId === "me" ? undefined : "me",
  ]);

const exampleQuery = (example: Record<string, unknown>): string =>
  `example=${encodeURIComponent(JSON.stringify(example))}`;

const normalizeBalanceList = (payload: unknown): AccountBalance[] => {
  const source = (payload as any)?.data ?? payload;
  const rows = Array.isArray(source)
    ? source
    : Array.isArray((source as any)?.content)
      ? (source as any).content
      : Array.isArray((source as any)?.items)
        ? (source as any).items
        : Array.isArray((source as any)?.results)
          ? (source as any).results
          : [];
  return rows.map(normalizeAccountBalance);
};

export const chooseBestBalance = (
  candidates: Array<AccountBalance | undefined>,
): AccountBalance | undefined =>
  candidates
    .filter((candidate): candidate is AccountBalance => Boolean(candidate))
    .sort((a, b) => {
      const score = (candidate: AccountBalance) =>
        getLedgerRowCount(candidate) * 10 +
        (candidate.currentBalance !== 0 ? 1 : 0);

      return score(b) - score(a);
    })[0];

export const mergeAccountBalance = (
  summaryBalance?: AccountBalance,
  balance?: AccountBalance,
): AccountBalance | undefined => {
  if (!summaryBalance) {
    return balance;
  }
  if (!balance) {
    return summaryBalance;
  }

  const shouldUseBalanceValue =
    balance.currentBalance !== 0 ||
    summaryBalance.currentBalance === 0 ||
    hasLedgerRows(balance);

  return {
    ...balance,
    customerId: balance.customerId || summaryBalance.customerId,
    currentBalance: shouldUseBalanceValue
      ? balance.currentBalance
      : summaryBalance.currentBalance,
  };
};

export const selectSyncedAccountBalance = ({
  authoritativeCandidates,
  fallbackCandidates,
  summaryBalance,
}: {
  authoritativeCandidates: AccountBalance[];
  fallbackCandidates: AccountBalance[];
  summaryBalance?: AccountBalance;
}): AccountBalance | undefined => {
  const authoritativeBalance = chooseBestBalance(authoritativeCandidates);
  if (summaryBalance) {
    return {
      ...(authoritativeBalance || summaryBalance),
      customerId: authoritativeBalance?.customerId || summaryBalance.customerId,
      currentBalance: summaryBalance.currentBalance,
      payments: authoritativeBalance?.payments || summaryBalance.payments,
      paymentTransactions:
        authoritativeBalance?.paymentTransactions ||
        summaryBalance.paymentTransactions,
      usageTransactions:
        authoritativeBalance?.usageTransactions ||
        summaryBalance.usageTransactions,
    };
  }

  if (authoritativeBalance) {
    return authoritativeBalance;
  }

  return chooseBestBalance(fallbackCandidates);
};

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
    "Checkout",
  ],
  endpoints: (builder) => ({
    createCartOrder: builder.mutation<
      CreateCartOrderResponse,
      CreateCartOrderArgs
    >({
      query: (body) => ({
        url: "checkout/cart-order",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      }),
      invalidatesTags: [],
    }),

    createCheckoutSession: builder.mutation<
      CreateCheckoutSessionResponse,
      CreateCheckoutSessionArgs
    >({
      query: ({
        orderId,
        successUrl,
        cancelUrl,
        currency,
        mode,
        idempotencyKey,
      }) => {
        const body: Record<string, string> = {
          orderId,
          successUrl,
          cancelUrl,
        };
        if (currency) {
          body.currency = currency;
        }
        if (mode) {
          body.mode = mode;
        }

        return {
          url: "checkout/create-session",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
          },
          body,
        };
      },
      invalidatesTags: [{ type: "Checkout", id: "SESSION" }],
    }),

    /**
     * GET /v1/credits/{accountId}/balance
     * This is the SOURCE OF TRUTH for credit balance
     * Returns AccountBalance with computed currentBalance from payments - usage
     */
    getAccountBalance: builder.query<AccountBalance, string>({
      async queryFn(accountId, _api, _extraOptions, baseQuery) {
        let blockingError:
          | { status?: number | string; data?: unknown; error?: string }
          | undefined;
        const requestBalance = async (path: string) => {
          const result = await baseQuery(path);
          if (hasQueryError(result)) {
            if (shouldSurfaceQueryError(result.error)) {
              blockingError ??= result.error;
            }
            return undefined;
          }
          return getQueryData(result);
        };

        const summaryPayloads = [
          await requestBalance(getAccountBalanceSummaryPath(accountId)),
        ];
        const summaryBalances = summaryPayloads.flatMap((payload) =>
          Array.isArray((payload as any)?.data) ||
          Array.isArray(payload) ||
          Array.isArray((payload as any)?.content) ||
          Array.isArray((payload as any)?.items)
            ? normalizeBalanceList(payload)
            : payload !== undefined
              ? [normalizeAccountBalance(payload)]
              : [],
        );
        const summaryBalance = chooseBestBalance(summaryBalances);
        const summaryAccountId = getCustomerId(summaryBalance);
        const primaryAccountId = resolvePrimaryBalanceAccountId(
          accountId,
          summaryAccountId,
        );
        const candidateIds = resolveBalanceLookupAccountIds(
          primaryAccountId,
          summaryAccountId,
        );
        const authoritativeBalancePayloads: unknown[] = [];
        const fallbackBalancePayloads: unknown[] = [];

        for (const id of candidateIds) {
          const encoded = encodeURIComponent(id);
          const authoritativePayload = await requestBalance(
            getAccountBalancePath(id),
          );
          if (authoritativePayload) {
            authoritativeBalancePayloads.push(authoritativePayload);
          }

          const payloads = await Promise.all([
            id === "me"
              ? undefined
              : requestBalance(`AccountBalance/${encoded}`),
            id === "me"
              ? undefined
              : requestBalance(
                  `AccountBalance?${exampleQuery({ customerId: id })}`,
                ),
            id === "me"
              ? undefined
              : requestBalance(
                  `CreditBalanceSummary?${exampleQuery({ customerId: id })}`,
                ),
          ]);
          fallbackBalancePayloads.push(...payloads.filter(Boolean));
        }

        fallbackBalancePayloads.push(
          await requestBalance("AccountBalance"),
          await requestBalance("CreditBalanceSummary"),
        );
        const authoritativeCandidates = authoritativeBalancePayloads.flatMap(
          (payload) =>
            Array.isArray((payload as any)?.data) ||
            Array.isArray(payload) ||
            Array.isArray((payload as any)?.content) ||
            Array.isArray((payload as any)?.items)
              ? normalizeBalanceList(payload)
              : payload !== undefined
                ? [normalizeAccountBalance(payload)]
                : [],
        );
        const fallbackCandidates = fallbackBalancePayloads.flatMap((payload) =>
          Array.isArray((payload as any)?.data) ||
          Array.isArray(payload) ||
          Array.isArray((payload as any)?.content) ||
          Array.isArray((payload as any)?.items)
            ? normalizeBalanceList(payload)
            : payload !== undefined
              ? [normalizeAccountBalance(payload)]
              : [],
        );
        const balance = selectSyncedAccountBalance({
          authoritativeCandidates,
          fallbackCandidates,
          summaryBalance,
        });

        if (!balance && blockingError) {
          return { error: blockingError as any };
        }

        return {
          data: {
            ...balance,
            customerId: balance?.customerId || summaryAccountId,
            currentBalance: balance?.currentBalance ?? 0,
          },
        };
      },
      providesTags: (result, error, accountId) => [
        { type: "AccountBalance", id: accountId },
        { type: "AccountBalance", id: result?.customerId || "me" },
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
        url: `credits/${encodeURIComponent(accountId)}/usage`,
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
        url: `credits/${encodeURIComponent(accountId)}/payment`,
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
  useCreateCartOrderMutation,
  useCreateCheckoutSessionMutation,
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
