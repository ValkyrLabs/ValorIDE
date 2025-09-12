import { createApi } from '@reduxjs/toolkit/query/react'
import { BlankRange } from '@thor/model/BlankRange'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type BlankRangeResponse = BlankRange[]

export const BlankRangeService = createApi({
  reducerPath: 'BlankRange', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['BlankRange'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getBlankRangesPaged: build.query<BlankRangeResponse, { page: number; size?: number; example?: Partial<BlankRange> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `BlankRange?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'BlankRange' as const, id })),
              { type: 'BlankRange', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getBlankRanges: build.query<BlankRangeResponse, { example?: Partial<BlankRange> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `BlankRange?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `BlankRange`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'BlankRange' as const, id })),
              { type: 'BlankRange', id: 'LIST' },
            ]
          : [{ type: 'BlankRange', id: 'LIST' }],
    }),

    // 3) Create
    addBlankRange: build.mutation<BlankRange, Partial<BlankRange>>({
      query: (body) => ({
        url: `BlankRange`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'BlankRange', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getBlankRange: build.query<BlankRange, string>({
      query: (id) => `BlankRange/${id}`,
      providesTags: (result, error, id) => [{ type: 'BlankRange', id }],
    }),

    // 5) Update
    updateBlankRange: build.mutation<void, Pick<BlankRange, 'id'> & Partial<BlankRange>>({
      query: ({ id, ...patch }) => ({
        url: `BlankRange/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            BlankRangeService.util.updateQueryData('getBlankRange', id, (draft) => {
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
        { type: 'BlankRange', id },
        { type: 'BlankRange', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteBlankRange: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `BlankRange/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'BlankRange', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetBlankRangesPagedQuery`
export const {
  useGetBlankRangesPagedQuery,     // immediate fetch
  useLazyGetBlankRangesPagedQuery, // lazy fetch
  useGetBlankRangeQuery,
  useGetBlankRangesQuery,
  useAddBlankRangeMutation,
  useUpdateBlankRangeMutation,
  useDeleteBlankRangeMutation,
} = BlankRangeService
