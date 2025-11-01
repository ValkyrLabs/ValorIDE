import { createApi } from '@reduxjs/toolkit/query/react'
import { DiscardDeadLetterEntryResponse } from '@thor/model/DiscardDeadLetterEntryResponse'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type DiscardDeadLetterEntryResponseResponse = DiscardDeadLetterEntryResponse[]

export const DiscardDeadLetterEntryResponseService = createApi({
  reducerPath: 'DiscardDeadLetterEntryResponse', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['DiscardDeadLetterEntryResponse'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getDiscardDeadLetterEntryResponsesPaged: build.query<DiscardDeadLetterEntryResponseResponse, { page: number; size?: number; example?: Partial<DiscardDeadLetterEntryResponse> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `DiscardDeadLetterEntryResponse?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'DiscardDeadLetterEntryResponse' as const, id })),
              { type: 'DiscardDeadLetterEntryResponse', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getDiscardDeadLetterEntryResponses: build.query<DiscardDeadLetterEntryResponseResponse, { example?: Partial<DiscardDeadLetterEntryResponse> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `DiscardDeadLetterEntryResponse?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `DiscardDeadLetterEntryResponse`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'DiscardDeadLetterEntryResponse' as const, id })),
              { type: 'DiscardDeadLetterEntryResponse', id: 'LIST' },
            ]
          : [{ type: 'DiscardDeadLetterEntryResponse', id: 'LIST' }],
    }),

    // 3) Create
    addDiscardDeadLetterEntryResponse: build.mutation<DiscardDeadLetterEntryResponse, Partial<DiscardDeadLetterEntryResponse>>({
      query: (body) => ({
        url: `DiscardDeadLetterEntryResponse`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'DiscardDeadLetterEntryResponse', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getDiscardDeadLetterEntryResponse: build.query<DiscardDeadLetterEntryResponse, string>({
      query: (id) => `DiscardDeadLetterEntryResponse/${id}`,
      providesTags: (result, error, id) => [{ type: 'DiscardDeadLetterEntryResponse', id }],
    }),

    // 5) Update
    updateDiscardDeadLetterEntryResponse: build.mutation<void, Pick<DiscardDeadLetterEntryResponse, 'id'> & Partial<DiscardDeadLetterEntryResponse>>({
      query: ({ id, ...patch }) => ({
        url: `DiscardDeadLetterEntryResponse/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            DiscardDeadLetterEntryResponseService.util.updateQueryData('getDiscardDeadLetterEntryResponse', id, (draft) => {
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
        { type: 'DiscardDeadLetterEntryResponse', id },
        { type: 'DiscardDeadLetterEntryResponse', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteDiscardDeadLetterEntryResponse: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `DiscardDeadLetterEntryResponse/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'DiscardDeadLetterEntryResponse', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetDiscardDeadLetterEntryResponsesPagedQuery`
export const {
  useGetDiscardDeadLetterEntryResponsesPagedQuery,     // immediate fetch
  useLazyGetDiscardDeadLetterEntryResponsesPagedQuery, // lazy fetch
  useGetDiscardDeadLetterEntryResponseQuery,
  useGetDiscardDeadLetterEntryResponsesQuery,
  useAddDiscardDeadLetterEntryResponseMutation,
  useUpdateDiscardDeadLetterEntryResponseMutation,
  useDeleteDiscardDeadLetterEntryResponseMutation,
} = DiscardDeadLetterEntryResponseService
