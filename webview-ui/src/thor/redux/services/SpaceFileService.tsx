import { createApi } from '@reduxjs/toolkit/query/react'
import { SpaceFile } from '@thor/model/SpaceFile'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type SpaceFileResponse = SpaceFile[]

export const SpaceFileService = createApi({
  reducerPath: 'SpaceFile', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['SpaceFile'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getSpaceFilesPaged: build.query<SpaceFileResponse, { page: number; size?: number; example?: Partial<SpaceFile> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `SpaceFile?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'SpaceFile' as const, id })),
              { type: 'SpaceFile', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getSpaceFiles: build.query<SpaceFileResponse, { example?: Partial<SpaceFile> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `SpaceFile?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `SpaceFile`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'SpaceFile' as const, id })),
              { type: 'SpaceFile', id: 'LIST' },
            ]
          : [{ type: 'SpaceFile', id: 'LIST' }],
    }),

    // 3) Create
    addSpaceFile: build.mutation<SpaceFile, Partial<SpaceFile>>({
      query: (body) => ({
        url: `SpaceFile`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'SpaceFile', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getSpaceFile: build.query<SpaceFile, string>({
      query: (id) => `SpaceFile/${id}`,
      providesTags: (result, error, id) => [{ type: 'SpaceFile', id }],
    }),

    // 5) Update
    updateSpaceFile: build.mutation<void, Pick<SpaceFile, 'id'> & Partial<SpaceFile>>({
      query: ({ id, ...patch }) => ({
        url: `SpaceFile/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            SpaceFileService.util.updateQueryData('getSpaceFile', id, (draft) => {
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
        { type: 'SpaceFile', id },
        { type: 'SpaceFile', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteSpaceFile: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `SpaceFile/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'SpaceFile', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetSpaceFilesPagedQuery`
export const {
  useGetSpaceFilesPagedQuery,     // immediate fetch
  useLazyGetSpaceFilesPagedQuery, // lazy fetch
  useGetSpaceFileQuery,
  useGetSpaceFilesQuery,
  useAddSpaceFileMutation,
  useUpdateSpaceFileMutation,
  useDeleteSpaceFileMutation,
} = SpaceFileService
