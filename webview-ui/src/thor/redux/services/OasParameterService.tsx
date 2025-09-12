import { createApi } from '@reduxjs/toolkit/query/react'
import { OasParameter } from '@thor/model/OasParameter'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type OasParameterResponse = OasParameter[]

export const OasParameterService = createApi({
  reducerPath: 'OasParameter', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['OasParameter'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getOasParametersPaged: build.query<OasParameterResponse, { page: number; size?: number; example?: Partial<OasParameter> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `OasParameter?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'OasParameter' as const, id })),
              { type: 'OasParameter', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getOasParameters: build.query<OasParameterResponse, { example?: Partial<OasParameter> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `OasParameter?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `OasParameter`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'OasParameter' as const, id })),
              { type: 'OasParameter', id: 'LIST' },
            ]
          : [{ type: 'OasParameter', id: 'LIST' }],
    }),

    // 3) Create
    addOasParameter: build.mutation<OasParameter, Partial<OasParameter>>({
      query: (body) => ({
        url: `OasParameter`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'OasParameter', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getOasParameter: build.query<OasParameter, string>({
      query: (id) => `OasParameter/${id}`,
      providesTags: (result, error, id) => [{ type: 'OasParameter', id }],
    }),

    // 5) Update
    updateOasParameter: build.mutation<void, Pick<OasParameter, 'id'> & Partial<OasParameter>>({
      query: ({ id, ...patch }) => ({
        url: `OasParameter/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            OasParameterService.util.updateQueryData('getOasParameter', id, (draft) => {
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
        { type: 'OasParameter', id },
        { type: 'OasParameter', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteOasParameter: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `OasParameter/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'OasParameter', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetOasParametersPagedQuery`
export const {
  useGetOasParametersPagedQuery,     // immediate fetch
  useLazyGetOasParametersPagedQuery, // lazy fetch
  useGetOasParameterQuery,
  useGetOasParametersQuery,
  useAddOasParameterMutation,
  useUpdateOasParameterMutation,
  useDeleteOasParameterMutation,
} = OasParameterService
