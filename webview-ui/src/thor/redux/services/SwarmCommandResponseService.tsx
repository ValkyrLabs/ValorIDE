import { createApi } from '@reduxjs/toolkit/query/react'
import { SwarmCommandResponse } from '@thor/model/SwarmCommandResponse'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type SwarmCommandResponseResponse = SwarmCommandResponse[]

export const SwarmCommandResponseService = createApi({
  reducerPath: 'SwarmCommandResponse', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['SwarmCommandResponse'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getSwarmCommandResponsesPaged: build.query<SwarmCommandResponseResponse, { page: number; size?: number; example?: Partial<SwarmCommandResponse> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `SwarmCommandResponse?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'SwarmCommandResponse' as const, id })),
              { type: 'SwarmCommandResponse', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getSwarmCommandResponses: build.query<SwarmCommandResponseResponse, { example?: Partial<SwarmCommandResponse> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `SwarmCommandResponse?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `SwarmCommandResponse`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'SwarmCommandResponse' as const, id })),
              { type: 'SwarmCommandResponse', id: 'LIST' },
            ]
          : [{ type: 'SwarmCommandResponse', id: 'LIST' }],
    }),

    // 3) Create
    addSwarmCommandResponse: build.mutation<SwarmCommandResponse, Partial<SwarmCommandResponse>>({
      query: (body) => ({
        url: `SwarmCommandResponse`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'SwarmCommandResponse', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getSwarmCommandResponse: build.query<SwarmCommandResponse, string>({
      query: (id) => `SwarmCommandResponse/${id}`,
      providesTags: (result, error, id) => [{ type: 'SwarmCommandResponse', id }],
    }),

    // 5) Update
    updateSwarmCommandResponse: build.mutation<void, Pick<SwarmCommandResponse, 'id'> & Partial<SwarmCommandResponse>>({
      query: ({ id, ...patch }) => ({
        url: `SwarmCommandResponse/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            SwarmCommandResponseService.util.updateQueryData('getSwarmCommandResponse', id, (draft) => {
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
        { type: 'SwarmCommandResponse', id },
        { type: 'SwarmCommandResponse', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteSwarmCommandResponse: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `SwarmCommandResponse/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'SwarmCommandResponse', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetSwarmCommandResponsesPagedQuery`
export const {
  useGetSwarmCommandResponsesPagedQuery,     // immediate fetch
  useLazyGetSwarmCommandResponsesPagedQuery, // lazy fetch
  useGetSwarmCommandResponseQuery,
  useGetSwarmCommandResponsesQuery,
  useAddSwarmCommandResponseMutation,
  useUpdateSwarmCommandResponseMutation,
  useDeleteSwarmCommandResponseMutation,
} = SwarmCommandResponseService
