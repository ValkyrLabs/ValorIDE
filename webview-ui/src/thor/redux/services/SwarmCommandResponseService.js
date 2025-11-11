import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const SwarmCommandResponseService = createApi({
    reducerPath: 'SwarmCommandResponse', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['SwarmCommandResponse'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getSwarmCommandResponsesPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `SwarmCommandResponse?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'SwarmCommandResponse', id })),
                    { type: 'SwarmCommandResponse', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getSwarmCommandResponses: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `SwarmCommandResponse?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `SwarmCommandResponse`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'SwarmCommandResponse', id })),
                    { type: 'SwarmCommandResponse', id: 'LIST' },
                ]
                : [{ type: 'SwarmCommandResponse', id: 'LIST' }],
        }),
        // 3) Create
        addSwarmCommandResponse: build.mutation({
            query: (body) => ({
                url: `SwarmCommandResponse`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'SwarmCommandResponse', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getSwarmCommandResponse: build.query({
            query: (id) => `SwarmCommandResponse/${id}`,
            providesTags: (result, error, id) => [{ type: 'SwarmCommandResponse', id }],
        }),
        // 5) Update
        updateSwarmCommandResponse: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `SwarmCommandResponse/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(SwarmCommandResponseService.util.updateQueryData('getSwarmCommandResponse', id, (draft) => {
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
                { type: 'SwarmCommandResponse', id },
                { type: 'SwarmCommandResponse', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteSwarmCommandResponse: build.mutation({
            query(id) {
                return {
                    url: `SwarmCommandResponse/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'SwarmCommandResponse', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetSwarmCommandResponsesPagedQuery`
export const { useGetSwarmCommandResponsesPagedQuery, // immediate fetch
useLazyGetSwarmCommandResponsesPagedQuery, // lazy fetch
useGetSwarmCommandResponseQuery, useGetSwarmCommandResponsesQuery, useAddSwarmCommandResponseMutation, useUpdateSwarmCommandResponseMutation, useDeleteSwarmCommandResponseMutation, } = SwarmCommandResponseService;
//# sourceMappingURL=SwarmCommandResponseService.js.map