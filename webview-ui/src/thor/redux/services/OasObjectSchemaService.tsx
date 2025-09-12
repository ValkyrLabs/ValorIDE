import { createApi } from '@reduxjs/toolkit/query/react'
import { OasObjectSchema } from '@thor/model/OasObjectSchema'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type OasObjectSchemaResponse = OasObjectSchema[]

export const OasObjectSchemaService = createApi({
  reducerPath: 'OasObjectSchema', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['OasObjectSchema'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getOasObjectSchemasPaged: build.query<OasObjectSchemaResponse, { page: number; size?: number; example?: Partial<OasObjectSchema> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `OasObjectSchema?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'OasObjectSchema' as const, id })),
              { type: 'OasObjectSchema', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getOasObjectSchemas: build.query<OasObjectSchemaResponse, { example?: Partial<OasObjectSchema> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `OasObjectSchema?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `OasObjectSchema`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'OasObjectSchema' as const, id })),
              { type: 'OasObjectSchema', id: 'LIST' },
            ]
          : [{ type: 'OasObjectSchema', id: 'LIST' }],
    }),

    // 3) Create
    addOasObjectSchema: build.mutation<OasObjectSchema, Partial<OasObjectSchema>>({
      query: (body) => ({
        url: `OasObjectSchema`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'OasObjectSchema', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getOasObjectSchema: build.query<OasObjectSchema, string>({
      query: (id) => `OasObjectSchema/${id}`,
      providesTags: (result, error, id) => [{ type: 'OasObjectSchema', id }],
    }),

    // 5) Update
    updateOasObjectSchema: build.mutation<void, Pick<OasObjectSchema, 'id'> & Partial<OasObjectSchema>>({
      query: ({ id, ...patch }) => ({
        url: `OasObjectSchema/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            OasObjectSchemaService.util.updateQueryData('getOasObjectSchema', id, (draft) => {
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
        { type: 'OasObjectSchema', id },
        { type: 'OasObjectSchema', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteOasObjectSchema: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `OasObjectSchema/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'OasObjectSchema', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetOasObjectSchemasPagedQuery`
export const {
  useGetOasObjectSchemasPagedQuery,     // immediate fetch
  useLazyGetOasObjectSchemasPagedQuery, // lazy fetch
  useGetOasObjectSchemaQuery,
  useGetOasObjectSchemasQuery,
  useAddOasObjectSchemaMutation,
  useUpdateOasObjectSchemaMutation,
  useDeleteOasObjectSchemaMutation,
} = OasObjectSchemaService
