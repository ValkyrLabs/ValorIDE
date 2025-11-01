import { createApi } from '@reduxjs/toolkit/query/react'
import { FileProcessingJob } from '@thor/model/FileProcessingJob'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type FileProcessingJobResponse = FileProcessingJob[]

export const FileProcessingJobService = createApi({
  reducerPath: 'FileProcessingJob', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['FileProcessingJob'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getFileProcessingJobsPaged: build.query<FileProcessingJobResponse, { page: number; size?: number; example?: Partial<FileProcessingJob> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `FileProcessingJob?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'FileProcessingJob' as const, id })),
              { type: 'FileProcessingJob', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getFileProcessingJobs: build.query<FileProcessingJobResponse, { example?: Partial<FileProcessingJob> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `FileProcessingJob?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `FileProcessingJob`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'FileProcessingJob' as const, id })),
              { type: 'FileProcessingJob', id: 'LIST' },
            ]
          : [{ type: 'FileProcessingJob', id: 'LIST' }],
    }),

    // 3) Create
    addFileProcessingJob: build.mutation<FileProcessingJob, Partial<FileProcessingJob>>({
      query: (body) => ({
        url: `FileProcessingJob`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'FileProcessingJob', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getFileProcessingJob: build.query<FileProcessingJob, string>({
      query: (id) => `FileProcessingJob/${id}`,
      providesTags: (result, error, id) => [{ type: 'FileProcessingJob', id }],
    }),

    // 5) Update
    updateFileProcessingJob: build.mutation<void, Pick<FileProcessingJob, 'id'> & Partial<FileProcessingJob>>({
      query: ({ id, ...patch }) => ({
        url: `FileProcessingJob/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            FileProcessingJobService.util.updateQueryData('getFileProcessingJob', id, (draft) => {
              Object.assign(draft, patch)
            })
          )
          try {
            await queryFulfilled
          } catch {
            patchResult.undo()
          }
        }
      },
      invalidatesTags: (result, error, { id }) => [
        { type: 'FileProcessingJob', id },
        { type: 'FileProcessingJob', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteFileProcessingJob: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `FileProcessingJob/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'FileProcessingJob', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetFileProcessingJobsPagedQuery`
export const {
  useGetFileProcessingJobsPagedQuery,     // immediate fetch
  useLazyGetFileProcessingJobsPagedQuery, // lazy fetch
  useGetFileProcessingJobQuery,
  useGetFileProcessingJobsQuery,
  useAddFileProcessingJobMutation,
  useUpdateFileProcessingJobMutation,
  useDeleteFileProcessingJobMutation,
} = FileProcessingJobService
