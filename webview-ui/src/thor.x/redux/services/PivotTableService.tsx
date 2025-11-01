import { createApi } from '@reduxjs/toolkit/query/react'
import { PivotTable } from '@thor/model/PivotTable'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type PivotTableResponse = PivotTable[]

export const PivotTableService = createApi({
  reducerPath: 'PivotTable', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['PivotTable'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getPivotTablesPaged: build.query<PivotTableResponse, { page: number; size?: number; example?: Partial<PivotTable> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `PivotTable?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'PivotTable' as const, id })),
              { type: 'PivotTable', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getPivotTables: build.query<PivotTableResponse, { example?: Partial<PivotTable> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `PivotTable?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `PivotTable`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'PivotTable' as const, id })),
              { type: 'PivotTable', id: 'LIST' },
            ]
          : [{ type: 'PivotTable', id: 'LIST' }],
    }),

    // 3) Create
    addPivotTable: build.mutation<PivotTable, Partial<PivotTable>>({
      query: (body) => ({
        url: `PivotTable`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'PivotTable', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getPivotTable: build.query<PivotTable, string>({
      query: (id) => `PivotTable/${id}`,
      providesTags: (result, error, id) => [{ type: 'PivotTable', id }],
    }),

    // 5) Update
    updatePivotTable: build.mutation<void, Pick<PivotTable, 'id'> & Partial<PivotTable>>({
      query: ({ id, ...patch }) => ({
        url: `PivotTable/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            PivotTableService.util.updateQueryData('getPivotTable', id, (draft) => {
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
        { type: 'PivotTable', id },
        { type: 'PivotTable', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deletePivotTable: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `PivotTable/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'PivotTable', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetPivotTablesPagedQuery`
export const {
  useGetPivotTablesPagedQuery,     // immediate fetch
  useLazyGetPivotTablesPagedQuery, // lazy fetch
  useGetPivotTableQuery,
  useGetPivotTablesQuery,
  useAddPivotTableMutation,
  useUpdatePivotTableMutation,
  useDeletePivotTableMutation,
} = PivotTableService
