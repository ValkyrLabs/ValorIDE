import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const SwarmAgentSummaryService = createApi({
    reducerPath: 'SwarmAgentSummary', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['SwarmAgentSummary'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getSwarmAgentSummarysPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `SwarmAgentSummary?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'SwarmAgentSummary', id })),
                    { type: 'SwarmAgentSummary', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getSwarmAgentSummarys: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `SwarmAgentSummary?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `SwarmAgentSummary`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'SwarmAgentSummary', id })),
                    { type: 'SwarmAgentSummary', id: 'LIST' },
                ]
                : [{ type: 'SwarmAgentSummary', id: 'LIST' }],
        }),
        // 3) Create
        addSwarmAgentSummary: build.mutation({
            query: (body) => ({
                url: `SwarmAgentSummary`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'SwarmAgentSummary', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getSwarmAgentSummary: build.query({
            query: (id) => `SwarmAgentSummary/${id}`,
            providesTags: (result, error, id) => [{ type: 'SwarmAgentSummary', id }],
        }),
        // 5) Update
        updateSwarmAgentSummary: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `SwarmAgentSummary/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(SwarmAgentSummaryService.util.updateQueryData('getSwarmAgentSummary', id, (draft) => {
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
                { type: 'SwarmAgentSummary', id },
                { type: 'SwarmAgentSummary', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteSwarmAgentSummary: build.mutation({
            query(id) {
                return {
                    url: `SwarmAgentSummary/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'SwarmAgentSummary', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetSwarmAgentSummarysPagedQuery`
export const { useGetSwarmAgentSummarysPagedQuery, // immediate fetch
useLazyGetSwarmAgentSummarysPagedQuery, // lazy fetch
useGetSwarmAgentSummaryQuery, useGetSwarmAgentSummarysQuery, useAddSwarmAgentSummaryMutation, useUpdateSwarmAgentSummaryMutation, useDeleteSwarmAgentSummaryMutation, } = SwarmAgentSummaryService;
//# sourceMappingURL=SwarmAgentSummaryService.js.map