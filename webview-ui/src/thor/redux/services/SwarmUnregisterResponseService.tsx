import { createApi } from '@reduxjs/toolkit/query/react'
import { SwarmUnregisterResponse } from '@thor/model/SwarmUnregisterResponse'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type SwarmUnregisterResponseResponse = SwarmUnregisterResponse[]

export const SwarmUnregisterResponseService = createApi({
  reducerPath: 'SwarmUnregisterResponse', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['SwarmUnregisterResponse'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getSwarmUnregisterResponsesPaged: build.query<SwarmUnregisterResponseResponse, { page: number; size?: number; example?: Partial<SwarmUnregisterResponse> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `SwarmUnregisterResponse?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'SwarmUnregisterResponse' as const, id })),
              { type: 'SwarmUnregisterResponse', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getSwarmUnregisterResponses: build.query<SwarmUnregisterResponseResponse, { example?: Partial<SwarmUnregisterResponse> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `SwarmUnregisterResponse?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `SwarmUnregisterResponse`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'SwarmUnregisterResponse' as const, id })),
              { type: 'SwarmUnregisterResponse', id: 'LIST' },
            ]
          : [{ type: 'SwarmUnregisterResponse', id: 'LIST' }],
    }),

    // 3) Create
    addSwarmUnregisterResponse: build.mutation<SwarmUnregisterResponse, Partial<SwarmUnregisterResponse>>({
      query: (body) => ({
        url: `SwarmUnregisterResponse`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'SwarmUnregisterResponse', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getSwarmUnregisterResponse: build.query<SwarmUnregisterResponse, string>({
      query: (id) => `SwarmUnregisterResponse/${id}`,
      providesTags: (result, error, id) => [{ type: 'SwarmUnregisterResponse', id }],
    }),

    // 5) Update
    updateSwarmUnregisterResponse: build.mutation<void, Pick<SwarmUnregisterResponse, 'id'> & Partial<SwarmUnregisterResponse>>({
      query: ({ id, ...patch }) => ({
        url: `SwarmUnregisterResponse/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            SwarmUnregisterResponseService.util.updateQueryData('getSwarmUnregisterResponse', id, (draft) => {
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
        { type: 'SwarmUnregisterResponse', id },
        { type: 'SwarmUnregisterResponse', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteSwarmUnregisterResponse: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `SwarmUnregisterResponse/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'SwarmUnregisterResponse', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetSwarmUnregisterResponsesPagedQuery`
export const {
  useGetSwarmUnregisterResponsesPagedQuery,     // immediate fetch
  useLazyGetSwarmUnregisterResponsesPagedQuery, // lazy fetch
  useGetSwarmUnregisterResponseQuery,
  useGetSwarmUnregisterResponsesQuery,
  useAddSwarmUnregisterResponseMutation,
  useUpdateSwarmUnregisterResponseMutation,
  useDeleteSwarmUnregisterResponseMutation,
} = SwarmUnregisterResponseService
