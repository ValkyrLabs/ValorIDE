import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const McpMarketplaceCatalogService = createApi({
    reducerPath: 'McpMarketplaceCatalog', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['McpMarketplaceCatalog'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getMcpMarketplaceCatalogsPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `McpMarketplaceCatalog?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'McpMarketplaceCatalog', id })),
                    { type: 'McpMarketplaceCatalog', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getMcpMarketplaceCatalogs: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `McpMarketplaceCatalog?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `McpMarketplaceCatalog`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'McpMarketplaceCatalog', id })),
                    { type: 'McpMarketplaceCatalog', id: 'LIST' },
                ]
                : [{ type: 'McpMarketplaceCatalog', id: 'LIST' }],
        }),
        // 3) Create
        addMcpMarketplaceCatalog: build.mutation({
            query: (body) => ({
                url: `McpMarketplaceCatalog`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'McpMarketplaceCatalog', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getMcpMarketplaceCatalog: build.query({
            query: (id) => `McpMarketplaceCatalog/${id}`,
            providesTags: (result, error, id) => [{ type: 'McpMarketplaceCatalog', id }],
        }),
        // 5) Update
        updateMcpMarketplaceCatalog: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `McpMarketplaceCatalog/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(McpMarketplaceCatalogService.util.updateQueryData('getMcpMarketplaceCatalog', id, (draft) => {
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
                { type: 'McpMarketplaceCatalog', id },
                { type: 'McpMarketplaceCatalog', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteMcpMarketplaceCatalog: build.mutation({
            query(id) {
                return {
                    url: `McpMarketplaceCatalog/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'McpMarketplaceCatalog', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetMcpMarketplaceCatalogsPagedQuery`
export const { useGetMcpMarketplaceCatalogsPagedQuery, // immediate fetch
useLazyGetMcpMarketplaceCatalogsPagedQuery, // lazy fetch
useGetMcpMarketplaceCatalogQuery, useGetMcpMarketplaceCatalogsQuery, useAddMcpMarketplaceCatalogMutation, useUpdateMcpMarketplaceCatalogMutation, useDeleteMcpMarketplaceCatalogMutation, } = McpMarketplaceCatalogService;
//# sourceMappingURL=McpMarketplaceCatalogService.js.map