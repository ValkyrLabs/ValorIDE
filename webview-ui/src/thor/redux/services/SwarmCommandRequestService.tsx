import { createApi } from '@reduxjs/toolkit/query/react'
import { SwarmCommandRequest } from '@thor/model/SwarmCommandRequest'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type SwarmCommandRequestResponse = SwarmCommandRequest[]

export const SwarmCommandRequestService = createApi({
  reducerPath: 'SwarmCommandRequest', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['SwarmCommandRequest'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getSwarmCommandRequestsPaged: build.query<SwarmCommandRequestResponse, { page: number; size?: number; example?: Partial<SwarmCommandRequest> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `SwarmCommandRequest?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'SwarmCommandRequest' as const, id })),
              { type: 'SwarmCommandRequest', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getSwarmCommandRequests: build.query<SwarmCommandRequestResponse, { example?: Partial<SwarmCommandRequest> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `SwarmCommandRequest?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `SwarmCommandRequest`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'SwarmCommandRequest' as const, id })),
              { type: 'SwarmCommandRequest', id: 'LIST' },
            ]
          : [{ type: 'SwarmCommandRequest', id: 'LIST' }],
    }),

    // 3) Create
    addSwarmCommandRequest: build.mutation<SwarmCommandRequest, Partial<SwarmCommandRequest>>({
      query: (body) => ({
        url: `SwarmCommandRequest`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'SwarmCommandRequest', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getSwarmCommandRequest: build.query<SwarmCommandRequest, string>({
      query: (id) => `SwarmCommandRequest/${id}`,
      providesTags: (result, error, id) => [{ type: 'SwarmCommandRequest', id }],
    }),

    // 5) Update
    updateSwarmCommandRequest: build.mutation<void, Pick<SwarmCommandRequest, 'id'> & Partial<SwarmCommandRequest>>({
      query: ({ id, ...patch }) => ({
        url: `SwarmCommandRequest/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            SwarmCommandRequestService.util.updateQueryData('getSwarmCommandRequest', id, (draft) => {
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
        { type: 'SwarmCommandRequest', id },
        { type: 'SwarmCommandRequest', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteSwarmCommandRequest: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `SwarmCommandRequest/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'SwarmCommandRequest', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetSwarmCommandRequestsPagedQuery`
export const {
  useGetSwarmCommandRequestsPagedQuery,     // immediate fetch
  useLazyGetSwarmCommandRequestsPagedQuery, // lazy fetch
  useGetSwarmCommandRequestQuery,
  useGetSwarmCommandRequestsQuery,
  useAddSwarmCommandRequestMutation,
  useUpdateSwarmCommandRequestMutation,
  useDeleteSwarmCommandRequestMutation,
} = SwarmCommandRequestService
