import { createApi } from '@reduxjs/toolkit/query/react'
import { MergeRange } from '../../model'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type MergeRangeResponse = MergeRange[]

export const MergeRangeService = createApi({
  reducerPath: 'MergeRange', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['MergeRange'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    getMergeRangesPaged: build.query<MergeRangeResponse, { page: number; limit?: number }>({
      query: ({ page, limit = 20 }) => `MergeRange?page=${page}&limit=${limit}`,
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'MergeRange' as const, id })),
              { type: 'MergeRange', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getMergeRanges: build.query<MergeRangeResponse, void>({
      query: () => `MergeRange`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'MergeRange' as const, id })),
              { type: 'MergeRange', id: 'LIST' },
            ]
          : [{ type: 'MergeRange', id: 'LIST' }],
    }),

    // 3) Create
    addMergeRange: build.mutation<MergeRange, Partial<MergeRange>>({
      query: (body) => ({
        url: `MergeRange`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'MergeRange', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getMergeRange: build.query<MergeRange, string>({
      query: (id) => `MergeRange/${id}`,
      providesTags: (result, error, id) => [{ type: 'MergeRange', id }],
    }),

    // 5) Update
    updateMergeRange: build.mutation<void, Pick<MergeRange, 'id'> & Partial<MergeRange>>({
      query: ({ id, ...patch }) => ({
        url: `MergeRange/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            MergeRangeService.util.updateQueryData('getMergeRange', id, (draft) => {
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
      invalidatesTags: (result, error, { id }) => [{ type: 'MergeRange', id }],
    }),

    // 6) Delete
    deleteMergeRange: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `MergeRange/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'MergeRange', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetMergeRangesPagedQuery`
export const {
  useGetMergeRangesPagedQuery,     // immediate fetch
  useLazyGetMergeRangesPagedQuery, // lazy fetch
  useGetMergeRangeQuery,
  useGetMergeRangesQuery,
  useAddMergeRangeMutation,
  useUpdateMergeRangeMutation,
  useDeleteMergeRangeMutation,
} = MergeRangeService