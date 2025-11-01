import { createApi } from '@reduxjs/toolkit/query/react'
import { OasOpenAPISpec } from '@thor/model/OasOpenAPISpec'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type OasOpenAPISpecResponse = OasOpenAPISpec[]

export const OasOpenAPISpecService = createApi({
  reducerPath: 'OasOpenAPISpec', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['OasOpenAPISpec'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getOasOpenAPISpecsPaged: build.query<OasOpenAPISpecResponse, { page: number; size?: number; example?: Partial<OasOpenAPISpec> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `OasOpenAPISpec?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'OasOpenAPISpec' as const, id })),
              { type: 'OasOpenAPISpec', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getOasOpenAPISpecs: build.query<OasOpenAPISpecResponse, { example?: Partial<OasOpenAPISpec> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `OasOpenAPISpec?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `OasOpenAPISpec`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'OasOpenAPISpec' as const, id })),
              { type: 'OasOpenAPISpec', id: 'LIST' },
            ]
          : [{ type: 'OasOpenAPISpec', id: 'LIST' }],
    }),

    // 3) Create
    addOasOpenAPISpec: build.mutation<OasOpenAPISpec, Partial<OasOpenAPISpec>>({
      query: (body) => ({
        url: `OasOpenAPISpec`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'OasOpenAPISpec', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getOasOpenAPISpec: build.query<OasOpenAPISpec, string>({
      query: (id) => `OasOpenAPISpec/${id}`,
      providesTags: (result, error, id) => [{ type: 'OasOpenAPISpec', id }],
    }),

    // 5) Update
    updateOasOpenAPISpec: build.mutation<void, Pick<OasOpenAPISpec, 'id'> & Partial<OasOpenAPISpec>>({
      query: ({ id, ...patch }) => ({
        url: `OasOpenAPISpec/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            OasOpenAPISpecService.util.updateQueryData('getOasOpenAPISpec', id, (draft) => {
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
        { type: 'OasOpenAPISpec', id },
        { type: 'OasOpenAPISpec', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteOasOpenAPISpec: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `OasOpenAPISpec/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'OasOpenAPISpec', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetOasOpenAPISpecsPagedQuery`
export const {
  useGetOasOpenAPISpecsPagedQuery,     // immediate fetch
  useLazyGetOasOpenAPISpecsPagedQuery, // lazy fetch
  useGetOasOpenAPISpecQuery,
  useGetOasOpenAPISpecsQuery,
  useAddOasOpenAPISpecMutation,
  useUpdateOasOpenAPISpecMutation,
  useDeleteOasOpenAPISpecMutation,
} = OasOpenAPISpecService
