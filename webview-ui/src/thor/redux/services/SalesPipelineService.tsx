import { createApi } from "@reduxjs/toolkit/query/react";
import { SalesPipeline } from "../../model";
import customBaseQuery from "../customBaseQuery"; // Import the custom base query

type SalesPipelineResponse = SalesPipeline[];

export const SalesPipelineService = createApi({
  reducerPath: "SalesPipeline", // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ["SalesPipeline"],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    getSalesPipelinesPaged: build.query<
      SalesPipelineResponse,
      { page: number; limit?: number }
    >({
      query: ({ page, limit = 20 }) =>
        `SalesPipeline?page=${page}&limit=${limit}`,
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "SalesPipeline" as const,
                id,
              })),
              { type: "SalesPipeline", id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getSalesPipelines: build.query<SalesPipelineResponse, void>({
      query: () => `SalesPipeline`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "SalesPipeline" as const,
                id,
              })),
              { type: "SalesPipeline", id: "LIST" },
            ]
          : [{ type: "SalesPipeline", id: "LIST" }],
    }),

    // 3) Create
    addSalesPipeline: build.mutation<SalesPipeline, Partial<SalesPipeline>>({
      query: (body) => ({
        url: `SalesPipeline`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "SalesPipeline", id: "LIST" }],
    }),

    // 4) Get single by ID
    getSalesPipeline: build.query<SalesPipeline, string>({
      query: (id) => `SalesPipeline/${id}`,
      providesTags: (result, error, id) => [{ type: "SalesPipeline", id }],
    }),

    // 5) Update
    updateSalesPipeline: build.mutation<
      void,
      Pick<SalesPipeline, "id"> & Partial<SalesPipeline>
    >({
      query: ({ id, ...patch }) => ({
        url: `SalesPipeline/${id}`,
        method: "PUT",
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            SalesPipelineService.util.updateQueryData(
              "getSalesPipeline",
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
        { type: "SalesPipeline", id },
      ],
    }),

    // 6) Delete
    deleteSalesPipeline: build.mutation<
      { success: boolean; id: string },
      number
    >({
      query(id) {
        return {
          url: `SalesPipeline/${id}`,
          method: "DELETE",
        };
      },
      invalidatesTags: (result, error, id) => [{ type: "SalesPipeline", id }],
    }),
  }),
});

// Notice we now also export `useLazyGetSalesPipelinesPagedQuery`
export const {
  useGetSalesPipelinesPagedQuery, // immediate fetch
  useLazyGetSalesPipelinesPagedQuery, // lazy fetch
  useGetSalesPipelineQuery,
  useGetSalesPipelinesQuery,
  useAddSalesPipelineMutation,
  useUpdateSalesPipelineMutation,
  useDeleteSalesPipelineMutation,
} = SalesPipelineService;
