import { createApi } from '@reduxjs/toolkit/query/react'
import { SheetColumn } from '../../model'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type SheetColumnResponse = SheetColumn[]

export const SheetColumnService = createApi({
  reducerPath: 'SheetColumn', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['SheetColumn'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    getSheetColumnsPaged: build.query<SheetColumnResponse, { page: number; limit?: number }>({
      query: ({ page, limit = 20 }) => `SheetColumn?page=${page}&limit=${limit}`,
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'SheetColumn' as const, id })),
              { type: 'SheetColumn', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getSheetColumns: build.query<SheetColumnResponse, void>({
      query: () => `SheetColumn`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'SheetColumn' as const, id })),
              { type: 'SheetColumn', id: 'LIST' },
            ]
          : [{ type: 'SheetColumn', id: 'LIST' }],
    }),

    // 3) Create
    addSheetColumn: build.mutation<SheetColumn, Partial<SheetColumn>>({
      query: (body) => ({
        url: `SheetColumn`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'SheetColumn', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getSheetColumn: build.query<SheetColumn, string>({
      query: (id) => `SheetColumn/${id}`,
      providesTags: (result, error, id) => [{ type: 'SheetColumn', id }],
    }),

    // 5) Update
    updateSheetColumn: build.mutation<void, Pick<SheetColumn, 'id'> & Partial<SheetColumn>>({
      query: ({ id, ...patch }) => ({
        url: `SheetColumn/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            SheetColumnService.util.updateQueryData('getSheetColumn', id, (draft) => {
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
      invalidatesTags: (result, error, { id }) => [{ type: 'SheetColumn', id }],
    }),

    // 6) Delete
    deleteSheetColumn: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `SheetColumn/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'SheetColumn', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetSheetColumnsPagedQuery`
export const {
  useGetSheetColumnsPagedQuery,     // immediate fetch
  useLazyGetSheetColumnsPagedQuery, // lazy fetch
  useGetSheetColumnQuery,
  useGetSheetColumnsQuery,
  useAddSheetColumnMutation,
  useUpdateSheetColumnMutation,
  useDeleteSheetColumnMutation,
} = SheetColumnService