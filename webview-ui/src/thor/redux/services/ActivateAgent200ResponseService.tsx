import { createApi } from '@reduxjs/toolkit/query/react'
import { ActivateAgent200Response } from '@thor/model/ActivateAgent200Response'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type ActivateAgent200ResponseResponse = ActivateAgent200Response[]

export const ActivateAgent200ResponseService = createApi({
  reducerPath: 'ActivateAgent200Response', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['ActivateAgent200Response'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getActivateAgent200ResponsesPaged: build.query<ActivateAgent200ResponseResponse, { page: number; size?: number; example?: Partial<ActivateAgent200Response> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `ActivateAgent200Response?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'ActivateAgent200Response' as const, id })),
              { type: 'ActivateAgent200Response', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getActivateAgent200Responses: build.query<ActivateAgent200ResponseResponse, { example?: Partial<ActivateAgent200Response> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `ActivateAgent200Response?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `ActivateAgent200Response`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'ActivateAgent200Response' as const, id })),
              { type: 'ActivateAgent200Response', id: 'LIST' },
            ]
          : [{ type: 'ActivateAgent200Response', id: 'LIST' }],
    }),

    // 3) Create
    addActivateAgent200Response: build.mutation<ActivateAgent200Response, Partial<ActivateAgent200Response>>({
      query: (body) => ({
        url: `ActivateAgent200Response`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'ActivateAgent200Response', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getActivateAgent200Response: build.query<ActivateAgent200Response, string>({
      query: (id) => `ActivateAgent200Response/${id}`,
      providesTags: (result, error, id) => [{ type: 'ActivateAgent200Response', id }],
    }),

    // 5) Update
    updateActivateAgent200Response: build.mutation<void, Pick<ActivateAgent200Response, 'id'> & Partial<ActivateAgent200Response>>({
      query: ({ id, ...patch }) => ({
        url: `ActivateAgent200Response/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            ActivateAgent200ResponseService.util.updateQueryData('getActivateAgent200Response', id, (draft) => {
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
        { type: 'ActivateAgent200Response', id },
        { type: 'ActivateAgent200Response', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteActivateAgent200Response: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `ActivateAgent200Response/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'ActivateAgent200Response', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetActivateAgent200ResponsesPagedQuery`
export const {
  useGetActivateAgent200ResponsesPagedQuery,     // immediate fetch
  useLazyGetActivateAgent200ResponsesPagedQuery, // lazy fetch
  useGetActivateAgent200ResponseQuery,
  useGetActivateAgent200ResponsesQuery,
  useAddActivateAgent200ResponseMutation,
  useUpdateActivateAgent200ResponseMutation,
  useDeleteActivateAgent200ResponseMutation,
} = ActivateAgent200ResponseService
