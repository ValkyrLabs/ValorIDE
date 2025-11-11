import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const McpContentService = createApi({
    reducerPath: 'McpContent', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['McpContent'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getMcpContentsPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `McpContent?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'McpContent', id })),
                    { type: 'McpContent', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getMcpContents: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `McpContent?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `McpContent`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'McpContent', id })),
                    { type: 'McpContent', id: 'LIST' },
                ]
                : [{ type: 'McpContent', id: 'LIST' }],
        }),
        // 3) Create
        addMcpContent: build.mutation({
            query: (body) => ({
                url: `McpContent`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'McpContent', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getMcpContent: build.query({
            query: (id) => `McpContent/${id}`,
            providesTags: (result, error, id) => [{ type: 'McpContent', id }],
        }),
        // 5) Update
        updateMcpContent: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `McpContent/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(McpContentService.util.updateQueryData('getMcpContent', id, (draft) => {
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
                { type: 'McpContent', id },
                { type: 'McpContent', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteMcpContent: build.mutation({
            query(id) {
                return {
                    url: `McpContent/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'McpContent', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetMcpContentsPagedQuery`
export const { useGetMcpContentsPagedQuery, // immediate fetch
useLazyGetMcpContentsPagedQuery, // lazy fetch
useGetMcpContentQuery, useGetMcpContentsQuery, useAddMcpContentMutation, useUpdateMcpContentMutation, useDeleteMcpContentMutation, } = McpContentService;
//# sourceMappingURL=McpContentService.js.map