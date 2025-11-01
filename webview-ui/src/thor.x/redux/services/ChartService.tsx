import { createApi } from '@reduxjs/toolkit/query/react'
import { Chart } from '@thor/model/Chart'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type ChartResponse = Chart[]

export const ChartService = createApi({
  reducerPath: 'Chart', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['Chart'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getChartsPaged: build.query<ChartResponse, { page: number; size?: number; example?: Partial<Chart> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `Chart?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Chart' as const, id })),
              { type: 'Chart', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getCharts: build.query<ChartResponse, { example?: Partial<Chart> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `Chart?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `Chart`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Chart' as const, id })),
              { type: 'Chart', id: 'LIST' },
            ]
          : [{ type: 'Chart', id: 'LIST' }],
    }),

    // 3) Create
    addChart: build.mutation<Chart, Partial<Chart>>({
      query: (body) => ({
        url: `Chart`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Chart', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getChart: build.query<Chart, string>({
      query: (id) => `Chart/${id}`,
      providesTags: (result, error, id) => [{ type: 'Chart', id }],
    }),

    // 5) Update
    updateChart: build.mutation<void, Pick<Chart, 'id'> & Partial<Chart>>({
      query: ({ id, ...patch }) => ({
        url: `Chart/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            ChartService.util.updateQueryData('getChart', id, (draft) => {
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
        { type: 'Chart', id },
        { type: 'Chart', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteChart: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `Chart/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'Chart', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetChartsPagedQuery`
export const {
  useGetChartsPagedQuery,     // immediate fetch
  useLazyGetChartsPagedQuery, // lazy fetch
  useGetChartQuery,
  useGetChartsQuery,
  useAddChartMutation,
  useUpdateChartMutation,
  useDeleteChartMutation,
} = ChartService
