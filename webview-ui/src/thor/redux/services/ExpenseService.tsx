import { createApi } from '@reduxjs/toolkit/query/react'
import { Expense } from '@thor/model/Expense'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type ExpenseResponse = Expense[]

export const ExpenseService = createApi({
  reducerPath: 'Expense', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['Expense'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getExpensesPaged: build.query<ExpenseResponse, { page: number; size?: number; example?: Partial<Expense> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `Expense?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Expense' as const, id })),
              { type: 'Expense', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getExpenses: build.query<ExpenseResponse, { example?: Partial<Expense> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `Expense?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `Expense`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Expense' as const, id })),
              { type: 'Expense', id: 'LIST' },
            ]
          : [{ type: 'Expense', id: 'LIST' }],
    }),

    // 3) Create
    addExpense: build.mutation<Expense, Partial<Expense>>({
      query: (body) => ({
        url: `Expense`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Expense', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getExpense: build.query<Expense, string>({
      query: (id) => `Expense/${id}`,
      providesTags: (result, error, id) => [{ type: 'Expense', id }],
    }),

    // 5) Update
    updateExpense: build.mutation<void, Pick<Expense, 'id'> & Partial<Expense>>({
      query: ({ id, ...patch }) => ({
        url: `Expense/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            ExpenseService.util.updateQueryData('getExpense', id, (draft) => {
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
        { type: 'Expense', id },
        { type: 'Expense', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteExpense: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `Expense/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'Expense', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetExpensesPagedQuery`
export const {
  useGetExpensesPagedQuery,     // immediate fetch
  useLazyGetExpensesPagedQuery, // lazy fetch
  useGetExpenseQuery,
  useGetExpensesQuery,
  useAddExpenseMutation,
  useUpdateExpenseMutation,
  useDeleteExpenseMutation,
} = ExpenseService
