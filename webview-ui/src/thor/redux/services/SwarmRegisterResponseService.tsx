import { createApi } from '@reduxjs/toolkit/query/react'
import { SwarmRegisterResponse } from '@thor/model/SwarmRegisterResponse'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type SwarmRegisterResponseResponse = SwarmRegisterResponse[]

export const SwarmRegisterResponseService = createApi({
  reducerPath: 'SwarmRegisterResponse', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['SwarmRegisterResponse'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getSwarmRegisterResponsesPaged: build.query<SwarmRegisterResponseResponse, { page: number; size?: number; example?: Partial<SwarmRegisterResponse> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `SwarmRegisterResponse?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'SwarmRegisterResponse' as const, id })),
              { type: 'SwarmRegisterResponse', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getSwarmRegisterResponses: build.query<SwarmRegisterResponseResponse, { example?: Partial<SwarmRegisterResponse> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `SwarmRegisterResponse?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `SwarmRegisterResponse`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'SwarmRegisterResponse' as const, id })),
              { type: 'SwarmRegisterResponse', id: 'LIST' },
            ]
          : [{ type: 'SwarmRegisterResponse', id: 'LIST' }],
    }),

    // 3) Create
    addSwarmRegisterResponse: build.mutation<SwarmRegisterResponse, Partial<SwarmRegisterResponse>>({
      query: (body) => ({
        url: `SwarmRegisterResponse`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'SwarmRegisterResponse', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getSwarmRegisterResponse: build.query<SwarmRegisterResponse, string>({
      query: (id) => `SwarmRegisterResponse/${id}`,
      providesTags: (result, error, id) => [{ type: 'SwarmRegisterResponse', id }],
    }),

    // 5) Update
    updateSwarmRegisterResponse: build.mutation<void, Pick<SwarmRegisterResponse, 'id'> & Partial<SwarmRegisterResponse>>({
      query: ({ id, ...patch }) => ({
        url: `SwarmRegisterResponse/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            SwarmRegisterResponseService.util.updateQueryData('getSwarmRegisterResponse', id, (draft) => {
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
        { type: 'SwarmRegisterResponse', id },
        { type: 'SwarmRegisterResponse', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteSwarmRegisterResponse: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `SwarmRegisterResponse/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'SwarmRegisterResponse', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetSwarmRegisterResponsesPagedQuery`
export const {
  useGetSwarmRegisterResponsesPagedQuery,     // immediate fetch
  useLazyGetSwarmRegisterResponsesPagedQuery, // lazy fetch
  useGetSwarmRegisterResponseQuery,
  useGetSwarmRegisterResponsesQuery,
  useAddSwarmRegisterResponseMutation,
  useUpdateSwarmRegisterResponseMutation,
  useDeleteSwarmRegisterResponseMutation,
} = SwarmRegisterResponseService
