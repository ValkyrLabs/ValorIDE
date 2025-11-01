import { createApi } from '@reduxjs/toolkit/query/react'
import { Budget } from '@thor/model/Budget'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type BudgetResponse = Budget[]

export const BudgetService = createApi({
  reducerPath: 'Budget', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['Budget'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getBudgetsPaged: build.query<BudgetResponse, { page: number; size?: number; example?: Partial<Budget> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `Budget?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Budget' as const, id })),
              { type: 'Budget', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getBudgets: build.query<BudgetResponse, { example?: Partial<Budget> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `Budget?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `Budget`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Budget' as const, id })),
              { type: 'Budget', id: 'LIST' },
            ]
          : [{ type: 'Budget', id: 'LIST' }],
    }),

    // 3) Create
    addBudget: build.mutation<Budget, Partial<Budget>>({
      query: (body) => ({
        url: `Budget`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Budget', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getBudget: build.query<Budget, string>({
      query: (id) => `Budget/${id}`,
      providesTags: (result, error, id) => [{ type: 'Budget', id }],
    }),

    // 5) Update
    updateBudget: build.mutation<void, Pick<Budget, 'id'> & Partial<Budget>>({
      query: ({ id, ...patch }) => ({
        url: `Budget/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            BudgetService.util.updateQueryData('getBudget', id, (draft) => {
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
        { type: 'Budget', id },
        { type: 'Budget', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteBudget: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `Budget/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'Budget', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetBudgetsPagedQuery`
export const {
  useGetBudgetsPagedQuery,     // immediate fetch
  useLazyGetBudgetsPagedQuery, // lazy fetch
  useGetBudgetQuery,
  useGetBudgetsQuery,
  useAddBudgetMutation,
  useUpdateBudgetMutation,
  useDeleteBudgetMutation,
} = BudgetService
