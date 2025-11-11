import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const SwarmUnregisterRequestService = createApi({
    reducerPath: 'SwarmUnregisterRequest', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['SwarmUnregisterRequest'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getSwarmUnregisterRequestsPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `SwarmUnregisterRequest?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'SwarmUnregisterRequest', id })),
                    { type: 'SwarmUnregisterRequest', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getSwarmUnregisterRequests: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `SwarmUnregisterRequest?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `SwarmUnregisterRequest`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'SwarmUnregisterRequest', id })),
                    { type: 'SwarmUnregisterRequest', id: 'LIST' },
                ]
                : [{ type: 'SwarmUnregisterRequest', id: 'LIST' }],
        }),
        // 3) Create
        addSwarmUnregisterRequest: build.mutation({
            query: (body) => ({
                url: `SwarmUnregisterRequest`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'SwarmUnregisterRequest', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getSwarmUnregisterRequest: build.query({
            query: (id) => `SwarmUnregisterRequest/${id}`,
            providesTags: (result, error, id) => [{ type: 'SwarmUnregisterRequest', id }],
        }),
        // 5) Update
        updateSwarmUnregisterRequest: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `SwarmUnregisterRequest/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(SwarmUnregisterRequestService.util.updateQueryData('getSwarmUnregisterRequest', id, (draft) => {
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
                { type: 'SwarmUnregisterRequest', id },
                { type: 'SwarmUnregisterRequest', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteSwarmUnregisterRequest: build.mutation({
            query(id) {
                return {
                    url: `SwarmUnregisterRequest/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'SwarmUnregisterRequest', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetSwarmUnregisterRequestsPagedQuery`
export const { useGetSwarmUnregisterRequestsPagedQuery, // immediate fetch
useLazyGetSwarmUnregisterRequestsPagedQuery, // lazy fetch
useGetSwarmUnregisterRequestQuery, useGetSwarmUnregisterRequestsQuery, useAddSwarmUnregisterRequestMutation, useUpdateSwarmUnregisterRequestMutation, useDeleteSwarmUnregisterRequestMutation, } = SwarmUnregisterRequestService;
//# sourceMappingURL=SwarmUnregisterRequestService.js.map