import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const McpDownloadResponseService = createApi({
    reducerPath: 'McpDownloadResponse', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['McpDownloadResponse'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getMcpDownloadResponsesPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `McpDownloadResponse?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'McpDownloadResponse', id })),
                    { type: 'McpDownloadResponse', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getMcpDownloadResponses: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `McpDownloadResponse?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `McpDownloadResponse`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'McpDownloadResponse', id })),
                    { type: 'McpDownloadResponse', id: 'LIST' },
                ]
                : [{ type: 'McpDownloadResponse', id: 'LIST' }],
        }),
        // 3) Create
        addMcpDownloadResponse: build.mutation({
            query: (body) => ({
                url: `McpDownloadResponse`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'McpDownloadResponse', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getMcpDownloadResponse: build.query({
            query: (id) => `McpDownloadResponse/${id}`,
            providesTags: (result, error, id) => [{ type: 'McpDownloadResponse', id }],
        }),
        // 5) Update
        updateMcpDownloadResponse: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `McpDownloadResponse/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(McpDownloadResponseService.util.updateQueryData('getMcpDownloadResponse', id, (draft) => {
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
                { type: 'McpDownloadResponse', id },
                { type: 'McpDownloadResponse', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteMcpDownloadResponse: build.mutation({
            query(id) {
                return {
                    url: `McpDownloadResponse/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'McpDownloadResponse', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetMcpDownloadResponsesPagedQuery`
export const { useGetMcpDownloadResponsesPagedQuery, // immediate fetch
useLazyGetMcpDownloadResponsesPagedQuery, // lazy fetch
useGetMcpDownloadResponseQuery, useGetMcpDownloadResponsesQuery, useAddMcpDownloadResponseMutation, useUpdateMcpDownloadResponseMutation, useDeleteMcpDownloadResponseMutation, } = McpDownloadResponseService;
//# sourceMappingURL=McpDownloadResponseService.js.map