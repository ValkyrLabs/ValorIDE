import { createApi } from '@reduxjs/toolkit/query/react'
import { FileAuditLog } from '@thor/model/FileAuditLog'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type FileAuditLogResponse = FileAuditLog[]

export const FileAuditLogService = createApi({
  reducerPath: 'FileAuditLog', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['FileAuditLog'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getFileAuditLogsPaged: build.query<FileAuditLogResponse, { page: number; size?: number; example?: Partial<FileAuditLog> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `FileAuditLog?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'FileAuditLog' as const, id })),
              { type: 'FileAuditLog', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getFileAuditLogs: build.query<FileAuditLogResponse, { example?: Partial<FileAuditLog> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `FileAuditLog?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `FileAuditLog`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'FileAuditLog' as const, id })),
              { type: 'FileAuditLog', id: 'LIST' },
            ]
          : [{ type: 'FileAuditLog', id: 'LIST' }],
    }),

    // 3) Create
    addFileAuditLog: build.mutation<FileAuditLog, Partial<FileAuditLog>>({
      query: (body) => ({
        url: `FileAuditLog`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'FileAuditLog', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getFileAuditLog: build.query<FileAuditLog, string>({
      query: (id) => `FileAuditLog/${id}`,
      providesTags: (result, error, id) => [{ type: 'FileAuditLog', id }],
    }),

    // 5) Update
    updateFileAuditLog: build.mutation<void, Pick<FileAuditLog, 'id'> & Partial<FileAuditLog>>({
      query: ({ id, ...patch }) => ({
        url: `FileAuditLog/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            FileAuditLogService.util.updateQueryData('getFileAuditLog', id, (draft) => {
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
        { type: 'FileAuditLog', id },
        { type: 'FileAuditLog', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteFileAuditLog: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `FileAuditLog/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'FileAuditLog', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetFileAuditLogsPagedQuery`
export const {
  useGetFileAuditLogsPagedQuery,     // immediate fetch
  useLazyGetFileAuditLogsPagedQuery, // lazy fetch
  useGetFileAuditLogQuery,
  useGetFileAuditLogsQuery,
  useAddFileAuditLogMutation,
  useUpdateFileAuditLogMutation,
  useDeleteFileAuditLogMutation,
} = FileAuditLogService
