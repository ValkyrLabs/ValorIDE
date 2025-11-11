import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const ChartSeriesService = createApi({
    reducerPath: 'ChartSeries', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['ChartSeries'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getChartSeriessPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `ChartSeries?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'ChartSeries', id })),
                    { type: 'ChartSeries', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getChartSeriess: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `ChartSeries?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `ChartSeries`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'ChartSeries', id })),
                    { type: 'ChartSeries', id: 'LIST' },
                ]
                : [{ type: 'ChartSeries', id: 'LIST' }],
        }),
        // 3) Create
        addChartSeries: build.mutation({
            query: (body) => ({
                url: `ChartSeries`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'ChartSeries', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getChartSeries: build.query({
            query: (id) => `ChartSeries/${id}`,
            providesTags: (result, error, id) => [{ type: 'ChartSeries', id }],
        }),
        // 5) Update
        updateChartSeries: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `ChartSeries/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(ChartSeriesService.util.updateQueryData('getChartSeries', id, (draft) => {
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
                { type: 'ChartSeries', id },
                { type: 'ChartSeries', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteChartSeries: build.mutation({
            query(id) {
                return {
                    url: `ChartSeries/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'ChartSeries', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetChartSeriessPagedQuery`
export const { useGetChartSeriessPagedQuery, // immediate fetch
useLazyGetChartSeriessPagedQuery, // lazy fetch
useGetChartSeriesQuery, useGetChartSeriessQuery, useAddChartSeriesMutation, useUpdateChartSeriesMutation, useDeleteChartSeriesMutation, } = ChartSeriesService;
//# sourceMappingURL=ChartSeriesService.js.map