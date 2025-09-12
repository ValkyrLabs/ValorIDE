import { createApi } from '@reduxjs/toolkit/query/react'
import { OasSecurityScheme } from '@thor/model/OasSecurityScheme'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type OasSecuritySchemeResponse = OasSecurityScheme[]

export const OasSecuritySchemeService = createApi({
  reducerPath: 'OasSecurityScheme', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['OasSecurityScheme'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getOasSecuritySchemesPaged: build.query<OasSecuritySchemeResponse, { page: number; size?: number; example?: Partial<OasSecurityScheme> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `OasSecurityScheme?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'OasSecurityScheme' as const, id })),
              { type: 'OasSecurityScheme', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getOasSecuritySchemes: build.query<OasSecuritySchemeResponse, { example?: Partial<OasSecurityScheme> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `OasSecurityScheme?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `OasSecurityScheme`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'OasSecurityScheme' as const, id })),
              { type: 'OasSecurityScheme', id: 'LIST' },
            ]
          : [{ type: 'OasSecurityScheme', id: 'LIST' }],
    }),

    // 3) Create
    addOasSecurityScheme: build.mutation<OasSecurityScheme, Partial<OasSecurityScheme>>({
      query: (body) => ({
        url: `OasSecurityScheme`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'OasSecurityScheme', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getOasSecurityScheme: build.query<OasSecurityScheme, string>({
      query: (id) => `OasSecurityScheme/${id}`,
      providesTags: (result, error, id) => [{ type: 'OasSecurityScheme', id }],
    }),

    // 5) Update
    updateOasSecurityScheme: build.mutation<void, Pick<OasSecurityScheme, 'id'> & Partial<OasSecurityScheme>>({
      query: ({ id, ...patch }) => ({
        url: `OasSecurityScheme/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            OasSecuritySchemeService.util.updateQueryData('getOasSecurityScheme', id, (draft) => {
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
        { type: 'OasSecurityScheme', id },
        { type: 'OasSecurityScheme', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteOasSecurityScheme: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `OasSecurityScheme/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'OasSecurityScheme', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetOasSecuritySchemesPagedQuery`
export const {
  useGetOasSecuritySchemesPagedQuery,     // immediate fetch
  useLazyGetOasSecuritySchemesPagedQuery, // lazy fetch
  useGetOasSecuritySchemeQuery,
  useGetOasSecuritySchemesQuery,
  useAddOasSecuritySchemeMutation,
  useUpdateOasSecuritySchemeMutation,
  useDeleteOasSecuritySchemeMutation,
} = OasSecuritySchemeService
