import { createApi } from '@reduxjs/toolkit/query/react'
import { Format } from '@thor/model/Format'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type FormatResponse = Format[]

export const FormatService = createApi({
  reducerPath: 'Format', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['Format'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getFormatsPaged: build.query<FormatResponse, { page: number; size?: number; example?: Partial<Format> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `Format?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Format' as const, id })),
              { type: 'Format', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getFormats: build.query<FormatResponse, { example?: Partial<Format> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `Format?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `Format`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Format' as const, id })),
              { type: 'Format', id: 'LIST' },
            ]
          : [{ type: 'Format', id: 'LIST' }],
    }),

    // 3) Create
    addFormat: build.mutation<Format, Partial<Format>>({
      query: (body) => ({
        url: `Format`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Format', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getFormat: build.query<Format, string>({
      query: (id) => `Format/${id}`,
      providesTags: (result, error, id) => [{ type: 'Format', id }],
    }),

    // 5) Update
    updateFormat: build.mutation<void, Pick<Format, 'id'> & Partial<Format>>({
      query: ({ id, ...patch }) => ({
        url: `Format/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            FormatService.util.updateQueryData('getFormat', id, (draft) => {
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
        { type: 'Format', id },
        { type: 'Format', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteFormat: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `Format/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'Format', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetFormatsPagedQuery`
export const {
  useGetFormatsPagedQuery,     // immediate fetch
  useLazyGetFormatsPagedQuery, // lazy fetch
  useGetFormatQuery,
  useGetFormatsQuery,
  useAddFormatMutation,
  useUpdateFormatMutation,
  useDeleteFormatMutation,
} = FormatService
