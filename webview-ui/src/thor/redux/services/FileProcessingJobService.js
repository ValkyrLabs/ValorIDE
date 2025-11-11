import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const FileProcessingJobService = createApi({
    reducerPath: 'FileProcessingJob', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['FileProcessingJob'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getFileProcessingJobsPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `FileProcessingJob?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'FileProcessingJob', id })),
                    { type: 'FileProcessingJob', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getFileProcessingJobs: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `FileProcessingJob?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `FileProcessingJob`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'FileProcessingJob', id })),
                    { type: 'FileProcessingJob', id: 'LIST' },
                ]
                : [{ type: 'FileProcessingJob', id: 'LIST' }],
        }),
        // 3) Create
        addFileProcessingJob: build.mutation({
            query: (body) => ({
                url: `FileProcessingJob`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'FileProcessingJob', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getFileProcessingJob: build.query({
            query: (id) => `FileProcessingJob/${id}`,
            providesTags: (result, error, id) => [{ type: 'FileProcessingJob', id }],
        }),
        // 5) Update
        updateFileProcessingJob: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `FileProcessingJob/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(FileProcessingJobService.util.updateQueryData('getFileProcessingJob', id, (draft) => {
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
                { type: 'FileProcessingJob', id },
                { type: 'FileProcessingJob', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteFileProcessingJob: build.mutation({
            query(id) {
                return {
                    url: `FileProcessingJob/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'FileProcessingJob', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetFileProcessingJobsPagedQuery`
export const { useGetFileProcessingJobsPagedQuery, // immediate fetch
useLazyGetFileProcessingJobsPagedQuery, // lazy fetch
useGetFileProcessingJobQuery, useGetFileProcessingJobsQuery, useAddFileProcessingJobMutation, useUpdateFileProcessingJobMutation, useDeleteFileProcessingJobMutation, } = FileProcessingJobService;
//# sourceMappingURL=FileProcessingJobService.js.map