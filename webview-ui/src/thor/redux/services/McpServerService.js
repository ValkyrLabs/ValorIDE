import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const McpServerService = createApi({
    reducerPath: 'McpServer', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['McpServer'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getMcpServersPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `McpServer?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'McpServer', id })),
                    { type: 'McpServer', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getMcpServers: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `McpServer?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `McpServer`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'McpServer', id })),
                    { type: 'McpServer', id: 'LIST' },
                ]
                : [{ type: 'McpServer', id: 'LIST' }],
        }),
        // 3) Create
        addMcpServer: build.mutation({
            query: (body) => ({
                url: `McpServer`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'McpServer', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getMcpServer: build.query({
            query: (id) => `McpServer/${id}`,
            providesTags: (result, error, id) => [{ type: 'McpServer', id }],
        }),
        // 5) Update
        updateMcpServer: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `McpServer/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(McpServerService.util.updateQueryData('getMcpServer', id, (draft) => {
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
                { type: 'McpServer', id },
                { type: 'McpServer', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteMcpServer: build.mutation({
            query(id) {
                return {
                    url: `McpServer/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'McpServer', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetMcpServersPagedQuery`
export const { useGetMcpServersPagedQuery, // immediate fetch
useLazyGetMcpServersPagedQuery, // lazy fetch
useGetMcpServerQuery, useGetMcpServersQuery, useAddMcpServerMutation, useUpdateMcpServerMutation, useDeleteMcpServerMutation, } = McpServerService;
//# sourceMappingURL=McpServerService.js.map