import { createApi } from '@reduxjs/toolkit/query/react'
import { DiscardDeadLetterEntryRequest } from '@thor/model/DiscardDeadLetterEntryRequest'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type DiscardDeadLetterEntryRequestResponse = DiscardDeadLetterEntryRequest[]

export const DiscardDeadLetterEntryRequestService = createApi({
  reducerPath: 'DiscardDeadLetterEntryRequest', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['DiscardDeadLetterEntryRequest'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getDiscardDeadLetterEntryRequestsPaged: build.query<DiscardDeadLetterEntryRequestResponse, { page: number; size?: number; example?: Partial<DiscardDeadLetterEntryRequest> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `DiscardDeadLetterEntryRequest?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'DiscardDeadLetterEntryRequest' as const, id })),
              { type: 'DiscardDeadLetterEntryRequest', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getDiscardDeadLetterEntryRequests: build.query<DiscardDeadLetterEntryRequestResponse, { example?: Partial<DiscardDeadLetterEntryRequest> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `DiscardDeadLetterEntryRequest?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `DiscardDeadLetterEntryRequest`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'DiscardDeadLetterEntryRequest' as const, id })),
              { type: 'DiscardDeadLetterEntryRequest', id: 'LIST' },
            ]
          : [{ type: 'DiscardDeadLetterEntryRequest', id: 'LIST' }],
    }),

    // 3) Create
    addDiscardDeadLetterEntryRequest: build.mutation<DiscardDeadLetterEntryRequest, Partial<DiscardDeadLetterEntryRequest>>({
      query: (body) => ({
        url: `DiscardDeadLetterEntryRequest`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'DiscardDeadLetterEntryRequest', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getDiscardDeadLetterEntryRequest: build.query<DiscardDeadLetterEntryRequest, string>({
      query: (id) => `DiscardDeadLetterEntryRequest/${id}`,
      providesTags: (result, error, id) => [{ type: 'DiscardDeadLetterEntryRequest', id }],
    }),

    // 5) Update
    updateDiscardDeadLetterEntryRequest: build.mutation<void, Pick<DiscardDeadLetterEntryRequest, 'id'> & Partial<DiscardDeadLetterEntryRequest>>({
      query: ({ id, ...patch }) => ({
        url: `DiscardDeadLetterEntryRequest/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            DiscardDeadLetterEntryRequestService.util.updateQueryData('getDiscardDeadLetterEntryRequest', id, (draft) => {
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
        { type: 'DiscardDeadLetterEntryRequest', id },
        { type: 'DiscardDeadLetterEntryRequest', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteDiscardDeadLetterEntryRequest: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `DiscardDeadLetterEntryRequest/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'DiscardDeadLetterEntryRequest', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetDiscardDeadLetterEntryRequestsPagedQuery`
export const {
  useGetDiscardDeadLetterEntryRequestsPagedQuery,     // immediate fetch
  useLazyGetDiscardDeadLetterEntryRequestsPagedQuery, // lazy fetch
  useGetDiscardDeadLetterEntryRequestQuery,
  useGetDiscardDeadLetterEntryRequestsQuery,
  useAddDiscardDeadLetterEntryRequestMutation,
  useUpdateDiscardDeadLetterEntryRequestMutation,
  useDeleteDiscardDeadLetterEntryRequestMutation,
} = DiscardDeadLetterEntryRequestService
