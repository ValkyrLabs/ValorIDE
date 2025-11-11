import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const ValkyrJobService = createApi({
    reducerPath: 'ValkyrJob', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['ValkyrJob'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getValkyrJobsPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `ValkyrJob?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'ValkyrJob', id })),
                    { type: 'ValkyrJob', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getValkyrJobs: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `ValkyrJob?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `ValkyrJob`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'ValkyrJob', id })),
                    { type: 'ValkyrJob', id: 'LIST' },
                ]
                : [{ type: 'ValkyrJob', id: 'LIST' }],
        }),
        // 3) Create
        addValkyrJob: build.mutation({
            query: (body) => ({
                url: `ValkyrJob`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'ValkyrJob', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getValkyrJob: build.query({
            query: (id) => `ValkyrJob/${id}`,
            providesTags: (result, error, id) => [{ type: 'ValkyrJob', id }],
        }),
        // 5) Update
        updateValkyrJob: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `ValkyrJob/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(ValkyrJobService.util.updateQueryData('getValkyrJob', id, (draft) => {
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
                { type: 'ValkyrJob', id },
                { type: 'ValkyrJob', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteValkyrJob: build.mutation({
            query(id) {
                return {
                    url: `ValkyrJob/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'ValkyrJob', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetValkyrJobsPagedQuery`
export const { useGetValkyrJobsPagedQuery, // immediate fetch
useLazyGetValkyrJobsPagedQuery, // lazy fetch
useGetValkyrJobQuery, useGetValkyrJobsQuery, useAddValkyrJobMutation, useUpdateValkyrJobMutation, useDeleteValkyrJobMutation, } = ValkyrJobService;
//# sourceMappingURL=ValkyrJobService.js.map