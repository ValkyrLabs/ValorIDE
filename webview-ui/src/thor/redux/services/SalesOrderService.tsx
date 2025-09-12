import { createApi } from '@reduxjs/toolkit/query/react'
import { SalesOrder } from '@thor/model/SalesOrder'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type SalesOrderResponse = SalesOrder[]

export const SalesOrderService = createApi({
  reducerPath: 'SalesOrder', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['SalesOrder'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getSalesOrdersPaged: build.query<SalesOrderResponse, { page: number; size?: number; example?: Partial<SalesOrder> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `SalesOrder?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'SalesOrder' as const, id })),
              { type: 'SalesOrder', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getSalesOrders: build.query<SalesOrderResponse, { example?: Partial<SalesOrder> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `SalesOrder?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `SalesOrder`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'SalesOrder' as const, id })),
              { type: 'SalesOrder', id: 'LIST' },
            ]
          : [{ type: 'SalesOrder', id: 'LIST' }],
    }),

    // 3) Create
    addSalesOrder: build.mutation<SalesOrder, Partial<SalesOrder>>({
      query: (body) => ({
        url: `SalesOrder`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'SalesOrder', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getSalesOrder: build.query<SalesOrder, string>({
      query: (id) => `SalesOrder/${id}`,
      providesTags: (result, error, id) => [{ type: 'SalesOrder', id }],
    }),

    // 5) Update
    updateSalesOrder: build.mutation<void, Pick<SalesOrder, 'id'> & Partial<SalesOrder>>({
      query: ({ id, ...patch }) => ({
        url: `SalesOrder/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            SalesOrderService.util.updateQueryData('getSalesOrder', id, (draft) => {
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
        { type: 'SalesOrder', id },
        { type: 'SalesOrder', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteSalesOrder: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `SalesOrder/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'SalesOrder', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetSalesOrdersPagedQuery`
export const {
  useGetSalesOrdersPagedQuery,     // immediate fetch
  useLazyGetSalesOrdersPagedQuery, // lazy fetch
  useGetSalesOrderQuery,
  useGetSalesOrdersQuery,
  useAddSalesOrderMutation,
  useUpdateSalesOrderMutation,
  useDeleteSalesOrderMutation,
} = SalesOrderService
