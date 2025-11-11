import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const SwarmSecurityService = createApi({
    reducerPath: 'SwarmSecurity', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['SwarmSecurity'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getSwarmSecuritysPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `SwarmSecurity?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'SwarmSecurity', id })),
                    { type: 'SwarmSecurity', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getSwarmSecuritys: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `SwarmSecurity?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `SwarmSecurity`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'SwarmSecurity', id })),
                    { type: 'SwarmSecurity', id: 'LIST' },
                ]
                : [{ type: 'SwarmSecurity', id: 'LIST' }],
        }),
        // 3) Create
        addSwarmSecurity: build.mutation({
            query: (body) => ({
                url: `SwarmSecurity`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'SwarmSecurity', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getSwarmSecurity: build.query({
            query: (id) => `SwarmSecurity/${id}`,
            providesTags: (result, error, id) => [{ type: 'SwarmSecurity', id }],
        }),
        // 5) Update
        updateSwarmSecurity: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `SwarmSecurity/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(SwarmSecurityService.util.updateQueryData('getSwarmSecurity', id, (draft) => {
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
                { type: 'SwarmSecurity', id },
                { type: 'SwarmSecurity', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteSwarmSecurity: build.mutation({
            query(id) {
                return {
                    url: `SwarmSecurity/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'SwarmSecurity', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetSwarmSecuritysPagedQuery`
export const { useGetSwarmSecuritysPagedQuery, // immediate fetch
useLazyGetSwarmSecuritysPagedQuery, // lazy fetch
useGetSwarmSecurityQuery, useGetSwarmSecuritysQuery, useAddSwarmSecurityMutation, useUpdateSwarmSecurityMutation, useDeleteSwarmSecurityMutation, } = SwarmSecurityService;
//# sourceMappingURL=SwarmSecurityService.js.map