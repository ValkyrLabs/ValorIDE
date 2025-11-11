import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const AgentService = createApi({
    reducerPath: 'Agent', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['Agent'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getAgentsPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `Agent?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'Agent', id })),
                    { type: 'Agent', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getAgents: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `Agent?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `Agent`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'Agent', id })),
                    { type: 'Agent', id: 'LIST' },
                ]
                : [{ type: 'Agent', id: 'LIST' }],
        }),
        // 3) Create
        addAgent: build.mutation({
            query: (body) => ({
                url: `Agent`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'Agent', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getAgent: build.query({
            query: (id) => `Agent/${id}`,
            providesTags: (result, error, id) => [{ type: 'Agent', id }],
        }),
        // 5) Update
        updateAgent: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `Agent/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(AgentService.util.updateQueryData('getAgent', id, (draft) => {
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
                { type: 'Agent', id },
                { type: 'Agent', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteAgent: build.mutation({
            query(id) {
                return {
                    url: `Agent/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'Agent', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetAgentsPagedQuery`
export const { useGetAgentsPagedQuery, // immediate fetch
useLazyGetAgentsPagedQuery, // lazy fetch
useGetAgentQuery, useGetAgentsQuery, useAddAgentMutation, useUpdateAgentMutation, useDeleteAgentMutation, } = AgentService;
//# sourceMappingURL=AgentService.js.map