import { createApi } from '@reduxjs/toolkit/query/react'
import { PaymentTransaction } from '@thor/model/PaymentTransaction'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type PaymentTransactionResponse = PaymentTransaction[]

export const PaymentTransactionService = createApi({
  reducerPath: 'PaymentTransaction', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['PaymentTransaction'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getPaymentTransactionsPaged: build.query<PaymentTransactionResponse, { page: number; size?: number; example?: Partial<PaymentTransaction> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `PaymentTransaction?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'PaymentTransaction' as const, id })),
              { type: 'PaymentTransaction', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getPaymentTransactions: build.query<PaymentTransactionResponse, { example?: Partial<PaymentTransaction> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `PaymentTransaction?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `PaymentTransaction`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'PaymentTransaction' as const, id })),
              { type: 'PaymentTransaction', id: 'LIST' },
            ]
          : [{ type: 'PaymentTransaction', id: 'LIST' }],
    }),

    // 3) Create
    addPaymentTransaction: build.mutation<PaymentTransaction, Partial<PaymentTransaction>>({
      query: (body) => ({
        url: `PaymentTransaction`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'PaymentTransaction', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getPaymentTransaction: build.query<PaymentTransaction, string>({
      query: (id) => `PaymentTransaction/${id}`,
      providesTags: (result, error, id) => [{ type: 'PaymentTransaction', id }],
    }),

    // 5) Update
    updatePaymentTransaction: build.mutation<void, Pick<PaymentTransaction, 'id'> & Partial<PaymentTransaction>>({
      query: ({ id, ...patch }) => ({
        url: `PaymentTransaction/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            PaymentTransactionService.util.updateQueryData('getPaymentTransaction', id, (draft) => {
              Object.assign(draft, patch)
            })
          )
          try {
            await queryFulfilled
          } catch {
            patchResult.undo()
          }
        }
      },
      invalidatesTags: (result, error, { id }) => [
        { type: 'PaymentTransaction', id },
        { type: 'PaymentTransaction', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deletePaymentTransaction: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `PaymentTransaction/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'PaymentTransaction', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetPaymentTransactionsPagedQuery`
export const {
  useGetPaymentTransactionsPagedQuery,     // immediate fetch
  useLazyGetPaymentTransactionsPagedQuery, // lazy fetch
  useGetPaymentTransactionQuery,
  useGetPaymentTransactionsQuery,
  useAddPaymentTransactionMutation,
  useUpdatePaymentTransactionMutation,
  useDeletePaymentTransactionMutation,
} = PaymentTransactionService
