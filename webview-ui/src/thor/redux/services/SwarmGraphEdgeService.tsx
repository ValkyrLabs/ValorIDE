import { createApi } from '@reduxjs/toolkit/query/react'
import { SwarmGraphEdge } from '@thor/model/SwarmGraphEdge'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type SwarmGraphEdgeResponse = SwarmGraphEdge[]

export const SwarmGraphEdgeService = createApi({
  reducerPath: 'SwarmGraphEdge', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['SwarmGraphEdge'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getSwarmGraphEdgesPaged: build.query<SwarmGraphEdgeResponse, { page: number; size?: number; example?: Partial<SwarmGraphEdge> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `SwarmGraphEdge?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'SwarmGraphEdge' as const, id })),
              { type: 'SwarmGraphEdge', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getSwarmGraphEdges: build.query<SwarmGraphEdgeResponse, { example?: Partial<SwarmGraphEdge> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `SwarmGraphEdge?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `SwarmGraphEdge`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'SwarmGraphEdge' as const, id })),
              { type: 'SwarmGraphEdge', id: 'LIST' },
            ]
          : [{ type: 'SwarmGraphEdge', id: 'LIST' }],
    }),

    // 3) Create
    addSwarmGraphEdge: build.mutation<SwarmGraphEdge, Partial<SwarmGraphEdge>>({
      query: (body) => ({
        url: `SwarmGraphEdge`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'SwarmGraphEdge', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getSwarmGraphEdge: build.query<SwarmGraphEdge, string>({
      query: (id) => `SwarmGraphEdge/${id}`,
      providesTags: (result, error, id) => [{ type: 'SwarmGraphEdge', id }],
    }),

    // 5) Update
    updateSwarmGraphEdge: build.mutation<void, Pick<SwarmGraphEdge, 'id'> & Partial<SwarmGraphEdge>>({
      query: ({ id, ...patch }) => ({
        url: `SwarmGraphEdge/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            SwarmGraphEdgeService.util.updateQueryData('getSwarmGraphEdge', id, (draft) => {
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
        { type: 'SwarmGraphEdge', id },
        { type: 'SwarmGraphEdge', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteSwarmGraphEdge: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `SwarmGraphEdge/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'SwarmGraphEdge', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetSwarmGraphEdgesPagedQuery`
export const {
  useGetSwarmGraphEdgesPagedQuery,     // immediate fetch
  useLazyGetSwarmGraphEdgesPagedQuery, // lazy fetch
  useGetSwarmGraphEdgeQuery,
  useGetSwarmGraphEdgesQuery,
  useAddSwarmGraphEdgeMutation,
  useUpdateSwarmGraphEdgeMutation,
  useDeleteSwarmGraphEdgeMutation,
} = SwarmGraphEdgeService
