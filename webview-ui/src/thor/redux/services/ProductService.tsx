import { createApi } from '@reduxjs/toolkit/query/react'
import { Product } from '@thor/model/Product'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type ProductResponse = Product[]

export const ProductService = createApi({
  reducerPath: 'Product', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['Product'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getProductsPaged: build.query<ProductResponse, { page: number; size?: number; example?: Partial<Product> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `Product?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Product' as const, id })),
              { type: 'Product', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getProducts: build.query<ProductResponse, { example?: Partial<Product> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `Product?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `Product`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Product' as const, id })),
              { type: 'Product', id: 'LIST' },
            ]
          : [{ type: 'Product', id: 'LIST' }],
    }),

    // 3) Create
    addProduct: build.mutation<Product, Partial<Product>>({
      query: (body) => ({
        url: `Product`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Product', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getProduct: build.query<Product, string>({
      query: (id) => `Product/${id}`,
      providesTags: (result, error, id) => [{ type: 'Product', id }],
    }),

    // 5) Update
    updateProduct: build.mutation<void, Pick<Product, 'id'> & Partial<Product>>({
      query: ({ id, ...patch }) => ({
        url: `Product/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            ProductService.util.updateQueryData('getProduct', id, (draft) => {
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
        { type: 'Product', id },
        { type: 'Product', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteProduct: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `Product/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'Product', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetProductsPagedQuery`
export const {
  useGetProductsPagedQuery,     // immediate fetch
  useLazyGetProductsPagedQuery, // lazy fetch
  useGetProductQuery,
  useGetProductsQuery,
  useAddProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
} = ProductService
