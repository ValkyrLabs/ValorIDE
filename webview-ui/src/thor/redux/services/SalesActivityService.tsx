import { createApi } from "@reduxjs/toolkit/query/react";
import { SalesActivity } from "../../model";
import customBaseQuery from "../customBaseQuery"; // Import the custom base query

type SalesActivityResponse = SalesActivity[];

export const SalesActivityService = createApi({
  reducerPath: "SalesActivity", // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ["SalesActivity"],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    getSalesActivitysPaged: build.query<
      SalesActivityResponse,
      { page: number; limit?: number }
    >({
      query: ({ page, limit = 20 }) =>
        `SalesActivity?page=${page}&limit=${limit}`,
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "SalesActivity" as const,
                id,
              })),
              { type: "SalesActivity", id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getSalesActivitys: build.query<SalesActivityResponse, void>({
      query: () => `SalesActivity`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "SalesActivity" as const,
                id,
              })),
              { type: "SalesActivity", id: "LIST" },
            ]
          : [{ type: "SalesActivity", id: "LIST" }],
    }),

    // 3) Create
    addSalesActivity: build.mutation<SalesActivity, Partial<SalesActivity>>({
      query: (body) => ({
        url: `SalesActivity`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "SalesActivity", id: "LIST" }],
    }),

    // 4) Get single by ID
    getSalesActivity: build.query<SalesActivity, string>({
      query: (id) => `SalesActivity/${id}`,
      providesTags: (result, error, id) => [{ type: "SalesActivity", id }],
    }),

    // 5) Update
    updateSalesActivity: build.mutation<
      void,
      Pick<SalesActivity, "id"> & Partial<SalesActivity>
    >({
      query: ({ id, ...patch }) => ({
        url: `SalesActivity/${id}`,
        method: "PUT",
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            SalesActivityService.util.updateQueryData(
              "getSalesActivity",
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
        { type: "SalesActivity", id },
      ],
    }),

    // 6) Delete
    deleteSalesActivity: build.mutation<
      { success: boolean; id: string },
      number
    >({
      query(id) {
        return {
          url: `SalesActivity/${id}`,
          method: "DELETE",
        };
      },
      invalidatesTags: (result, error, id) => [{ type: "SalesActivity", id }],
    }),
  }),
});

// Notice we now also export `useLazyGetSalesActivitysPagedQuery`
export const {
  useGetSalesActivitysPagedQuery, // immediate fetch
  useLazyGetSalesActivitysPagedQuery, // lazy fetch
  useGetSalesActivityQuery,
  useGetSalesActivitysQuery,
  useAddSalesActivityMutation,
  useUpdateSalesActivityMutation,
  useDeleteSalesActivityMutation,
} = SalesActivityService;
