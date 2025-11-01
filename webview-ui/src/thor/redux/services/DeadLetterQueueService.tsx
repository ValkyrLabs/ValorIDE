import { createApi } from '@reduxjs/toolkit/query/react'
import { DeadLetterQueue } from '@thor/model/DeadLetterQueue'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type DeadLetterQueueResponse = DeadLetterQueue[]

export const DeadLetterQueueService = createApi({
  reducerPath: 'DeadLetterQueue', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['DeadLetterQueue'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getDeadLetterQueuesPaged: build.query<DeadLetterQueueResponse, { page: number; size?: number; example?: Partial<DeadLetterQueue> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `DeadLetterQueue?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'DeadLetterQueue' as const, id })),
              { type: 'DeadLetterQueue', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getDeadLetterQueues: build.query<DeadLetterQueueResponse, { example?: Partial<DeadLetterQueue> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `DeadLetterQueue?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `DeadLetterQueue`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'DeadLetterQueue' as const, id })),
              { type: 'DeadLetterQueue', id: 'LIST' },
            ]
          : [{ type: 'DeadLetterQueue', id: 'LIST' }],
    }),

    // 3) Create
    addDeadLetterQueue: build.mutation<DeadLetterQueue, Partial<DeadLetterQueue>>({
      query: (body) => ({
        url: `DeadLetterQueue`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'DeadLetterQueue', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getDeadLetterQueue: build.query<DeadLetterQueue, string>({
      query: (id) => `DeadLetterQueue/${id}`,
      providesTags: (result, error, id) => [{ type: 'DeadLetterQueue', id }],
    }),

    // 5) Update
    updateDeadLetterQueue: build.mutation<void, Pick<DeadLetterQueue, 'id'> & Partial<DeadLetterQueue>>({
      query: ({ id, ...patch }) => ({
        url: `DeadLetterQueue/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            DeadLetterQueueService.util.updateQueryData('getDeadLetterQueue', id, (draft) => {
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
        { type: 'DeadLetterQueue', id },
        { type: 'DeadLetterQueue', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteDeadLetterQueue: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `DeadLetterQueue/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'DeadLetterQueue', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetDeadLetterQueuesPagedQuery`
export const {
  useGetDeadLetterQueuesPagedQuery,     // immediate fetch
  useLazyGetDeadLetterQueuesPagedQuery, // lazy fetch
  useGetDeadLetterQueueQuery,
  useGetDeadLetterQueuesQuery,
  useAddDeadLetterQueueMutation,
  useUpdateDeadLetterQueueMutation,
  useDeleteDeadLetterQueueMutation,
} = DeadLetterQueueService
