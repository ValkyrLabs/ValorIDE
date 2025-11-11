import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const RunService = createApi({
    reducerPath: 'Run', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['Run'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getRunsPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `Run?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'Run', id })),
                    { type: 'Run', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getRuns: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `Run?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `Run`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'Run', id })),
                    { type: 'Run', id: 'LIST' },
                ]
                : [{ type: 'Run', id: 'LIST' }],
        }),
        // 3) Create
        addRun: build.mutation({
            query: (body) => ({
                url: `Run`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'Run', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getRun: build.query({
            query: (id) => `Run/${id}`,
            providesTags: (result, error, id) => [{ type: 'Run', id }],
        }),
        // 5) Update
        updateRun: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `Run/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(RunService.util.updateQueryData('getRun', id, (draft) => {
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
                { type: 'Run', id },
                { type: 'Run', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteRun: build.mutation({
            query(id) {
                return {
                    url: `Run/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'Run', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetRunsPagedQuery`
export const { useGetRunsPagedQuery, // immediate fetch
useLazyGetRunsPagedQuery, // lazy fetch
useGetRunQuery, useGetRunsQuery, useAddRunMutation, useUpdateRunMutation, useDeleteRunMutation, } = RunService;
//# sourceMappingURL=RunService.js.map