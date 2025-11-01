import { createApi } from '@reduxjs/toolkit/query/react'
import { Cell } from '@thor/model/Cell'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type CellResponse = Cell[]

export const CellService = createApi({
  reducerPath: 'Cell', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['Cell'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getCellsPaged: build.query<CellResponse, { page: number; size?: number; example?: Partial<Cell> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `Cell?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Cell' as const, id })),
              { type: 'Cell', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getCells: build.query<CellResponse, { example?: Partial<Cell> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `Cell?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `Cell`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Cell' as const, id })),
              { type: 'Cell', id: 'LIST' },
            ]
          : [{ type: 'Cell', id: 'LIST' }],
    }),

    // 3) Create
    addCell: build.mutation<Cell, Partial<Cell>>({
      query: (body) => ({
        url: `Cell`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Cell', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getCell: build.query<Cell, string>({
      query: (id) => `Cell/${id}`,
      providesTags: (result, error, id) => [{ type: 'Cell', id }],
    }),

    // 5) Update
    updateCell: build.mutation<void, Pick<Cell, 'id'> & Partial<Cell>>({
      query: ({ id, ...patch }) => ({
        url: `Cell/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            CellService.util.updateQueryData('getCell', id, (draft) => {
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
        { type: 'Cell', id },
        { type: 'Cell', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteCell: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `Cell/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'Cell', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetCellsPagedQuery`
export const {
  useGetCellsPagedQuery,     // immediate fetch
  useLazyGetCellsPagedQuery, // lazy fetch
  useGetCellQuery,
  useGetCellsQuery,
  useAddCellMutation,
  useUpdateCellMutation,
  useDeleteCellMutation,
} = CellService
