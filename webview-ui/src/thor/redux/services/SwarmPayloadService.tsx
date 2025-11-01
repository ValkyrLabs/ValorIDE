import { createApi } from '@reduxjs/toolkit/query/react'
import { SwarmPayload } from '@thor/model/SwarmPayload'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type SwarmPayloadResponse = SwarmPayload[]

export const SwarmPayloadService = createApi({
  reducerPath: 'SwarmPayload', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['SwarmPayload'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getSwarmPayloadsPaged: build.query<SwarmPayloadResponse, { page: number; size?: number; example?: Partial<SwarmPayload> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `SwarmPayload?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'SwarmPayload' as const, id })),
              { type: 'SwarmPayload', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getSwarmPayloads: build.query<SwarmPayloadResponse, { example?: Partial<SwarmPayload> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `SwarmPayload?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `SwarmPayload`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'SwarmPayload' as const, id })),
              { type: 'SwarmPayload', id: 'LIST' },
            ]
          : [{ type: 'SwarmPayload', id: 'LIST' }],
    }),

    // 3) Create
    addSwarmPayload: build.mutation<SwarmPayload, Partial<SwarmPayload>>({
      query: (body) => ({
        url: `SwarmPayload`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'SwarmPayload', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getSwarmPayload: build.query<SwarmPayload, string>({
      query: (id) => `SwarmPayload/${id}`,
      providesTags: (result, error, id) => [{ type: 'SwarmPayload', id }],
    }),

    // 5) Update
    updateSwarmPayload: build.mutation<void, Pick<SwarmPayload, 'id'> & Partial<SwarmPayload>>({
      query: ({ id, ...patch }) => ({
        url: `SwarmPayload/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            SwarmPayloadService.util.updateQueryData('getSwarmPayload', id, (draft) => {
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
        { type: 'SwarmPayload', id },
        { type: 'SwarmPayload', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteSwarmPayload: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `SwarmPayload/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'SwarmPayload', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetSwarmPayloadsPagedQuery`
export const {
  useGetSwarmPayloadsPagedQuery,     // immediate fetch
  useLazyGetSwarmPayloadsPagedQuery, // lazy fetch
  useGetSwarmPayloadQuery,
  useGetSwarmPayloadsQuery,
  useAddSwarmPayloadMutation,
  useUpdateSwarmPayloadMutation,
  useDeleteSwarmPayloadMutation,
} = SwarmPayloadService
