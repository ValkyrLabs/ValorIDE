import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const HostInstanceService = createApi({
    reducerPath: 'HostInstance', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['HostInstance'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getHostInstancesPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `HostInstance?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'HostInstance', id })),
                    { type: 'HostInstance', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getHostInstances: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `HostInstance?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `HostInstance`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'HostInstance', id })),
                    { type: 'HostInstance', id: 'LIST' },
                ]
                : [{ type: 'HostInstance', id: 'LIST' }],
        }),
        // 3) Create
        addHostInstance: build.mutation({
            query: (body) => ({
                url: `HostInstance`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'HostInstance', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getHostInstance: build.query({
            query: (id) => `HostInstance/${id}`,
            providesTags: (result, error, id) => [{ type: 'HostInstance', id }],
        }),
        // 5) Update
        updateHostInstance: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `HostInstance/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(HostInstanceService.util.updateQueryData('getHostInstance', id, (draft) => {
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
                { type: 'HostInstance', id },
                { type: 'HostInstance', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteHostInstance: build.mutation({
            query(id) {
                return {
                    url: `HostInstance/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'HostInstance', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetHostInstancesPagedQuery`
export const { useGetHostInstancesPagedQuery, // immediate fetch
useLazyGetHostInstancesPagedQuery, // lazy fetch
useGetHostInstanceQuery, useGetHostInstancesQuery, useAddHostInstanceMutation, useUpdateHostInstanceMutation, useDeleteHostInstanceMutation, } = HostInstanceService;
//# sourceMappingURL=HostInstanceService.js.map