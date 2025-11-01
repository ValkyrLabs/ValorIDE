import { createApi } from '@reduxjs/toolkit/query/react'
import { Agent } from '@thor/model/Agent'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type AgentResponse = Agent[]

export const AgentService = createApi({
  reducerPath: 'Agent', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['Agent'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getAgentsPaged: build.query<AgentResponse, { page: number; size?: number; example?: Partial<Agent> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `Agent?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Agent' as const, id })),
              { type: 'Agent', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getAgents: build.query<AgentResponse, { example?: Partial<Agent> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `Agent?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `Agent`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Agent' as const, id })),
              { type: 'Agent', id: 'LIST' },
            ]
          : [{ type: 'Agent', id: 'LIST' }],
    }),

    // 3) Create
    addAgent: build.mutation<Agent, Partial<Agent>>({
      query: (body) => ({
        url: `Agent`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Agent', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getAgent: build.query<Agent, string>({
      query: (id) => `Agent/${id}`,
      providesTags: (result, error, id) => [{ type: 'Agent', id }],
    }),

    // 5) Update
    updateAgent: build.mutation<void, Pick<Agent, 'id'> & Partial<Agent>>({
      query: ({ id, ...patch }) => ({
        url: `Agent/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            AgentService.util.updateQueryData('getAgent', id, (draft) => {
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
        { type: 'Agent', id },
        { type: 'Agent', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteAgent: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `Agent/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'Agent', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetAgentsPagedQuery`
export const {
  useGetAgentsPagedQuery,     // immediate fetch
  useLazyGetAgentsPagedQuery, // lazy fetch
  useGetAgentQuery,
  useGetAgentsQuery,
  useAddAgentMutation,
  useUpdateAgentMutation,
  useDeleteAgentMutation,
} = AgentService
