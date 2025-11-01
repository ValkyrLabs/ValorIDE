import { createApi } from '@reduxjs/toolkit/query/react'
import { RequeueDeadLetterEntryResponse } from '@thor/model/RequeueDeadLetterEntryResponse'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type RequeueDeadLetterEntryResponseResponse = RequeueDeadLetterEntryResponse[]

export const RequeueDeadLetterEntryResponseService = createApi({
  reducerPath: 'RequeueDeadLetterEntryResponse', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['RequeueDeadLetterEntryResponse'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getRequeueDeadLetterEntryResponsesPaged: build.query<RequeueDeadLetterEntryResponseResponse, { page: number; size?: number; example?: Partial<RequeueDeadLetterEntryResponse> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `RequeueDeadLetterEntryResponse?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'RequeueDeadLetterEntryResponse' as const, id })),
              { type: 'RequeueDeadLetterEntryResponse', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getRequeueDeadLetterEntryResponses: build.query<RequeueDeadLetterEntryResponseResponse, { example?: Partial<RequeueDeadLetterEntryResponse> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `RequeueDeadLetterEntryResponse?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `RequeueDeadLetterEntryResponse`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'RequeueDeadLetterEntryResponse' as const, id })),
              { type: 'RequeueDeadLetterEntryResponse', id: 'LIST' },
            ]
          : [{ type: 'RequeueDeadLetterEntryResponse', id: 'LIST' }],
    }),

    // 3) Create
    addRequeueDeadLetterEntryResponse: build.mutation<RequeueDeadLetterEntryResponse, Partial<RequeueDeadLetterEntryResponse>>({
      query: (body) => ({
        url: `RequeueDeadLetterEntryResponse`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'RequeueDeadLetterEntryResponse', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getRequeueDeadLetterEntryResponse: build.query<RequeueDeadLetterEntryResponse, string>({
      query: (id) => `RequeueDeadLetterEntryResponse/${id}`,
      providesTags: (result, error, id) => [{ type: 'RequeueDeadLetterEntryResponse', id }],
    }),

    // 5) Update
    updateRequeueDeadLetterEntryResponse: build.mutation<void, Pick<RequeueDeadLetterEntryResponse, 'id'> & Partial<RequeueDeadLetterEntryResponse>>({
      query: ({ id, ...patch }) => ({
        url: `RequeueDeadLetterEntryResponse/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            RequeueDeadLetterEntryResponseService.util.updateQueryData('getRequeueDeadLetterEntryResponse', id, (draft) => {
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
        { type: 'RequeueDeadLetterEntryResponse', id },
        { type: 'RequeueDeadLetterEntryResponse', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteRequeueDeadLetterEntryResponse: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `RequeueDeadLetterEntryResponse/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'RequeueDeadLetterEntryResponse', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetRequeueDeadLetterEntryResponsesPagedQuery`
export const {
  useGetRequeueDeadLetterEntryResponsesPagedQuery,     // immediate fetch
  useLazyGetRequeueDeadLetterEntryResponsesPagedQuery, // lazy fetch
  useGetRequeueDeadLetterEntryResponseQuery,
  useGetRequeueDeadLetterEntryResponsesQuery,
  useAddRequeueDeadLetterEntryResponseMutation,
  useUpdateRequeueDeadLetterEntryResponseMutation,
  useDeleteRequeueDeadLetterEntryResponseMutation,
} = RequeueDeadLetterEntryResponseService
