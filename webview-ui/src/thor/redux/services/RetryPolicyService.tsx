import { createApi } from '@reduxjs/toolkit/query/react'
import { RetryPolicy } from '@thor/model/RetryPolicy'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type RetryPolicyResponse = RetryPolicy[]

export const RetryPolicyService = createApi({
  reducerPath: 'RetryPolicy', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['RetryPolicy'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getRetryPolicysPaged: build.query<RetryPolicyResponse, { page: number; size?: number; example?: Partial<RetryPolicy> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `RetryPolicy?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'RetryPolicy' as const, id })),
              { type: 'RetryPolicy', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getRetryPolicys: build.query<RetryPolicyResponse, { example?: Partial<RetryPolicy> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `RetryPolicy?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `RetryPolicy`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'RetryPolicy' as const, id })),
              { type: 'RetryPolicy', id: 'LIST' },
            ]
          : [{ type: 'RetryPolicy', id: 'LIST' }],
    }),

    // 3) Create
    addRetryPolicy: build.mutation<RetryPolicy, Partial<RetryPolicy>>({
      query: (body) => ({
        url: `RetryPolicy`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'RetryPolicy', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getRetryPolicy: build.query<RetryPolicy, string>({
      query: (id) => `RetryPolicy/${id}`,
      providesTags: (result, error, id) => [{ type: 'RetryPolicy', id }],
    }),

    // 5) Update
    updateRetryPolicy: build.mutation<void, Pick<RetryPolicy, 'id'> & Partial<RetryPolicy>>({
      query: ({ id, ...patch }) => ({
        url: `RetryPolicy/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            RetryPolicyService.util.updateQueryData('getRetryPolicy', id, (draft) => {
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
        { type: 'RetryPolicy', id },
        { type: 'RetryPolicy', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteRetryPolicy: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `RetryPolicy/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'RetryPolicy', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetRetryPolicysPagedQuery`
export const {
  useGetRetryPolicysPagedQuery,     // immediate fetch
  useLazyGetRetryPolicysPagedQuery, // lazy fetch
  useGetRetryPolicyQuery,
  useGetRetryPolicysQuery,
  useAddRetryPolicyMutation,
  useUpdateRetryPolicyMutation,
  useDeleteRetryPolicyMutation,
} = RetryPolicyService
