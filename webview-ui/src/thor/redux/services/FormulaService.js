import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const FormulaService = createApi({
    reducerPath: 'Formula', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['Formula'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getFormulasPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `Formula?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'Formula', id })),
                    { type: 'Formula', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getFormulas: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `Formula?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `Formula`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'Formula', id })),
                    { type: 'Formula', id: 'LIST' },
                ]
                : [{ type: 'Formula', id: 'LIST' }],
        }),
        // 3) Create
        addFormula: build.mutation({
            query: (body) => ({
                url: `Formula`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'Formula', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getFormula: build.query({
            query: (id) => `Formula/${id}`,
            providesTags: (result, error, id) => [{ type: 'Formula', id }],
        }),
        // 5) Update
        updateFormula: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `Formula/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(FormulaService.util.updateQueryData('getFormula', id, (draft) => {
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
                { type: 'Formula', id },
                { type: 'Formula', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteFormula: build.mutation({
            query(id) {
                return {
                    url: `Formula/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'Formula', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetFormulasPagedQuery`
export const { useGetFormulasPagedQuery, // immediate fetch
useLazyGetFormulasPagedQuery, // lazy fetch
useGetFormulaQuery, useGetFormulasQuery, useAddFormulaMutation, useUpdateFormulaMutation, useDeleteFormulaMutation, } = FormulaService;
//# sourceMappingURL=FormulaService.js.map