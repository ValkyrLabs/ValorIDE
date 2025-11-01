import { createApi } from '@reduxjs/toolkit/query/react'
import { ApiMetricsResponse } from '@thor/model/ApiMetricsResponse'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type ApiMetricsResponseResponse = ApiMetricsResponse[]

export const ApiMetricsResponseService = createApi({
  reducerPath: 'ApiMetricsResponse', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['ApiMetricsResponse'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getApiMetricsResponsesPaged: build.query<ApiMetricsResponseResponse, { page: number; size?: number; example?: Partial<ApiMetricsResponse> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `ApiMetricsResponse?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'ApiMetricsResponse' as const, id })),
              { type: 'ApiMetricsResponse', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getApiMetricsResponses: build.query<ApiMetricsResponseResponse, { example?: Partial<ApiMetricsResponse> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `ApiMetricsResponse?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `ApiMetricsResponse`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'ApiMetricsResponse' as const, id })),
              { type: 'ApiMetricsResponse', id: 'LIST' },
            ]
          : [{ type: 'ApiMetricsResponse', id: 'LIST' }],
    }),

    // 3) Create
    addApiMetricsResponse: build.mutation<ApiMetricsResponse, Partial<ApiMetricsResponse>>({
      query: (body) => ({
        url: `ApiMetricsResponse`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'ApiMetricsResponse', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getApiMetricsResponse: build.query<ApiMetricsResponse, string>({
      query: (id) => `ApiMetricsResponse/${id}`,
      providesTags: (result, error, id) => [{ type: 'ApiMetricsResponse', id }],
    }),

    // 5) Update
    updateApiMetricsResponse: build.mutation<void, Pick<ApiMetricsResponse, 'id'> & Partial<ApiMetricsResponse>>({
      query: ({ id, ...patch }) => ({
        url: `ApiMetricsResponse/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            ApiMetricsResponseService.util.updateQueryData('getApiMetricsResponse', id, (draft) => {
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
        { type: 'ApiMetricsResponse', id },
        { type: 'ApiMetricsResponse', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteApiMetricsResponse: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `ApiMetricsResponse/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'ApiMetricsResponse', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetApiMetricsResponsesPagedQuery`
export const {
  useGetApiMetricsResponsesPagedQuery,     // immediate fetch
  useLazyGetApiMetricsResponsesPagedQuery, // lazy fetch
  useGetApiMetricsResponseQuery,
  useGetApiMetricsResponsesQuery,
  useAddApiMetricsResponseMutation,
  useUpdateApiMetricsResponseMutation,
  useDeleteApiMetricsResponseMutation,
} = ApiMetricsResponseService
