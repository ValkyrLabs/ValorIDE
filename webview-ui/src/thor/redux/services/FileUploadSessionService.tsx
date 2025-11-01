import { createApi } from '@reduxjs/toolkit/query/react'
import { FileUploadSession } from '@thor/model/FileUploadSession'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type FileUploadSessionResponse = FileUploadSession[]

export const FileUploadSessionService = createApi({
  reducerPath: 'FileUploadSession', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['FileUploadSession'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getFileUploadSessionsPaged: build.query<FileUploadSessionResponse, { page: number; size?: number; example?: Partial<FileUploadSession> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `FileUploadSession?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'FileUploadSession' as const, id })),
              { type: 'FileUploadSession', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getFileUploadSessions: build.query<FileUploadSessionResponse, { example?: Partial<FileUploadSession> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `FileUploadSession?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `FileUploadSession`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'FileUploadSession' as const, id })),
              { type: 'FileUploadSession', id: 'LIST' },
            ]
          : [{ type: 'FileUploadSession', id: 'LIST' }],
    }),

    // 3) Create
    addFileUploadSession: build.mutation<FileUploadSession, Partial<FileUploadSession>>({
      query: (body) => ({
        url: `FileUploadSession`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'FileUploadSession', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getFileUploadSession: build.query<FileUploadSession, string>({
      query: (id) => `FileUploadSession/${id}`,
      providesTags: (result, error, id) => [{ type: 'FileUploadSession', id }],
    }),

    // 5) Update
    updateFileUploadSession: build.mutation<void, Pick<FileUploadSession, 'id'> & Partial<FileUploadSession>>({
      query: ({ id, ...patch }) => ({
        url: `FileUploadSession/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            FileUploadSessionService.util.updateQueryData('getFileUploadSession', id, (draft) => {
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
        { type: 'FileUploadSession', id },
        { type: 'FileUploadSession', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteFileUploadSession: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `FileUploadSession/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'FileUploadSession', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetFileUploadSessionsPagedQuery`
export const {
  useGetFileUploadSessionsPagedQuery,     // immediate fetch
  useLazyGetFileUploadSessionsPagedQuery, // lazy fetch
  useGetFileUploadSessionQuery,
  useGetFileUploadSessionsQuery,
  useAddFileUploadSessionMutation,
  useUpdateFileUploadSessionMutation,
  useDeleteFileUploadSessionMutation,
} = FileUploadSessionService
