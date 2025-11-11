import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const ExpenseService = createApi({
    reducerPath: 'Expense', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['Expense'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getExpensesPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `Expense?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'Expense', id })),
                    { type: 'Expense', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getExpenses: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `Expense?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `Expense`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'Expense', id })),
                    { type: 'Expense', id: 'LIST' },
                ]
                : [{ type: 'Expense', id: 'LIST' }],
        }),
        // 3) Create
        addExpense: build.mutation({
            query: (body) => ({
                url: `Expense`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'Expense', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getExpense: build.query({
            query: (id) => `Expense/${id}`,
            providesTags: (result, error, id) => [{ type: 'Expense', id }],
        }),
        // 5) Update
        updateExpense: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `Expense/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(ExpenseService.util.updateQueryData('getExpense', id, (draft) => {
                        Object.assign(draft, patch);
                    }));
                    try {
                        await queryFulfilled;
                    }
                    catch {
                        patchResult.undo();
                    }
                }
            },
            invalidatesTags: (result, error, { id }) => [
                { type: 'Expense', id },
                { type: 'Expense', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteExpense: build.mutation({
            query(id) {
                return {
                    url: `Expense/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'Expense', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetExpensesPagedQuery`
export const { useGetExpensesPagedQuery, // immediate fetch
useLazyGetExpensesPagedQuery, // lazy fetch
useGetExpenseQuery, useGetExpensesQuery, useAddExpenseMutation, useUpdateExpenseMutation, useDeleteExpenseMutation, } = ExpenseService;
//# sourceMappingURL=ExpenseService.js.map