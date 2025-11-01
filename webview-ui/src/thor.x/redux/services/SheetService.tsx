import { createApi } from '@reduxjs/toolkit/query/react'
import { Sheet } from '@thor/model/Sheet'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type SheetResponse = Sheet[]

export const SheetService = createApi({
  reducerPath: 'Sheet', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['Sheet'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getSheetsPaged: build.query<SheetResponse, { page: number; size?: number; example?: Partial<Sheet> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `Sheet?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Sheet' as const, id })),
              { type: 'Sheet', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getSheets: build.query<SheetResponse, { example?: Partial<Sheet> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `Sheet?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `Sheet`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Sheet' as const, id })),
              { type: 'Sheet', id: 'LIST' },
            ]
          : [{ type: 'Sheet', id: 'LIST' }],
    }),

    // 3) Create
    addSheet: build.mutation<Sheet, Partial<Sheet>>({
      query: (body) => ({
        url: `Sheet`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Sheet', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getSheet: build.query<Sheet, string>({
      query: (id) => `Sheet/${id}`,
      providesTags: (result, error, id) => [{ type: 'Sheet', id }],
    }),

    // 5) Update
    updateSheet: build.mutation<void, Pick<Sheet, 'id'> & Partial<Sheet>>({
      query: ({ id, ...patch }) => ({
        url: `Sheet/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            SheetService.util.updateQueryData('getSheet', id, (draft) => {
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
        { type: 'Sheet', id },
        { type: 'Sheet', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteSheet: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `Sheet/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'Sheet', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetSheetsPagedQuery`
export const {
  useGetSheetsPagedQuery,     // immediate fetch
  useLazyGetSheetsPagedQuery, // lazy fetch
  useGetSheetQuery,
  useGetSheetsQuery,
  useAddSheetMutation,
  useUpdateSheetMutation,
  useDeleteSheetMutation,
} = SheetService
