import { createApi } from '@reduxjs/toolkit/query/react'
import { OrderFulfillmentTask } from '@thor/model/OrderFulfillmentTask'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type OrderFulfillmentTaskResponse = OrderFulfillmentTask[]

export const OrderFulfillmentTaskService = createApi({
  reducerPath: 'OrderFulfillmentTask', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['OrderFulfillmentTask'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getOrderFulfillmentTasksPaged: build.query<OrderFulfillmentTaskResponse, { page: number; size?: number; example?: Partial<OrderFulfillmentTask> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `OrderFulfillmentTask?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'OrderFulfillmentTask' as const, id })),
              { type: 'OrderFulfillmentTask', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getOrderFulfillmentTasks: build.query<OrderFulfillmentTaskResponse, { example?: Partial<OrderFulfillmentTask> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `OrderFulfillmentTask?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `OrderFulfillmentTask`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'OrderFulfillmentTask' as const, id })),
              { type: 'OrderFulfillmentTask', id: 'LIST' },
            ]
          : [{ type: 'OrderFulfillmentTask', id: 'LIST' }],
    }),

    // 3) Create
    addOrderFulfillmentTask: build.mutation<OrderFulfillmentTask, Partial<OrderFulfillmentTask>>({
      query: (body) => ({
        url: `OrderFulfillmentTask`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'OrderFulfillmentTask', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getOrderFulfillmentTask: build.query<OrderFulfillmentTask, string>({
      query: (id) => `OrderFulfillmentTask/${id}`,
      providesTags: (result, error, id) => [{ type: 'OrderFulfillmentTask', id }],
    }),

    // 5) Update
    updateOrderFulfillmentTask: build.mutation<void, Pick<OrderFulfillmentTask, 'id'> & Partial<OrderFulfillmentTask>>({
      query: ({ id, ...patch }) => ({
        url: `OrderFulfillmentTask/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            OrderFulfillmentTaskService.util.updateQueryData('getOrderFulfillmentTask', id, (draft) => {
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
        { type: 'OrderFulfillmentTask', id },
        { type: 'OrderFulfillmentTask', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteOrderFulfillmentTask: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `OrderFulfillmentTask/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'OrderFulfillmentTask', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetOrderFulfillmentTasksPagedQuery`
export const {
  useGetOrderFulfillmentTasksPagedQuery,     // immediate fetch
  useLazyGetOrderFulfillmentTasksPagedQuery, // lazy fetch
  useGetOrderFulfillmentTaskQuery,
  useGetOrderFulfillmentTasksQuery,
  useAddOrderFulfillmentTaskMutation,
  useUpdateOrderFulfillmentTaskMutation,
  useDeleteOrderFulfillmentTaskMutation,
} = OrderFulfillmentTaskService
