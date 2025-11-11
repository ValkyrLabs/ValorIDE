import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const SwarmGraphNodeService = createApi({
    reducerPath: 'SwarmGraphNode', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['SwarmGraphNode'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getSwarmGraphNodesPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `SwarmGraphNode?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'SwarmGraphNode', id })),
                    { type: 'SwarmGraphNode', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getSwarmGraphNodes: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `SwarmGraphNode?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `SwarmGraphNode`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'SwarmGraphNode', id })),
                    { type: 'SwarmGraphNode', id: 'LIST' },
                ]
                : [{ type: 'SwarmGraphNode', id: 'LIST' }],
        }),
        // 3) Create
        addSwarmGraphNode: build.mutation({
            query: (body) => ({
                url: `SwarmGraphNode`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'SwarmGraphNode', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getSwarmGraphNode: build.query({
            query: (id) => `SwarmGraphNode/${id}`,
            providesTags: (result, error, id) => [{ type: 'SwarmGraphNode', id }],
        }),
        // 5) Update
        updateSwarmGraphNode: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `SwarmGraphNode/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(SwarmGraphNodeService.util.updateQueryData('getSwarmGraphNode', id, (draft) => {
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
                { type: 'SwarmGraphNode', id },
                { type: 'SwarmGraphNode', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteSwarmGraphNode: build.mutation({
            query(id) {
                return {
                    url: `SwarmGraphNode/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'SwarmGraphNode', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetSwarmGraphNodesPagedQuery`
export const { useGetSwarmGraphNodesPagedQuery, // immediate fetch
useLazyGetSwarmGraphNodesPagedQuery, // lazy fetch
useGetSwarmGraphNodeQuery, useGetSwarmGraphNodesQuery, useAddSwarmGraphNodeMutation, useUpdateSwarmGraphNodeMutation, useDeleteSwarmGraphNodeMutation, } = SwarmGraphNodeService;
//# sourceMappingURL=SwarmGraphNodeService.js.map