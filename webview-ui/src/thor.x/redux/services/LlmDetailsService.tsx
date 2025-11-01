import { createApi } from '@reduxjs/toolkit/query/react'
import { LlmDetails } from '@thor/model/LlmDetails'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type LlmDetailsResponse = LlmDetails[]

export const LlmDetailsService = createApi({
  reducerPath: 'LlmDetails', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['LlmDetails'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getLlmDetailssPaged: build.query<LlmDetailsResponse, { page: number; size?: number; example?: Partial<LlmDetails> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `LlmDetails?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'LlmDetails' as const, id })),
              { type: 'LlmDetails', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getLlmDetailss: build.query<LlmDetailsResponse, { example?: Partial<LlmDetails> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `LlmDetails?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `LlmDetails`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'LlmDetails' as const, id })),
              { type: 'LlmDetails', id: 'LIST' },
            ]
          : [{ type: 'LlmDetails', id: 'LIST' }],
    }),

    // 3) Create
    addLlmDetails: build.mutation<LlmDetails, Partial<LlmDetails>>({
      query: (body) => ({
        url: `LlmDetails`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'LlmDetails', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getLlmDetails: build.query<LlmDetails, string>({
      query: (id) => `LlmDetails/${id}`,
      providesTags: (result, error, id) => [{ type: 'LlmDetails', id }],
    }),

    // 5) Update
    updateLlmDetails: build.mutation<void, Pick<LlmDetails, 'id'> & Partial<LlmDetails>>({
      query: ({ id, ...patch }) => ({
        url: `LlmDetails/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            LlmDetailsService.util.updateQueryData('getLlmDetails', id, (draft) => {
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
        { type: 'LlmDetails', id },
        { type: 'LlmDetails', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteLlmDetails: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `LlmDetails/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'LlmDetails', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetLlmDetailssPagedQuery`
export const {
  useGetLlmDetailssPagedQuery,     // immediate fetch
  useLazyGetLlmDetailssPagedQuery, // lazy fetch
  useGetLlmDetailsQuery,
  useGetLlmDetailssQuery,
  useAddLlmDetailsMutation,
  useUpdateLlmDetailsMutation,
  useDeleteLlmDetailsMutation,
} = LlmDetailsService
