import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const ApiMetricSnapshotService = createApi({
    reducerPath: 'ApiMetricSnapshot', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['ApiMetricSnapshot'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getApiMetricSnapshotsPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `ApiMetricSnapshot?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'ApiMetricSnapshot', id })),
                    { type: 'ApiMetricSnapshot', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getApiMetricSnapshots: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `ApiMetricSnapshot?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `ApiMetricSnapshot`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'ApiMetricSnapshot', id })),
                    { type: 'ApiMetricSnapshot', id: 'LIST' },
                ]
                : [{ type: 'ApiMetricSnapshot', id: 'LIST' }],
        }),
        // 3) Create
        addApiMetricSnapshot: build.mutation({
            query: (body) => ({
                url: `ApiMetricSnapshot`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'ApiMetricSnapshot', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getApiMetricSnapshot: build.query({
            query: (id) => `ApiMetricSnapshot/${id}`,
            providesTags: (result, error, id) => [{ type: 'ApiMetricSnapshot', id }],
        }),
        // 5) Update
        updateApiMetricSnapshot: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `ApiMetricSnapshot/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(ApiMetricSnapshotService.util.updateQueryData('getApiMetricSnapshot', id, (draft) => {
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
                { type: 'ApiMetricSnapshot', id },
                { type: 'ApiMetricSnapshot', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteApiMetricSnapshot: build.mutation({
            query(id) {
                return {
                    url: `ApiMetricSnapshot/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'ApiMetricSnapshot', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetApiMetricSnapshotsPagedQuery`
export const { useGetApiMetricSnapshotsPagedQuery, // immediate fetch
useLazyGetApiMetricSnapshotsPagedQuery, // lazy fetch
useGetApiMetricSnapshotQuery, useGetApiMetricSnapshotsQuery, useAddApiMetricSnapshotMutation, useUpdateApiMetricSnapshotMutation, useDeleteApiMetricSnapshotMutation, } = ApiMetricSnapshotService;
//# sourceMappingURL=ApiMetricSnapshotService.js.map