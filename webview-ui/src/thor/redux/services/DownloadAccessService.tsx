import { createApi } from '@reduxjs/toolkit/query/react'
import { DownloadAccess } from '@thor/model/DownloadAccess'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type DownloadAccessResponse = DownloadAccess[]

export const DownloadAccessService = createApi({
  reducerPath: 'DownloadAccess', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['DownloadAccess'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getDownloadAccesssPaged: build.query<DownloadAccessResponse, { page: number; size?: number; example?: Partial<DownloadAccess> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `DownloadAccess?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'DownloadAccess' as const, id })),
              { type: 'DownloadAccess', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getDownloadAccesss: build.query<DownloadAccessResponse, { example?: Partial<DownloadAccess> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `DownloadAccess?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `DownloadAccess`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'DownloadAccess' as const, id })),
              { type: 'DownloadAccess', id: 'LIST' },
            ]
          : [{ type: 'DownloadAccess', id: 'LIST' }],
    }),

    // 3) Create
    addDownloadAccess: build.mutation<DownloadAccess, Partial<DownloadAccess>>({
      query: (body) => ({
        url: `DownloadAccess`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'DownloadAccess', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getDownloadAccess: build.query<DownloadAccess, string>({
      query: (id) => `DownloadAccess/${id}`,
      providesTags: (result, error, id) => [{ type: 'DownloadAccess', id }],
    }),

    // 5) Update
    updateDownloadAccess: build.mutation<void, Pick<DownloadAccess, 'id'> & Partial<DownloadAccess>>({
      query: ({ id, ...patch }) => ({
        url: `DownloadAccess/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            DownloadAccessService.util.updateQueryData('getDownloadAccess', id, (draft) => {
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
        { type: 'DownloadAccess', id },
        { type: 'DownloadAccess', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteDownloadAccess: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `DownloadAccess/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'DownloadAccess', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetDownloadAccesssPagedQuery`
export const {
  useGetDownloadAccesssPagedQuery,     // immediate fetch
  useLazyGetDownloadAccesssPagedQuery, // lazy fetch
  useGetDownloadAccessQuery,
  useGetDownloadAccesssQuery,
  useAddDownloadAccessMutation,
  useUpdateDownloadAccessMutation,
  useDeleteDownloadAccessMutation,
} = DownloadAccessService
