import { createApi } from '@reduxjs/toolkit/query/react'
import { ProductFunnelWizard } from '@thor/model/ProductFunnelWizard'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type ProductFunnelWizardResponse = ProductFunnelWizard[]

export const ProductFunnelWizardService = createApi({
  reducerPath: 'ProductFunnelWizard', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['ProductFunnelWizard'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getProductFunnelWizardsPaged: build.query<ProductFunnelWizardResponse, { page: number; size?: number; example?: Partial<ProductFunnelWizard> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `ProductFunnelWizard?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'ProductFunnelWizard' as const, id })),
              { type: 'ProductFunnelWizard', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getProductFunnelWizards: build.query<ProductFunnelWizardResponse, { example?: Partial<ProductFunnelWizard> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `ProductFunnelWizard?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `ProductFunnelWizard`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'ProductFunnelWizard' as const, id })),
              { type: 'ProductFunnelWizard', id: 'LIST' },
            ]
          : [{ type: 'ProductFunnelWizard', id: 'LIST' }],
    }),

    // 3) Create
    addProductFunnelWizard: build.mutation<ProductFunnelWizard, Partial<ProductFunnelWizard>>({
      query: (body) => ({
        url: `ProductFunnelWizard`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'ProductFunnelWizard', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getProductFunnelWizard: build.query<ProductFunnelWizard, string>({
      query: (id) => `ProductFunnelWizard/${id}`,
      providesTags: (result, error, id) => [{ type: 'ProductFunnelWizard', id }],
    }),

    // 5) Update
    updateProductFunnelWizard: build.mutation<void, Pick<ProductFunnelWizard, 'id'> & Partial<ProductFunnelWizard>>({
      query: ({ id, ...patch }) => ({
        url: `ProductFunnelWizard/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            ProductFunnelWizardService.util.updateQueryData('getProductFunnelWizard', id, (draft) => {
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
        { type: 'ProductFunnelWizard', id },
        { type: 'ProductFunnelWizard', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteProductFunnelWizard: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `ProductFunnelWizard/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'ProductFunnelWizard', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetProductFunnelWizardsPagedQuery`
export const {
  useGetProductFunnelWizardsPagedQuery,     // immediate fetch
  useLazyGetProductFunnelWizardsPagedQuery, // lazy fetch
  useGetProductFunnelWizardQuery,
  useGetProductFunnelWizardsQuery,
  useAddProductFunnelWizardMutation,
  useUpdateProductFunnelWizardMutation,
  useDeleteProductFunnelWizardMutation,
} = ProductFunnelWizardService
