import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const BuildOutputService = createApi({
    reducerPath: 'BuildOutput', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['BuildOutput'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getBuildOutputsPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `BuildOutput?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'BuildOutput', id })),
                    { type: 'BuildOutput', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getBuildOutputs: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `BuildOutput?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `BuildOutput`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'BuildOutput', id })),
                    { type: 'BuildOutput', id: 'LIST' },
                ]
                : [{ type: 'BuildOutput', id: 'LIST' }],
        }),
        // 3) Create
        addBuildOutput: build.mutation({
            query: (body) => ({
                url: `BuildOutput`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'BuildOutput', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getBuildOutput: build.query({
            query: (id) => `BuildOutput/${id}`,
            providesTags: (result, error, id) => [{ type: 'BuildOutput', id }],
        }),
        // 5) Update
        updateBuildOutput: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `BuildOutput/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(BuildOutputService.util.updateQueryData('getBuildOutput', id, (draft) => {
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
                { type: 'BuildOutput', id },
                { type: 'BuildOutput', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteBuildOutput: build.mutation({
            query(id) {
                return {
                    url: `BuildOutput/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'BuildOutput', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetBuildOutputsPagedQuery`
export const { useGetBuildOutputsPagedQuery, // immediate fetch
useLazyGetBuildOutputsPagedQuery, // lazy fetch
useGetBuildOutputQuery, useGetBuildOutputsQuery, useAddBuildOutputMutation, useUpdateBuildOutputMutation, useDeleteBuildOutputMutation, } = BuildOutputService;
//# sourceMappingURL=BuildOutputService.js.map