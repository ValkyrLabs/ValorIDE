import { createApi } from '@reduxjs/toolkit/query/react'
import { Workbook } from '@thor/model/Workbook'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type WorkbookResponse = Workbook[]

export const WorkbookService = createApi({
  reducerPath: 'Workbook', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['Workbook'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getWorkbooksPaged: build.query<WorkbookResponse, { page: number; size?: number; example?: Partial<Workbook> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `Workbook?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Workbook' as const, id })),
              { type: 'Workbook', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getWorkbooks: build.query<WorkbookResponse, { example?: Partial<Workbook> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `Workbook?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `Workbook`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Workbook' as const, id })),
              { type: 'Workbook', id: 'LIST' },
            ]
          : [{ type: 'Workbook', id: 'LIST' }],
    }),

    // 3) Create
    addWorkbook: build.mutation<Workbook, Partial<Workbook>>({
      query: (body) => ({
        url: `Workbook`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Workbook', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getWorkbook: build.query<Workbook, string>({
      query: (id) => `Workbook/${id}`,
      providesTags: (result, error, id) => [{ type: 'Workbook', id }],
    }),

    // 5) Update
    updateWorkbook: build.mutation<void, Pick<Workbook, 'id'> & Partial<Workbook>>({
      query: ({ id, ...patch }) => ({
        url: `Workbook/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            WorkbookService.util.updateQueryData('getWorkbook', id, (draft) => {
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
        { type: 'Workbook', id },
        { type: 'Workbook', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteWorkbook: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `Workbook/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'Workbook', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetWorkbooksPagedQuery`
export const {
  useGetWorkbooksPagedQuery,     // immediate fetch
  useLazyGetWorkbooksPagedQuery, // lazy fetch
  useGetWorkbookQuery,
  useGetWorkbooksQuery,
  useAddWorkbookMutation,
  useUpdateWorkbookMutation,
  useDeleteWorkbookMutation,
} = WorkbookService
