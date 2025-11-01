import { createApi } from '@reduxjs/toolkit/query/react'
import { SwarmGraphSnapshot } from '@thor/model/SwarmGraphSnapshot'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type SwarmGraphSnapshotResponse = SwarmGraphSnapshot[]

export const SwarmGraphSnapshotService = createApi({
  reducerPath: 'SwarmGraphSnapshot', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['SwarmGraphSnapshot'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getSwarmGraphSnapshotsPaged: build.query<SwarmGraphSnapshotResponse, { page: number; size?: number; example?: Partial<SwarmGraphSnapshot> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `SwarmGraphSnapshot?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'SwarmGraphSnapshot' as const, id })),
              { type: 'SwarmGraphSnapshot', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getSwarmGraphSnapshots: build.query<SwarmGraphSnapshotResponse, { example?: Partial<SwarmGraphSnapshot> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `SwarmGraphSnapshot?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `SwarmGraphSnapshot`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'SwarmGraphSnapshot' as const, id })),
              { type: 'SwarmGraphSnapshot', id: 'LIST' },
            ]
          : [{ type: 'SwarmGraphSnapshot', id: 'LIST' }],
    }),

    // 3) Create
    addSwarmGraphSnapshot: build.mutation<SwarmGraphSnapshot, Partial<SwarmGraphSnapshot>>({
      query: (body) => ({
        url: `SwarmGraphSnapshot`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'SwarmGraphSnapshot', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getSwarmGraphSnapshot: build.query<SwarmGraphSnapshot, string>({
      query: (id) => `SwarmGraphSnapshot/${id}`,
      providesTags: (result, error, id) => [{ type: 'SwarmGraphSnapshot', id }],
    }),

    // 5) Update
    updateSwarmGraphSnapshot: build.mutation<void, Pick<SwarmGraphSnapshot, 'id'> & Partial<SwarmGraphSnapshot>>({
      query: ({ id, ...patch }) => ({
        url: `SwarmGraphSnapshot/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            SwarmGraphSnapshotService.util.updateQueryData('getSwarmGraphSnapshot', id, (draft) => {
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
        { type: 'SwarmGraphSnapshot', id },
        { type: 'SwarmGraphSnapshot', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteSwarmGraphSnapshot: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `SwarmGraphSnapshot/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'SwarmGraphSnapshot', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetSwarmGraphSnapshotsPagedQuery`
export const {
  useGetSwarmGraphSnapshotsPagedQuery,     // immediate fetch
  useLazyGetSwarmGraphSnapshotsPagedQuery, // lazy fetch
  useGetSwarmGraphSnapshotQuery,
  useGetSwarmGraphSnapshotsQuery,
  useAddSwarmGraphSnapshotMutation,
  useUpdateSwarmGraphSnapshotMutation,
  useDeleteSwarmGraphSnapshotMutation,
} = SwarmGraphSnapshotService
