import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const SpaceFileService = createApi({
    reducerPath: 'SpaceFile', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['SpaceFile'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getSpaceFilesPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `SpaceFile?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'SpaceFile', id })),
                    { type: 'SpaceFile', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getSpaceFiles: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `SpaceFile?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `SpaceFile`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'SpaceFile', id })),
                    { type: 'SpaceFile', id: 'LIST' },
                ]
                : [{ type: 'SpaceFile', id: 'LIST' }],
        }),
        // 3) Create
        addSpaceFile: build.mutation({
            query: (body) => ({
                url: `SpaceFile`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'SpaceFile', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getSpaceFile: build.query({
            query: (id) => `SpaceFile/${id}`,
            providesTags: (result, error, id) => [{ type: 'SpaceFile', id }],
        }),
        // 5) Update
        updateSpaceFile: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `SpaceFile/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(SpaceFileService.util.updateQueryData('getSpaceFile', id, (draft) => {
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
                { type: 'SpaceFile', id },
                { type: 'SpaceFile', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteSpaceFile: build.mutation({
            query(id) {
                return {
                    url: `SpaceFile/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'SpaceFile', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetSpaceFilesPagedQuery`
export const { useGetSpaceFilesPagedQuery, // immediate fetch
useLazyGetSpaceFilesPagedQuery, // lazy fetch
useGetSpaceFileQuery, useGetSpaceFilesQuery, useAddSpaceFileMutation, useUpdateSpaceFileMutation, useDeleteSpaceFileMutation, } = SpaceFileService;
//# sourceMappingURL=SpaceFileService.js.map