import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const LineItemService = createApi({
    reducerPath: 'LineItem', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['LineItem'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getLineItemsPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `LineItem?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'LineItem', id })),
                    { type: 'LineItem', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getLineItems: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `LineItem?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `LineItem`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'LineItem', id })),
                    { type: 'LineItem', id: 'LIST' },
                ]
                : [{ type: 'LineItem', id: 'LIST' }],
        }),
        // 3) Create
        addLineItem: build.mutation({
            query: (body) => ({
                url: `LineItem`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'LineItem', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getLineItem: build.query({
            query: (id) => `LineItem/${id}`,
            providesTags: (result, error, id) => [{ type: 'LineItem', id }],
        }),
        // 5) Update
        updateLineItem: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `LineItem/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(LineItemService.util.updateQueryData('getLineItem', id, (draft) => {
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
                { type: 'LineItem', id },
                { type: 'LineItem', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteLineItem: build.mutation({
            query(id) {
                return {
                    url: `LineItem/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'LineItem', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetLineItemsPagedQuery`
export const { useGetLineItemsPagedQuery, // immediate fetch
useLazyGetLineItemsPagedQuery, // lazy fetch
useGetLineItemQuery, useGetLineItemsQuery, useAddLineItemMutation, useUpdateLineItemMutation, useDeleteLineItemMutation, } = LineItemService;
//# sourceMappingURL=LineItemService.js.map