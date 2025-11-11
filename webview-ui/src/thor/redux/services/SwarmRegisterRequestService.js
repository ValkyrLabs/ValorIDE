import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const SwarmRegisterRequestService = createApi({
    reducerPath: 'SwarmRegisterRequest', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['SwarmRegisterRequest'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getSwarmRegisterRequestsPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `SwarmRegisterRequest?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'SwarmRegisterRequest', id })),
                    { type: 'SwarmRegisterRequest', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getSwarmRegisterRequests: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `SwarmRegisterRequest?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `SwarmRegisterRequest`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'SwarmRegisterRequest', id })),
                    { type: 'SwarmRegisterRequest', id: 'LIST' },
                ]
                : [{ type: 'SwarmRegisterRequest', id: 'LIST' }],
        }),
        // 3) Create
        addSwarmRegisterRequest: build.mutation({
            query: (body) => ({
                url: `SwarmRegisterRequest`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'SwarmRegisterRequest', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getSwarmRegisterRequest: build.query({
            query: (id) => `SwarmRegisterRequest/${id}`,
            providesTags: (result, error, id) => [{ type: 'SwarmRegisterRequest', id }],
        }),
        // 5) Update
        updateSwarmRegisterRequest: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `SwarmRegisterRequest/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(SwarmRegisterRequestService.util.updateQueryData('getSwarmRegisterRequest', id, (draft) => {
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
                { type: 'SwarmRegisterRequest', id },
                { type: 'SwarmRegisterRequest', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteSwarmRegisterRequest: build.mutation({
            query(id) {
                return {
                    url: `SwarmRegisterRequest/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'SwarmRegisterRequest', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetSwarmRegisterRequestsPagedQuery`
export const { useGetSwarmRegisterRequestsPagedQuery, // immediate fetch
useLazyGetSwarmRegisterRequestsPagedQuery, // lazy fetch
useGetSwarmRegisterRequestQuery, useGetSwarmRegisterRequestsQuery, useAddSwarmRegisterRequestMutation, useUpdateSwarmRegisterRequestMutation, useDeleteSwarmRegisterRequestMutation, } = SwarmRegisterRequestService;
//# sourceMappingURL=SwarmRegisterRequestService.js.map