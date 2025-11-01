import { createApi } from '@reduxjs/toolkit/query/react'
import { SwarmUnregisterRequest } from '@thor/model/SwarmUnregisterRequest'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type SwarmUnregisterRequestResponse = SwarmUnregisterRequest[]

export const SwarmUnregisterRequestService = createApi({
  reducerPath: 'SwarmUnregisterRequest', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['SwarmUnregisterRequest'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getSwarmUnregisterRequestsPaged: build.query<SwarmUnregisterRequestResponse, { page: number; size?: number; example?: Partial<SwarmUnregisterRequest> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `SwarmUnregisterRequest?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'SwarmUnregisterRequest' as const, id })),
              { type: 'SwarmUnregisterRequest', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getSwarmUnregisterRequests: build.query<SwarmUnregisterRequestResponse, { example?: Partial<SwarmUnregisterRequest> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `SwarmUnregisterRequest?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `SwarmUnregisterRequest`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'SwarmUnregisterRequest' as const, id })),
              { type: 'SwarmUnregisterRequest', id: 'LIST' },
            ]
          : [{ type: 'SwarmUnregisterRequest', id: 'LIST' }],
    }),

    // 3) Create
    addSwarmUnregisterRequest: build.mutation<SwarmUnregisterRequest, Partial<SwarmUnregisterRequest>>({
      query: (body) => ({
        url: `SwarmUnregisterRequest`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'SwarmUnregisterRequest', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getSwarmUnregisterRequest: build.query<SwarmUnregisterRequest, string>({
      query: (id) => `SwarmUnregisterRequest/${id}`,
      providesTags: (result, error, id) => [{ type: 'SwarmUnregisterRequest', id }],
    }),

    // 5) Update
    updateSwarmUnregisterRequest: build.mutation<void, Pick<SwarmUnregisterRequest, 'id'> & Partial<SwarmUnregisterRequest>>({
      query: ({ id, ...patch }) => ({
        url: `SwarmUnregisterRequest/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            SwarmUnregisterRequestService.util.updateQueryData('getSwarmUnregisterRequest', id, (draft) => {
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
        { type: 'SwarmUnregisterRequest', id },
        { type: 'SwarmUnregisterRequest', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteSwarmUnregisterRequest: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `SwarmUnregisterRequest/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'SwarmUnregisterRequest', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetSwarmUnregisterRequestsPagedQuery`
export const {
  useGetSwarmUnregisterRequestsPagedQuery,     // immediate fetch
  useLazyGetSwarmUnregisterRequestsPagedQuery, // lazy fetch
  useGetSwarmUnregisterRequestQuery,
  useGetSwarmUnregisterRequestsQuery,
  useAddSwarmUnregisterRequestMutation,
  useUpdateSwarmUnregisterRequestMutation,
  useDeleteSwarmUnregisterRequestMutation,
} = SwarmUnregisterRequestService
