import { createApi } from '@reduxjs/toolkit/query/react'
import { LlmDetails } from '../../model'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type LlmDetailsResponse = LlmDetails[]

export const LlmDetailsService = createApi({
  reducerPath: 'LlmDetails', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['LlmDetails'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    getLlmDetailssPaged: build.query<LlmDetailsResponse, { page: number; limit?: number }>({
      query: ({ page, limit = 20 }) => `LlmDetails?page=${page}&limit=${limit}`,
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'LlmDetails' as const, id })),
              { type: 'LlmDetails', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getLlmDetailss: build.query<LlmDetailsResponse, void>({
      query: () => `LlmDetails`,
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
      invalidatesTags: (result, error, { id }) => [{ type: 'LlmDetails', id }],
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