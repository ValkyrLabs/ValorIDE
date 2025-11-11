import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const FileRecordService = createApi({
    reducerPath: 'FileRecord', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['FileRecord'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getFileRecordsPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `FileRecord?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'FileRecord', id })),
                    { type: 'FileRecord', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getFileRecords: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `FileRecord?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `FileRecord`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'FileRecord', id })),
                    { type: 'FileRecord', id: 'LIST' },
                ]
                : [{ type: 'FileRecord', id: 'LIST' }],
        }),
        // 3) Create
        addFileRecord: build.mutation({
            query: (body) => ({
                url: `FileRecord`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'FileRecord', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getFileRecord: build.query({
            query: (id) => `FileRecord/${id}`,
            providesTags: (result, error, id) => [{ type: 'FileRecord', id }],
        }),
        // 5) Update
        updateFileRecord: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `FileRecord/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(FileRecordService.util.updateQueryData('getFileRecord', id, (draft) => {
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
                { type: 'FileRecord', id },
                { type: 'FileRecord', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteFileRecord: build.mutation({
            query(id) {
                return {
                    url: `FileRecord/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'FileRecord', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetFileRecordsPagedQuery`
export const { useGetFileRecordsPagedQuery, // immediate fetch
useLazyGetFileRecordsPagedQuery, // lazy fetch
useGetFileRecordQuery, useGetFileRecordsQuery, useAddFileRecordMutation, useUpdateFileRecordMutation, useDeleteFileRecordMutation, } = FileRecordService;
//# sourceMappingURL=FileRecordService.js.map