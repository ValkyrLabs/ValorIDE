import { createApi } from '@reduxjs/toolkit/query/react'
import { Metrics } from '@thor/model/Metrics'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type MetricsResponse = Metrics[]

export const MetricsService = createApi({
  reducerPath: 'Metrics', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['Metrics'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getMetricssPaged: build.query<MetricsResponse, { page: number; size?: number; example?: Partial<Metrics> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `Metrics?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Metrics' as const, id })),
              { type: 'Metrics', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getMetricss: build.query<MetricsResponse, { example?: Partial<Metrics> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `Metrics?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `Metrics`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Metrics' as const, id })),
              { type: 'Metrics', id: 'LIST' },
            ]
          : [{ type: 'Metrics', id: 'LIST' }],
    }),

    // 3) Create
    addMetrics: build.mutation<Metrics, Partial<Metrics>>({
      query: (body) => ({
        url: `Metrics`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Metrics', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getMetrics: build.query<Metrics, string>({
      query: (id) => `Metrics/${id}`,
      providesTags: (result, error, id) => [{ type: 'Metrics', id }],
    }),

    // 5) Update
    updateMetrics: build.mutation<void, Pick<Metrics, 'id'> & Partial<Metrics>>({
      query: ({ id, ...patch }) => ({
        url: `Metrics/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            MetricsService.util.updateQueryData('getMetrics', id, (draft) => {
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
        { type: 'Metrics', id },
        { type: 'Metrics', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteMetrics: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `Metrics/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'Metrics', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetMetricssPagedQuery`
export const {
  useGetMetricssPagedQuery,     // immediate fetch
  useLazyGetMetricssPagedQuery, // lazy fetch
  useGetMetricsQuery,
  useGetMetricssQuery,
  useAddMetricsMutation,
  useUpdateMetricsMutation,
  useDeleteMetricsMutation,
} = MetricsService
