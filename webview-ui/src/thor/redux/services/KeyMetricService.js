import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const KeyMetricService = createApi({
    reducerPath: 'KeyMetric', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['KeyMetric'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getKeyMetricsPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `KeyMetric?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'KeyMetric', id })),
                    { type: 'KeyMetric', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getKeyMetrics: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `KeyMetric?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `KeyMetric`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'KeyMetric', id })),
                    { type: 'KeyMetric', id: 'LIST' },
                ]
                : [{ type: 'KeyMetric', id: 'LIST' }],
        }),
        // 3) Create
        addKeyMetric: build.mutation({
            query: (body) => ({
                url: `KeyMetric`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'KeyMetric', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getKeyMetric: build.query({
            query: (id) => `KeyMetric/${id}`,
            providesTags: (result, error, id) => [{ type: 'KeyMetric', id }],
        }),
        // 5) Update
        updateKeyMetric: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `KeyMetric/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(KeyMetricService.util.updateQueryData('getKeyMetric', id, (draft) => {
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
                { type: 'KeyMetric', id },
                { type: 'KeyMetric', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteKeyMetric: build.mutation({
            query(id) {
                return {
                    url: `KeyMetric/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'KeyMetric', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetKeyMetricsPagedQuery`
export const { useGetKeyMetricsPagedQuery, // immediate fetch
useLazyGetKeyMetricsPagedQuery, // lazy fetch
useGetKeyMetricQuery, useGetKeyMetricsQuery, useAddKeyMetricMutation, useUpdateKeyMetricMutation, useDeleteKeyMetricMutation, } = KeyMetricService;
//# sourceMappingURL=KeyMetricService.js.map