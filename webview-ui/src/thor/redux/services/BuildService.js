import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const BuildService = createApi({
    reducerPath: 'Build', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['Build'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getBuildsPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `Build?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'Build', id })),
                    { type: 'Build', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getBuilds: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `Build?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `Build`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'Build', id })),
                    { type: 'Build', id: 'LIST' },
                ]
                : [{ type: 'Build', id: 'LIST' }],
        }),
        // 3) Create
        addBuild: build.mutation({
            query: (body) => ({
                url: `Build`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'Build', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getBuild: build.query({
            query: (id) => `Build/${id}`,
            providesTags: (result, error, id) => [{ type: 'Build', id }],
        }),
        // 5) Update
        updateBuild: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `Build/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(BuildService.util.updateQueryData('getBuild', id, (draft) => {
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
                { type: 'Build', id },
                { type: 'Build', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteBuild: build.mutation({
            query(id) {
                return {
                    url: `Build/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'Build', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetBuildsPagedQuery`
export const { useGetBuildsPagedQuery, // immediate fetch
useLazyGetBuildsPagedQuery, // lazy fetch
useGetBuildQuery, useGetBuildsQuery, useAddBuildMutation, useUpdateBuildMutation, useDeleteBuildMutation, } = BuildService;
//# sourceMappingURL=BuildService.js.map