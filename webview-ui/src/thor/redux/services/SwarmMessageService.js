import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const SwarmMessageService = createApi({
    reducerPath: 'SwarmMessage', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['SwarmMessage'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getSwarmMessagesPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `SwarmMessage?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'SwarmMessage', id })),
                    { type: 'SwarmMessage', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getSwarmMessages: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `SwarmMessage?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `SwarmMessage`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'SwarmMessage', id })),
                    { type: 'SwarmMessage', id: 'LIST' },
                ]
                : [{ type: 'SwarmMessage', id: 'LIST' }],
        }),
        // 3) Create
        addSwarmMessage: build.mutation({
            query: (body) => ({
                url: `SwarmMessage`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'SwarmMessage', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getSwarmMessage: build.query({
            query: (id) => `SwarmMessage/${id}`,
            providesTags: (result, error, id) => [{ type: 'SwarmMessage', id }],
        }),
        // 5) Update
        updateSwarmMessage: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `SwarmMessage/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(SwarmMessageService.util.updateQueryData('getSwarmMessage', id, (draft) => {
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
                { type: 'SwarmMessage', id },
                { type: 'SwarmMessage', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteSwarmMessage: build.mutation({
            query(id) {
                return {
                    url: `SwarmMessage/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'SwarmMessage', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetSwarmMessagesPagedQuery`
export const { useGetSwarmMessagesPagedQuery, // immediate fetch
useLazyGetSwarmMessagesPagedQuery, // lazy fetch
useGetSwarmMessageQuery, useGetSwarmMessagesQuery, useAddSwarmMessageMutation, useUpdateSwarmMessageMutation, useDeleteSwarmMessageMutation, } = SwarmMessageService;
//# sourceMappingURL=SwarmMessageService.js.map