import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const SalesActivityService = createApi({
    reducerPath: 'SalesActivity', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['SalesActivity'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getSalesActivitysPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `SalesActivity?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'SalesActivity', id })),
                    { type: 'SalesActivity', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getSalesActivitys: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `SalesActivity?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `SalesActivity`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'SalesActivity', id })),
                    { type: 'SalesActivity', id: 'LIST' },
                ]
                : [{ type: 'SalesActivity', id: 'LIST' }],
        }),
        // 3) Create
        addSalesActivity: build.mutation({
            query: (body) => ({
                url: `SalesActivity`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'SalesActivity', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getSalesActivity: build.query({
            query: (id) => `SalesActivity/${id}`,
            providesTags: (result, error, id) => [{ type: 'SalesActivity', id }],
        }),
        // 5) Update
        updateSalesActivity: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `SalesActivity/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(SalesActivityService.util.updateQueryData('getSalesActivity', id, (draft) => {
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
                { type: 'SalesActivity', id },
                { type: 'SalesActivity', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteSalesActivity: build.mutation({
            query(id) {
                return {
                    url: `SalesActivity/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'SalesActivity', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetSalesActivitysPagedQuery`
export const { useGetSalesActivitysPagedQuery, // immediate fetch
useLazyGetSalesActivitysPagedQuery, // lazy fetch
useGetSalesActivityQuery, useGetSalesActivitysQuery, useAddSalesActivityMutation, useUpdateSalesActivityMutation, useDeleteSalesActivityMutation, } = SalesActivityService;
//# sourceMappingURL=SalesActivityService.js.map