import { createApi } from '@reduxjs/toolkit/query/react'
import { Discount } from '@thor/model/Discount'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type DiscountResponse = Discount[]

export const DiscountService = createApi({
  reducerPath: 'Discount', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['Discount'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getDiscountsPaged: build.query<DiscountResponse, { page: number; size?: number; example?: Partial<Discount> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `Discount?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Discount' as const, id })),
              { type: 'Discount', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getDiscounts: build.query<DiscountResponse, { example?: Partial<Discount> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `Discount?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `Discount`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Discount' as const, id })),
              { type: 'Discount', id: 'LIST' },
            ]
          : [{ type: 'Discount', id: 'LIST' }],
    }),

    // 3) Create
    addDiscount: build.mutation<Discount, Partial<Discount>>({
      query: (body) => ({
        url: `Discount`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Discount', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getDiscount: build.query<Discount, string>({
      query: (id) => `Discount/${id}`,
      providesTags: (result, error, id) => [{ type: 'Discount', id }],
    }),

    // 5) Update
    updateDiscount: build.mutation<void, Pick<Discount, 'id'> & Partial<Discount>>({
      query: ({ id, ...patch }) => ({
        url: `Discount/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            DiscountService.util.updateQueryData('getDiscount', id, (draft) => {
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
        { type: 'Discount', id },
        { type: 'Discount', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteDiscount: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `Discount/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'Discount', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetDiscountsPagedQuery`
export const {
  useGetDiscountsPagedQuery,     // immediate fetch
  useLazyGetDiscountsPagedQuery, // lazy fetch
  useGetDiscountQuery,
  useGetDiscountsQuery,
  useAddDiscountMutation,
  useUpdateDiscountMutation,
  useDeleteDiscountMutation,
} = DiscountService
