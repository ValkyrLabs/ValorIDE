import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const SwarmPayloadService = createApi({
    reducerPath: 'SwarmPayload', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['SwarmPayload'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getSwarmPayloadsPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `SwarmPayload?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'SwarmPayload', id })),
                    { type: 'SwarmPayload', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getSwarmPayloads: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `SwarmPayload?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `SwarmPayload`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'SwarmPayload', id })),
                    { type: 'SwarmPayload', id: 'LIST' },
                ]
                : [{ type: 'SwarmPayload', id: 'LIST' }],
        }),
        // 3) Create
        addSwarmPayload: build.mutation({
            query: (body) => ({
                url: `SwarmPayload`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'SwarmPayload', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getSwarmPayload: build.query({
            query: (id) => `SwarmPayload/${id}`,
            providesTags: (result, error, id) => [{ type: 'SwarmPayload', id }],
        }),
        // 5) Update
        updateSwarmPayload: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `SwarmPayload/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(SwarmPayloadService.util.updateQueryData('getSwarmPayload', id, (draft) => {
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
                { type: 'SwarmPayload', id },
                { type: 'SwarmPayload', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteSwarmPayload: build.mutation({
            query(id) {
                return {
                    url: `SwarmPayload/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'SwarmPayload', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetSwarmPayloadsPagedQuery`
export const { useGetSwarmPayloadsPagedQuery, // immediate fetch
useLazyGetSwarmPayloadsPagedQuery, // lazy fetch
useGetSwarmPayloadQuery, useGetSwarmPayloadsQuery, useAddSwarmPayloadMutation, useUpdateSwarmPayloadMutation, useDeleteSwarmPayloadMutation, } = SwarmPayloadService;
//# sourceMappingURL=SwarmPayloadService.js.map