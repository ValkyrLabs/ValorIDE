import { createApi } from '@reduxjs/toolkit/query/react'
import { RequeueDeadLetterEntryRequest } from '@thor/model/RequeueDeadLetterEntryRequest'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type RequeueDeadLetterEntryRequestResponse = RequeueDeadLetterEntryRequest[]

export const RequeueDeadLetterEntryRequestService = createApi({
  reducerPath: 'RequeueDeadLetterEntryRequest', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['RequeueDeadLetterEntryRequest'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getRequeueDeadLetterEntryRequestsPaged: build.query<RequeueDeadLetterEntryRequestResponse, { page: number; size?: number; example?: Partial<RequeueDeadLetterEntryRequest> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `RequeueDeadLetterEntryRequest?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'RequeueDeadLetterEntryRequest' as const, id })),
              { type: 'RequeueDeadLetterEntryRequest', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getRequeueDeadLetterEntryRequests: build.query<RequeueDeadLetterEntryRequestResponse, { example?: Partial<RequeueDeadLetterEntryRequest> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `RequeueDeadLetterEntryRequest?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `RequeueDeadLetterEntryRequest`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'RequeueDeadLetterEntryRequest' as const, id })),
              { type: 'RequeueDeadLetterEntryRequest', id: 'LIST' },
            ]
          : [{ type: 'RequeueDeadLetterEntryRequest', id: 'LIST' }],
    }),

    // 3) Create
    addRequeueDeadLetterEntryRequest: build.mutation<RequeueDeadLetterEntryRequest, Partial<RequeueDeadLetterEntryRequest>>({
      query: (body) => ({
        url: `RequeueDeadLetterEntryRequest`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'RequeueDeadLetterEntryRequest', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getRequeueDeadLetterEntryRequest: build.query<RequeueDeadLetterEntryRequest, string>({
      query: (id) => `RequeueDeadLetterEntryRequest/${id}`,
      providesTags: (result, error, id) => [{ type: 'RequeueDeadLetterEntryRequest', id }],
    }),

    // 5) Update
    updateRequeueDeadLetterEntryRequest: build.mutation<void, Pick<RequeueDeadLetterEntryRequest, 'id'> & Partial<RequeueDeadLetterEntryRequest>>({
      query: ({ id, ...patch }) => ({
        url: `RequeueDeadLetterEntryRequest/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            RequeueDeadLetterEntryRequestService.util.updateQueryData('getRequeueDeadLetterEntryRequest', id, (draft) => {
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
        { type: 'RequeueDeadLetterEntryRequest', id },
        { type: 'RequeueDeadLetterEntryRequest', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteRequeueDeadLetterEntryRequest: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `RequeueDeadLetterEntryRequest/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'RequeueDeadLetterEntryRequest', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetRequeueDeadLetterEntryRequestsPagedQuery`
export const {
  useGetRequeueDeadLetterEntryRequestsPagedQuery,     // immediate fetch
  useLazyGetRequeueDeadLetterEntryRequestsPagedQuery, // lazy fetch
  useGetRequeueDeadLetterEntryRequestQuery,
  useGetRequeueDeadLetterEntryRequestsQuery,
  useAddRequeueDeadLetterEntryRequestMutation,
  useUpdateRequeueDeadLetterEntryRequestMutation,
  useDeleteRequeueDeadLetterEntryRequestMutation,
} = RequeueDeadLetterEntryRequestService
