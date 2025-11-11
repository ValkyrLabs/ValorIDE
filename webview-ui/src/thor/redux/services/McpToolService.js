import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const McpToolService = createApi({
    reducerPath: 'McpTool', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['McpTool'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getMcpToolsPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `McpTool?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'McpTool', id })),
                    { type: 'McpTool', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getMcpTools: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `McpTool?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `McpTool`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'McpTool', id })),
                    { type: 'McpTool', id: 'LIST' },
                ]
                : [{ type: 'McpTool', id: 'LIST' }],
        }),
        // 3) Create
        addMcpTool: build.mutation({
            query: (body) => ({
                url: `McpTool`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'McpTool', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getMcpTool: build.query({
            query: (id) => `McpTool/${id}`,
            providesTags: (result, error, id) => [{ type: 'McpTool', id }],
        }),
        // 5) Update
        updateMcpTool: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `McpTool/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(McpToolService.util.updateQueryData('getMcpTool', id, (draft) => {
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
                { type: 'McpTool', id },
                { type: 'McpTool', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteMcpTool: build.mutation({
            query(id) {
                return {
                    url: `McpTool/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'McpTool', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetMcpToolsPagedQuery`
export const { useGetMcpToolsPagedQuery, // immediate fetch
useLazyGetMcpToolsPagedQuery, // lazy fetch
useGetMcpToolQuery, useGetMcpToolsQuery, useAddMcpToolMutation, useUpdateMcpToolMutation, useDeleteMcpToolMutation, } = McpToolService;
//# sourceMappingURL=McpToolService.js.map