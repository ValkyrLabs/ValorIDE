import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const SalesOrderService = createApi({
    reducerPath: 'SalesOrder', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['SalesOrder'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getSalesOrdersPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `SalesOrder?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'SalesOrder', id })),
                    { type: 'SalesOrder', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getSalesOrders: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `SalesOrder?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `SalesOrder`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'SalesOrder', id })),
                    { type: 'SalesOrder', id: 'LIST' },
                ]
                : [{ type: 'SalesOrder', id: 'LIST' }],
        }),
        // 3) Create
        addSalesOrder: build.mutation({
            query: (body) => ({
                url: `SalesOrder`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'SalesOrder', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getSalesOrder: build.query({
            query: (id) => `SalesOrder/${id}`,
            providesTags: (result, error, id) => [{ type: 'SalesOrder', id }],
        }),
        // 5) Update
        updateSalesOrder: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `SalesOrder/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(SalesOrderService.util.updateQueryData('getSalesOrder', id, (draft) => {
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
                { type: 'SalesOrder', id },
                { type: 'SalesOrder', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteSalesOrder: build.mutation({
            query(id) {
                return {
                    url: `SalesOrder/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'SalesOrder', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetSalesOrdersPagedQuery`
export const { useGetSalesOrdersPagedQuery, // immediate fetch
useLazyGetSalesOrdersPagedQuery, // lazy fetch
useGetSalesOrderQuery, useGetSalesOrdersQuery, useAddSalesOrderMutation, useUpdateSalesOrderMutation, useDeleteSalesOrderMutation, } = SalesOrderService;
//# sourceMappingURL=SalesOrderService.js.map