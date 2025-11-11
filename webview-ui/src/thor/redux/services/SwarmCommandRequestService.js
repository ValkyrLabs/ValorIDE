import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const SwarmCommandRequestService = createApi({
    reducerPath: 'SwarmCommandRequest', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['SwarmCommandRequest'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getSwarmCommandRequestsPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `SwarmCommandRequest?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'SwarmCommandRequest', id })),
                    { type: 'SwarmCommandRequest', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getSwarmCommandRequests: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `SwarmCommandRequest?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `SwarmCommandRequest`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'SwarmCommandRequest', id })),
                    { type: 'SwarmCommandRequest', id: 'LIST' },
                ]
                : [{ type: 'SwarmCommandRequest', id: 'LIST' }],
        }),
        // 3) Create
        addSwarmCommandRequest: build.mutation({
            query: (body) => ({
                url: `SwarmCommandRequest`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'SwarmCommandRequest', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getSwarmCommandRequest: build.query({
            query: (id) => `SwarmCommandRequest/${id}`,
            providesTags: (result, error, id) => [{ type: 'SwarmCommandRequest', id }],
        }),
        // 5) Update
        updateSwarmCommandRequest: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `SwarmCommandRequest/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(SwarmCommandRequestService.util.updateQueryData('getSwarmCommandRequest', id, (draft) => {
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
                { type: 'SwarmCommandRequest', id },
                { type: 'SwarmCommandRequest', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteSwarmCommandRequest: build.mutation({
            query(id) {
                return {
                    url: `SwarmCommandRequest/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'SwarmCommandRequest', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetSwarmCommandRequestsPagedQuery`
export const { useGetSwarmCommandRequestsPagedQuery, // immediate fetch
useLazyGetSwarmCommandRequestsPagedQuery, // lazy fetch
useGetSwarmCommandRequestQuery, useGetSwarmCommandRequestsQuery, useAddSwarmCommandRequestMutation, useUpdateSwarmCommandRequestMutation, useDeleteSwarmCommandRequestMutation, } = SwarmCommandRequestService;
//# sourceMappingURL=SwarmCommandRequestService.js.map