import { createApi } from '@reduxjs/toolkit/query/react'
import { Swarm } from '@thor/model/Swarm'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type SwarmResponse = Swarm[]

export const SwarmService = createApi({
  reducerPath: 'Swarm', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['Swarm'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getSwarmsPaged: build.query<SwarmResponse, { page: number; size?: number; example?: Partial<Swarm> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `Swarm?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Swarm' as const, id })),
              { type: 'Swarm', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getSwarms: build.query<SwarmResponse, { example?: Partial<Swarm> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `Swarm?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `Swarm`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Swarm' as const, id })),
              { type: 'Swarm', id: 'LIST' },
            ]
          : [{ type: 'Swarm', id: 'LIST' }],
    }),

    // 3) Create
    addSwarm: build.mutation<Swarm, Partial<Swarm>>({
      query: (body) => ({
        url: `Swarm`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Swarm', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getSwarm: build.query<Swarm, string>({
      query: (id) => `Swarm/${id}`,
      providesTags: (result, error, id) => [{ type: 'Swarm', id }],
    }),

    // 5) Update
    updateSwarm: build.mutation<void, Pick<Swarm, 'id'> & Partial<Swarm>>({
      query: ({ id, ...patch }) => ({
        url: `Swarm/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            SwarmService.util.updateQueryData('getSwarm', id, (draft) => {
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
        { type: 'Swarm', id },
        { type: 'Swarm', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteSwarm: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `Swarm/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'Swarm', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetSwarmsPagedQuery`
export const {
  useGetSwarmsPagedQuery,     // immediate fetch
  useLazyGetSwarmsPagedQuery, // lazy fetch
  useGetSwarmQuery,
  useGetSwarmsQuery,
  useAddSwarmMutation,
  useUpdateSwarmMutation,
  useDeleteSwarmMutation,
} = SwarmService
