import { createApi } from "@reduxjs/toolkit/query/react";
import { ProductFeature } from "../../model";
import customBaseQuery from "../customBaseQuery"; // Import the custom base query

type ProductFeatureResponse = ProductFeature[];

export const ProductFeatureService = createApi({
  reducerPath: "ProductFeature", // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ["ProductFeature"],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    getProductFeaturesPaged: build.query<
      ProductFeatureResponse,
      { page: number; limit?: number }
    >({
      query: ({ page, limit = 20 }) =>
        `ProductFeature?page=${page}&limit=${limit}`,
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "ProductFeature" as const,
                id,
              })),
              { type: "ProductFeature", id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getProductFeatures: build.query<ProductFeatureResponse, void>({
      query: () => `ProductFeature`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "ProductFeature" as const,
                id,
              })),
              { type: "ProductFeature", id: "LIST" },
            ]
          : [{ type: "ProductFeature", id: "LIST" }],
    }),

    // 3) Create
    addProductFeature: build.mutation<ProductFeature, Partial<ProductFeature>>({
      query: (body) => ({
        url: `ProductFeature`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "ProductFeature", id: "LIST" }],
    }),

    // 4) Get single by ID
    getProductFeature: build.query<ProductFeature, string>({
      query: (id) => `ProductFeature/${id}`,
      providesTags: (result, error, id) => [{ type: "ProductFeature", id }],
    }),

    // 5) Update
    updateProductFeature: build.mutation<
      void,
      Pick<ProductFeature, "id"> & Partial<ProductFeature>
    >({
      query: ({ id, ...patch }) => ({
        url: `ProductFeature/${id}`,
        method: "PUT",
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            ProductFeatureService.util.updateQueryData(
              "getProductFeature",
              id,
              (draft) => {
                Object.assign(draft, patch);
              },
            ),
          );
          try {
            await queryFulfilled;
          } catch {
            patchResult.undo();
          }
        }
      },
      invalidatesTags: (result, error, { id }) => [
        { type: "ProductFeature", id },
      ],
    }),

    // 6) Delete
    deleteProductFeature: build.mutation<
      { success: boolean; id: string },
      number
    >({
      query(id) {
        return {
          url: `ProductFeature/${id}`,
          method: "DELETE",
        };
      },
      invalidatesTags: (result, error, id) => [{ type: "ProductFeature", id }],
    }),
  }),
});

// Notice we now also export `useLazyGetProductFeaturesPagedQuery`
export const {
  useGetProductFeaturesPagedQuery, // immediate fetch
  useLazyGetProductFeaturesPagedQuery, // lazy fetch
  useGetProductFeatureQuery,
  useGetProductFeaturesQuery,
  useAddProductFeatureMutation,
  useUpdateProductFeatureMutation,
  useDeleteProductFeatureMutation,
} = ProductFeatureService;
