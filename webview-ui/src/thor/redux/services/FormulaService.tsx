import { createApi } from '@reduxjs/toolkit/query/react'
import { Formula } from '../../model'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type FormulaResponse = Formula[]

export const FormulaService = createApi({
  reducerPath: 'Formula', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['Formula'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    getFormulasPaged: build.query<FormulaResponse, { page: number; limit?: number }>({
      query: ({ page, limit = 20 }) => `Formula?page=${page}&limit=${limit}`,
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Formula' as const, id })),
              { type: 'Formula', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getFormulas: build.query<FormulaResponse, void>({
      query: () => `Formula`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Formula' as const, id })),
              { type: 'Formula', id: 'LIST' },
            ]
          : [{ type: 'Formula', id: 'LIST' }],
    }),

    // 3) Create
    addFormula: build.mutation<Formula, Partial<Formula>>({
      query: (body) => ({
        url: `Formula`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Formula', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getFormula: build.query<Formula, string>({
      query: (id) => `Formula/${id}`,
      providesTags: (result, error, id) => [{ type: 'Formula', id }],
    }),

    // 5) Update
    updateFormula: build.mutation<void, Pick<Formula, 'id'> & Partial<Formula>>({
      query: ({ id, ...patch }) => ({
        url: `Formula/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            FormulaService.util.updateQueryData('getFormula', id, (draft) => {
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
      invalidatesTags: (result, error, { id }) => [{ type: 'Formula', id }],
    }),

    // 6) Delete
    deleteFormula: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `Formula/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'Formula', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetFormulasPagedQuery`
export const {
  useGetFormulasPagedQuery,     // immediate fetch
  useLazyGetFormulasPagedQuery, // lazy fetch
  useGetFormulaQuery,
  useGetFormulasQuery,
  useAddFormulaMutation,
  useUpdateFormulaMutation,
  useDeleteFormulaMutation,
} = FormulaService