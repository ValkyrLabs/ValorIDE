import { createApi } from '@reduxjs/toolkit/query/react'
import { ApiMetricSnapshot } from '@thor/model/ApiMetricSnapshot'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type ApiMetricSnapshotResponse = ApiMetricSnapshot[]

export const ApiMetricSnapshotService = createApi({
  reducerPath: 'ApiMetricSnapshot', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['ApiMetricSnapshot'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getApiMetricSnapshotsPaged: build.query<ApiMetricSnapshotResponse, { page: number; size?: number; example?: Partial<ApiMetricSnapshot> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `ApiMetricSnapshot?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'ApiMetricSnapshot' as const, id })),
              { type: 'ApiMetricSnapshot', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getApiMetricSnapshots: build.query<ApiMetricSnapshotResponse, { example?: Partial<ApiMetricSnapshot> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `ApiMetricSnapshot?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `ApiMetricSnapshot`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'ApiMetricSnapshot' as const, id })),
              { type: 'ApiMetricSnapshot', id: 'LIST' },
            ]
          : [{ type: 'ApiMetricSnapshot', id: 'LIST' }],
    }),

    // 3) Create
    addApiMetricSnapshot: build.mutation<ApiMetricSnapshot, Partial<ApiMetricSnapshot>>({
      query: (body) => ({
        url: `ApiMetricSnapshot`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'ApiMetricSnapshot', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getApiMetricSnapshot: build.query<ApiMetricSnapshot, string>({
      query: (id) => `ApiMetricSnapshot/${id}`,
      providesTags: (result, error, id) => [{ type: 'ApiMetricSnapshot', id }],
    }),

    // 5) Update
    updateApiMetricSnapshot: build.mutation<void, Pick<ApiMetricSnapshot, 'id'> & Partial<ApiMetricSnapshot>>({
      query: ({ id, ...patch }) => ({
        url: `ApiMetricSnapshot/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            ApiMetricSnapshotService.util.updateQueryData('getApiMetricSnapshot', id, (draft) => {
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
        { type: 'ApiMetricSnapshot', id },
        { type: 'ApiMetricSnapshot', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteApiMetricSnapshot: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `ApiMetricSnapshot/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'ApiMetricSnapshot', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetApiMetricSnapshotsPagedQuery`
export const {
  useGetApiMetricSnapshotsPagedQuery,     // immediate fetch
  useLazyGetApiMetricSnapshotsPagedQuery, // lazy fetch
  useGetApiMetricSnapshotQuery,
  useGetApiMetricSnapshotsQuery,
  useAddApiMetricSnapshotMutation,
  useUpdateApiMetricSnapshotMutation,
  useDeleteApiMetricSnapshotMutation,
} = ApiMetricSnapshotService
