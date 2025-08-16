import { createApi } from '@reduxjs/toolkit/query/react'
import { ReferralLink } from '../../model'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type ReferralLinkResponse = ReferralLink[]

export const ReferralLinkService = createApi({
  reducerPath: 'ReferralLink', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['ReferralLink'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    getReferralLinksPaged: build.query<ReferralLinkResponse, { page: number; limit?: number }>({
      query: ({ page, limit = 20 }) => `ReferralLink?page=${page}&limit=${limit}`,
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'ReferralLink' as const, id })),
              { type: 'ReferralLink', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getReferralLinks: build.query<ReferralLinkResponse, void>({
      query: () => `ReferralLink`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'ReferralLink' as const, id })),
              { type: 'ReferralLink', id: 'LIST' },
            ]
          : [{ type: 'ReferralLink', id: 'LIST' }],
    }),

    // 3) Create
    addReferralLink: build.mutation<ReferralLink, Partial<ReferralLink>>({
      query: (body) => ({
        url: `ReferralLink`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'ReferralLink', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getReferralLink: build.query<ReferralLink, string>({
      query: (id) => `ReferralLink/${id}`,
      providesTags: (result, error, id) => [{ type: 'ReferralLink', id }],
    }),

    // 5) Update
    updateReferralLink: build.mutation<void, Pick<ReferralLink, 'id'> & Partial<ReferralLink>>({
      query: ({ id, ...patch }) => ({
        url: `ReferralLink/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            ReferralLinkService.util.updateQueryData('getReferralLink', id, (draft) => {
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
      invalidatesTags: (result, error, { id }) => [{ type: 'ReferralLink', id }],
    }),

    // 6) Delete
    deleteReferralLink: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `ReferralLink/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'ReferralLink', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetReferralLinksPagedQuery`
export const {
  useGetReferralLinksPagedQuery,     // immediate fetch
  useLazyGetReferralLinksPagedQuery, // lazy fetch
  useGetReferralLinkQuery,
  useGetReferralLinksQuery,
  useAddReferralLinkMutation,
  useUpdateReferralLinkMutation,
  useDeleteReferralLinkMutation,
} = ReferralLinkService