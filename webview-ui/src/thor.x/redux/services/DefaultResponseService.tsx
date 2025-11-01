import { createApi } from '@reduxjs/toolkit/query/react'
import { DefaultResponse } from '@thor/model/DefaultResponse'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type DefaultResponseResponse = DefaultResponse[]

export const DefaultResponseService = createApi({
  reducerPath: 'DefaultResponse', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['DefaultResponse'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getDefaultResponsesPaged: build.query<DefaultResponseResponse, { page: number; size?: number; example?: Partial<DefaultResponse> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `DefaultResponse?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'DefaultResponse' as const, id })),
              { type: 'DefaultResponse', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getDefaultResponses: build.query<DefaultResponseResponse, { example?: Partial<DefaultResponse> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `DefaultResponse?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `DefaultResponse`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'DefaultResponse' as const, id })),
              { type: 'DefaultResponse', id: 'LIST' },
            ]
          : [{ type: 'DefaultResponse', id: 'LIST' }],
    }),

    // 3) Create
    addDefaultResponse: build.mutation<DefaultResponse, Partial<DefaultResponse>>({
      query: (body) => ({
        url: `DefaultResponse`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'DefaultResponse', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getDefaultResponse: build.query<DefaultResponse, string>({
      query: (id) => `DefaultResponse/${id}`,
      providesTags: (result, error, id) => [{ type: 'DefaultResponse', id }],
    }),

    // 5) Update
    updateDefaultResponse: build.mutation<void, Pick<DefaultResponse, 'id'> & Partial<DefaultResponse>>({
      query: ({ id, ...patch }) => ({
        url: `DefaultResponse/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            DefaultResponseService.util.updateQueryData('getDefaultResponse', id, (draft) => {
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
        { type: 'DefaultResponse', id },
        { type: 'DefaultResponse', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteDefaultResponse: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `DefaultResponse/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'DefaultResponse', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetDefaultResponsesPagedQuery`
export const {
  useGetDefaultResponsesPagedQuery,     // immediate fetch
  useLazyGetDefaultResponsesPagedQuery, // lazy fetch
  useGetDefaultResponseQuery,
  useGetDefaultResponsesQuery,
  useAddDefaultResponseMutation,
  useUpdateDefaultResponseMutation,
  useDeleteDefaultResponseMutation,
} = DefaultResponseService
