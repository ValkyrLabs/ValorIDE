import { createApi } from '@reduxjs/toolkit/query/react'
import { AccountBalance } from '@thor/model/AccountBalance'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type AccountBalanceResponse = AccountBalance[]

export const AccountBalanceService = createApi({
  reducerPath: 'AccountBalance', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['AccountBalance'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getAccountBalancesPaged: build.query<AccountBalanceResponse, { page: number; size?: number; example?: Partial<AccountBalance> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `AccountBalance?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'AccountBalance' as const, id })),
              { type: 'AccountBalance', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getAccountBalances: build.query<AccountBalanceResponse, { example?: Partial<AccountBalance> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `AccountBalance?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `AccountBalance`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'AccountBalance' as const, id })),
              { type: 'AccountBalance', id: 'LIST' },
            ]
          : [{ type: 'AccountBalance', id: 'LIST' }],
    }),

    // 3) Create
    addAccountBalance: build.mutation<AccountBalance, Partial<AccountBalance>>({
      query: (body) => ({
        url: `AccountBalance`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'AccountBalance', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getAccountBalance: build.query<AccountBalance, string>({
      query: (id) => `AccountBalance/${id}`,
      providesTags: (result, error, id) => [{ type: 'AccountBalance', id }],
    }),

    // 5) Update
    updateAccountBalance: build.mutation<void, Pick<AccountBalance, 'id'> & Partial<AccountBalance>>({
      query: ({ id, ...patch }) => ({
        url: `AccountBalance/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            AccountBalanceService.util.updateQueryData('getAccountBalance', id, (draft) => {
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
        { type: 'AccountBalance', id },
        { type: 'AccountBalance', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteAccountBalance: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `AccountBalance/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'AccountBalance', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetAccountBalancesPagedQuery`
export const {
  useGetAccountBalancesPagedQuery,     // immediate fetch
  useLazyGetAccountBalancesPagedQuery, // lazy fetch
  useGetAccountBalanceQuery,
  useGetAccountBalancesQuery,
  useAddAccountBalanceMutation,
  useUpdateAccountBalanceMutation,
  useDeleteAccountBalanceMutation,
} = AccountBalanceService
