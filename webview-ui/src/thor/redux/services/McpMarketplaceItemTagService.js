import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const McpMarketplaceItemTagService = createApi({
    reducerPath: 'McpMarketplaceItemTag', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['McpMarketplaceItemTag'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getMcpMarketplaceItemTagsPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `McpMarketplaceItemTag?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'McpMarketplaceItemTag', id })),
                    { type: 'McpMarketplaceItemTag', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getMcpMarketplaceItemTags: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `McpMarketplaceItemTag?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `McpMarketplaceItemTag`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'McpMarketplaceItemTag', id })),
                    { type: 'McpMarketplaceItemTag', id: 'LIST' },
                ]
                : [{ type: 'McpMarketplaceItemTag', id: 'LIST' }],
        }),
        // 3) Create
        addMcpMarketplaceItemTag: build.mutation({
            query: (body) => ({
                url: `McpMarketplaceItemTag`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'McpMarketplaceItemTag', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getMcpMarketplaceItemTag: build.query({
            query: (id) => `McpMarketplaceItemTag/${id}`,
            providesTags: (result, error, id) => [{ type: 'McpMarketplaceItemTag', id }],
        }),
        // 5) Update
        updateMcpMarketplaceItemTag: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `McpMarketplaceItemTag/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(McpMarketplaceItemTagService.util.updateQueryData('getMcpMarketplaceItemTag', id, (draft) => {
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
                { type: 'McpMarketplaceItemTag', id },
                { type: 'McpMarketplaceItemTag', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteMcpMarketplaceItemTag: build.mutation({
            query(id) {
                return {
                    url: `McpMarketplaceItemTag/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'McpMarketplaceItemTag', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetMcpMarketplaceItemTagsPagedQuery`
export const { useGetMcpMarketplaceItemTagsPagedQuery, // immediate fetch
useLazyGetMcpMarketplaceItemTagsPagedQuery, // lazy fetch
useGetMcpMarketplaceItemTagQuery, useGetMcpMarketplaceItemTagsQuery, useAddMcpMarketplaceItemTagMutation, useUpdateMcpMarketplaceItemTagMutation, useDeleteMcpMarketplaceItemTagMutation, } = McpMarketplaceItemTagService;
//# sourceMappingURL=McpMarketplaceItemTagService.js.map