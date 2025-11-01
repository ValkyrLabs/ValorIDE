import { createApi } from '@reduxjs/toolkit/query/react'
import { AgentEventTrigger } from '@thor/model/AgentEventTrigger'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type AgentEventTriggerResponse = AgentEventTrigger[]

export const AgentEventTriggerService = createApi({
  reducerPath: 'AgentEventTrigger', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['AgentEventTrigger'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getAgentEventTriggersPaged: build.query<AgentEventTriggerResponse, { page: number; size?: number; example?: Partial<AgentEventTrigger> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `AgentEventTrigger?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'AgentEventTrigger' as const, id })),
              { type: 'AgentEventTrigger', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getAgentEventTriggers: build.query<AgentEventTriggerResponse, { example?: Partial<AgentEventTrigger> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `AgentEventTrigger?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `AgentEventTrigger`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'AgentEventTrigger' as const, id })),
              { type: 'AgentEventTrigger', id: 'LIST' },
            ]
          : [{ type: 'AgentEventTrigger', id: 'LIST' }],
    }),

    // 3) Create
    addAgentEventTrigger: build.mutation<AgentEventTrigger, Partial<AgentEventTrigger>>({
      query: (body) => ({
        url: `AgentEventTrigger`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'AgentEventTrigger', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getAgentEventTrigger: build.query<AgentEventTrigger, string>({
      query: (id) => `AgentEventTrigger/${id}`,
      providesTags: (result, error, id) => [{ type: 'AgentEventTrigger', id }],
    }),

    // 5) Update
    updateAgentEventTrigger: build.mutation<void, Pick<AgentEventTrigger, 'id'> & Partial<AgentEventTrigger>>({
      query: ({ id, ...patch }) => ({
        url: `AgentEventTrigger/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            AgentEventTriggerService.util.updateQueryData('getAgentEventTrigger', id, (draft) => {
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
        { type: 'AgentEventTrigger', id },
        { type: 'AgentEventTrigger', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteAgentEventTrigger: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `AgentEventTrigger/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'AgentEventTrigger', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetAgentEventTriggersPagedQuery`
export const {
  useGetAgentEventTriggersPagedQuery,     // immediate fetch
  useLazyGetAgentEventTriggersPagedQuery, // lazy fetch
  useGetAgentEventTriggerQuery,
  useGetAgentEventTriggersQuery,
  useAddAgentEventTriggerMutation,
  useUpdateAgentEventTriggerMutation,
  useDeleteAgentEventTriggerMutation,
} = AgentEventTriggerService
