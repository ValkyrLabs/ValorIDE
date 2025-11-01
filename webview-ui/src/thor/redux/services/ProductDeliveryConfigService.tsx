import { createApi } from '@reduxjs/toolkit/query/react'
import { ProductDeliveryConfig } from '@thor/model/ProductDeliveryConfig'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type ProductDeliveryConfigResponse = ProductDeliveryConfig[]

export const ProductDeliveryConfigService = createApi({
  reducerPath: 'ProductDeliveryConfig', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['ProductDeliveryConfig'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getProductDeliveryConfigsPaged: build.query<ProductDeliveryConfigResponse, { page: number; size?: number; example?: Partial<ProductDeliveryConfig> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `ProductDeliveryConfig?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'ProductDeliveryConfig' as const, id })),
              { type: 'ProductDeliveryConfig', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getProductDeliveryConfigs: build.query<ProductDeliveryConfigResponse, { example?: Partial<ProductDeliveryConfig> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `ProductDeliveryConfig?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `ProductDeliveryConfig`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'ProductDeliveryConfig' as const, id })),
              { type: 'ProductDeliveryConfig', id: 'LIST' },
            ]
          : [{ type: 'ProductDeliveryConfig', id: 'LIST' }],
    }),

    // 3) Create
    addProductDeliveryConfig: build.mutation<ProductDeliveryConfig, Partial<ProductDeliveryConfig>>({
      query: (body) => ({
        url: `ProductDeliveryConfig`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'ProductDeliveryConfig', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getProductDeliveryConfig: build.query<ProductDeliveryConfig, string>({
      query: (id) => `ProductDeliveryConfig/${id}`,
      providesTags: (result, error, id) => [{ type: 'ProductDeliveryConfig', id }],
    }),

    // 5) Update
    updateProductDeliveryConfig: build.mutation<void, Pick<ProductDeliveryConfig, 'id'> & Partial<ProductDeliveryConfig>>({
      query: ({ id, ...patch }) => ({
        url: `ProductDeliveryConfig/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            ProductDeliveryConfigService.util.updateQueryData('getProductDeliveryConfig', id, (draft) => {
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
        { type: 'ProductDeliveryConfig', id },
        { type: 'ProductDeliveryConfig', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteProductDeliveryConfig: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `ProductDeliveryConfig/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'ProductDeliveryConfig', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetProductDeliveryConfigsPagedQuery`
export const {
  useGetProductDeliveryConfigsPagedQuery,     // immediate fetch
  useLazyGetProductDeliveryConfigsPagedQuery, // lazy fetch
  useGetProductDeliveryConfigQuery,
  useGetProductDeliveryConfigsQuery,
  useAddProductDeliveryConfigMutation,
  useUpdateProductDeliveryConfigMutation,
  useDeleteProductDeliveryConfigMutation,
} = ProductDeliveryConfigService
