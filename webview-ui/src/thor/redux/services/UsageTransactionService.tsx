import { createApi } from '@reduxjs/toolkit/query/react'
import { UsageTransaction } from '@thor/model/UsageTransaction'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type UsageTransactionResponse = UsageTransaction[]

export const UsageTransactionService = createApi({
  reducerPath: 'UsageTransaction', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['UsageTransaction'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getUsageTransactionsPaged: build.query<UsageTransactionResponse, { page: number; size?: number; example?: Partial<UsageTransaction> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `UsageTransaction?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'UsageTransaction' as const, id })),
              { type: 'UsageTransaction', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getUsageTransactions: build.query<UsageTransactionResponse, { example?: Partial<UsageTransaction> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `UsageTransaction?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `UsageTransaction`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'UsageTransaction' as const, id })),
              { type: 'UsageTransaction', id: 'LIST' },
            ]
          : [{ type: 'UsageTransaction', id: 'LIST' }],
    }),

    // 3) Create
    addUsageTransaction: build.mutation<UsageTransaction, Partial<UsageTransaction>>({
      query: (body) => ({
        url: `UsageTransaction`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'UsageTransaction', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getUsageTransaction: build.query<UsageTransaction, string>({
      query: (id) => `UsageTransaction/${id}`,
      providesTags: (result, error, id) => [{ type: 'UsageTransaction', id }],
    }),

    // 5) Update
    updateUsageTransaction: build.mutation<void, Pick<UsageTransaction, 'id'> & Partial<UsageTransaction>>({
      query: ({ id, ...patch }) => ({
        url: `UsageTransaction/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            UsageTransactionService.util.updateQueryData('getUsageTransaction', id, (draft) => {
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
        { type: 'UsageTransaction', id },
        { type: 'UsageTransaction', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteUsageTransaction: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `UsageTransaction/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'UsageTransaction', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetUsageTransactionsPagedQuery`
export const {
  useGetUsageTransactionsPagedQuery,     // immediate fetch
  useLazyGetUsageTransactionsPagedQuery, // lazy fetch
  useGetUsageTransactionQuery,
  useGetUsageTransactionsQuery,
  useAddUsageTransactionMutation,
  useUpdateUsageTransactionMutation,
  useDeleteUsageTransactionMutation,
} = UsageTransactionService
