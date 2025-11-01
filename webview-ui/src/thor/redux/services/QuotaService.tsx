import { createApi } from '@reduxjs/toolkit/query/react'
import { Quota } from '@thor/model/Quota'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type QuotaResponse = Quota[]

export const QuotaService = createApi({
  reducerPath: 'Quota', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['Quota'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getQuotasPaged: build.query<QuotaResponse, { page: number; size?: number; example?: Partial<Quota> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `Quota?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Quota' as const, id })),
              { type: 'Quota', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getQuotas: build.query<QuotaResponse, { example?: Partial<Quota> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `Quota?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `Quota`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Quota' as const, id })),
              { type: 'Quota', id: 'LIST' },
            ]
          : [{ type: 'Quota', id: 'LIST' }],
    }),

    // 3) Create
    addQuota: build.mutation<Quota, Partial<Quota>>({
      query: (body) => ({
        url: `Quota`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Quota', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getQuota: build.query<Quota, string>({
      query: (id) => `Quota/${id}`,
      providesTags: (result, error, id) => [{ type: 'Quota', id }],
    }),

    // 5) Update
    updateQuota: build.mutation<void, Pick<Quota, 'id'> & Partial<Quota>>({
      query: ({ id, ...patch }) => ({
        url: `Quota/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            QuotaService.util.updateQueryData('getQuota', id, (draft) => {
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
        { type: 'Quota', id },
        { type: 'Quota', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteQuota: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `Quota/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'Quota', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetQuotasPagedQuery`
export const {
  useGetQuotasPagedQuery,     // immediate fetch
  useLazyGetQuotasPagedQuery, // lazy fetch
  useGetQuotaQuery,
  useGetQuotasQuery,
  useAddQuotaMutation,
  useUpdateQuotaMutation,
  useDeleteQuotaMutation,
} = QuotaService
