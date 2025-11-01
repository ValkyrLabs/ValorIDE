import { createApi } from '@reduxjs/toolkit/query/react'
import { FileDownloadToken } from '@thor/model/FileDownloadToken'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type FileDownloadTokenResponse = FileDownloadToken[]

export const FileDownloadTokenService = createApi({
  reducerPath: 'FileDownloadToken', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['FileDownloadToken'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getFileDownloadTokensPaged: build.query<FileDownloadTokenResponse, { page: number; size?: number; example?: Partial<FileDownloadToken> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `FileDownloadToken?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'FileDownloadToken' as const, id })),
              { type: 'FileDownloadToken', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getFileDownloadTokens: build.query<FileDownloadTokenResponse, { example?: Partial<FileDownloadToken> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `FileDownloadToken?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `FileDownloadToken`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'FileDownloadToken' as const, id })),
              { type: 'FileDownloadToken', id: 'LIST' },
            ]
          : [{ type: 'FileDownloadToken', id: 'LIST' }],
    }),

    // 3) Create
    addFileDownloadToken: build.mutation<FileDownloadToken, Partial<FileDownloadToken>>({
      query: (body) => ({
        url: `FileDownloadToken`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'FileDownloadToken', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getFileDownloadToken: build.query<FileDownloadToken, string>({
      query: (id) => `FileDownloadToken/${id}`,
      providesTags: (result, error, id) => [{ type: 'FileDownloadToken', id }],
    }),

    // 5) Update
    updateFileDownloadToken: build.mutation<void, Pick<FileDownloadToken, 'id'> & Partial<FileDownloadToken>>({
      query: ({ id, ...patch }) => ({
        url: `FileDownloadToken/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            FileDownloadTokenService.util.updateQueryData('getFileDownloadToken', id, (draft) => {
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
        { type: 'FileDownloadToken', id },
        { type: 'FileDownloadToken', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteFileDownloadToken: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `FileDownloadToken/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'FileDownloadToken', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetFileDownloadTokensPagedQuery`
export const {
  useGetFileDownloadTokensPagedQuery,     // immediate fetch
  useLazyGetFileDownloadTokensPagedQuery, // lazy fetch
  useGetFileDownloadTokenQuery,
  useGetFileDownloadTokensQuery,
  useAddFileDownloadTokenMutation,
  useUpdateFileDownloadTokenMutation,
  useDeleteFileDownloadTokenMutation,
} = FileDownloadTokenService
