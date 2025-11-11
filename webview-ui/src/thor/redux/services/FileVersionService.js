import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const FileVersionService = createApi({
    reducerPath: 'FileVersion', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['FileVersion'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getFileVersionsPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `FileVersion?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'FileVersion', id })),
                    { type: 'FileVersion', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getFileVersions: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `FileVersion?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `FileVersion`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'FileVersion', id })),
                    { type: 'FileVersion', id: 'LIST' },
                ]
                : [{ type: 'FileVersion', id: 'LIST' }],
        }),
        // 3) Create
        addFileVersion: build.mutation({
            query: (body) => ({
                url: `FileVersion`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'FileVersion', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getFileVersion: build.query({
            query: (id) => `FileVersion/${id}`,
            providesTags: (result, error, id) => [{ type: 'FileVersion', id }],
        }),
        // 5) Update
        updateFileVersion: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `FileVersion/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(FileVersionService.util.updateQueryData('getFileVersion', id, (draft) => {
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
                { type: 'FileVersion', id },
                { type: 'FileVersion', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteFileVersion: build.mutation({
            query(id) {
                return {
                    url: `FileVersion/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'FileVersion', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetFileVersionsPagedQuery`
export const { useGetFileVersionsPagedQuery, // immediate fetch
useLazyGetFileVersionsPagedQuery, // lazy fetch
useGetFileVersionQuery, useGetFileVersionsQuery, useAddFileVersionMutation, useUpdateFileVersionMutation, useDeleteFileVersionMutation, } = FileVersionService;
//# sourceMappingURL=FileVersionService.js.map