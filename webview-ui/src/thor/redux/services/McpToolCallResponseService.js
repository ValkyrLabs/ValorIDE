import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const McpToolCallResponseService = createApi({
    reducerPath: 'McpToolCallResponse', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['McpToolCallResponse'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getMcpToolCallResponsesPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `McpToolCallResponse?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'McpToolCallResponse', id })),
                    { type: 'McpToolCallResponse', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getMcpToolCallResponses: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `McpToolCallResponse?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `McpToolCallResponse`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'McpToolCallResponse', id })),
                    { type: 'McpToolCallResponse', id: 'LIST' },
                ]
                : [{ type: 'McpToolCallResponse', id: 'LIST' }],
        }),
        // 3) Create
        addMcpToolCallResponse: build.mutation({
            query: (body) => ({
                url: `McpToolCallResponse`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'McpToolCallResponse', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getMcpToolCallResponse: build.query({
            query: (id) => `McpToolCallResponse/${id}`,
            providesTags: (result, error, id) => [{ type: 'McpToolCallResponse', id }],
        }),
        // 5) Update
        updateMcpToolCallResponse: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `McpToolCallResponse/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(McpToolCallResponseService.util.updateQueryData('getMcpToolCallResponse', id, (draft) => {
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
                { type: 'McpToolCallResponse', id },
                { type: 'McpToolCallResponse', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteMcpToolCallResponse: build.mutation({
            query(id) {
                return {
                    url: `McpToolCallResponse/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'McpToolCallResponse', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetMcpToolCallResponsesPagedQuery`
export const { useGetMcpToolCallResponsesPagedQuery, // immediate fetch
useLazyGetMcpToolCallResponsesPagedQuery, // lazy fetch
useGetMcpToolCallResponseQuery, useGetMcpToolCallResponsesQuery, useAddMcpToolCallResponseMutation, useUpdateMcpToolCallResponseMutation, useDeleteMcpToolCallResponseMutation, } = McpToolCallResponseService;
//# sourceMappingURL=McpToolCallResponseService.js.map