import { createApi } from '@reduxjs/toolkit/query/react'
import { Ptg } from '../../model'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type PtgResponse = Ptg[]

export const PtgService = createApi({
  reducerPath: 'Ptg', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['Ptg'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    getPtgsPaged: build.query<PtgResponse, { page: number; limit?: number }>({
      query: ({ page, limit = 20 }) => `Ptg?page=${page}&limit=${limit}`,
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Ptg' as const, id })),
              { type: 'Ptg', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getPtgs: build.query<PtgResponse, void>({
      query: () => `Ptg`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Ptg' as const, id })),
              { type: 'Ptg', id: 'LIST' },
            ]
          : [{ type: 'Ptg', id: 'LIST' }],
    }),

    // 3) Create
    addPtg: build.mutation<Ptg, Partial<Ptg>>({
      query: (body) => ({
        url: `Ptg`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Ptg', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getPtg: build.query<Ptg, string>({
      query: (id) => `Ptg/${id}`,
      providesTags: (result, error, id) => [{ type: 'Ptg', id }],
    }),

    // 5) Update
    updatePtg: build.mutation<void, Pick<Ptg, 'id'> & Partial<Ptg>>({
      query: ({ id, ...patch }) => ({
        url: `Ptg/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            PtgService.util.updateQueryData('getPtg', id, (draft) => {
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
      invalidatesTags: (result, error, { id }) => [{ type: 'Ptg', id }],
    }),

    // 6) Delete
    deletePtg: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `Ptg/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'Ptg', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetPtgsPagedQuery`
export const {
  useGetPtgsPagedQuery,     // immediate fetch
  useLazyGetPtgsPagedQuery, // lazy fetch
  useGetPtgQuery,
  useGetPtgsQuery,
  useAddPtgMutation,
  useUpdatePtgMutation,
  useDeletePtgMutation,
} = PtgService