import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const McpMarketplaceItemService = createApi({
    reducerPath: 'McpMarketplaceItem', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['McpMarketplaceItem'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getMcpMarketplaceItemsPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `McpMarketplaceItem?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'McpMarketplaceItem', id })),
                    { type: 'McpMarketplaceItem', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getMcpMarketplaceItems: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `McpMarketplaceItem?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `McpMarketplaceItem`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'McpMarketplaceItem', id })),
                    { type: 'McpMarketplaceItem', id: 'LIST' },
                ]
                : [{ type: 'McpMarketplaceItem', id: 'LIST' }],
        }),
        // 3) Create
        addMcpMarketplaceItem: build.mutation({
            query: (body) => ({
                url: `McpMarketplaceItem`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'McpMarketplaceItem', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getMcpMarketplaceItem: build.query({
            query: (id) => `McpMarketplaceItem/${id}`,
            providesTags: (result, error, id) => [{ type: 'McpMarketplaceItem', id }],
        }),
        // 5) Update
        updateMcpMarketplaceItem: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `McpMarketplaceItem/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(McpMarketplaceItemService.util.updateQueryData('getMcpMarketplaceItem', id, (draft) => {
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
                { type: 'McpMarketplaceItem', id },
                { type: 'McpMarketplaceItem', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteMcpMarketplaceItem: build.mutation({
            query(id) {
                return {
                    url: `McpMarketplaceItem/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'McpMarketplaceItem', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetMcpMarketplaceItemsPagedQuery`
export const { useGetMcpMarketplaceItemsPagedQuery, // immediate fetch
useLazyGetMcpMarketplaceItemsPagedQuery, // lazy fetch
useGetMcpMarketplaceItemQuery, useGetMcpMarketplaceItemsQuery, useAddMcpMarketplaceItemMutation, useUpdateMcpMarketplaceItemMutation, useDeleteMcpMarketplaceItemMutation, } = McpMarketplaceItemService;
//# sourceMappingURL=McpMarketplaceItemService.js.map