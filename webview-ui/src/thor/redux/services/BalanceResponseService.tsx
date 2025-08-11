import { createApi } from "@reduxjs/toolkit/query/react";
import { BalanceResponse } from "../../model";
import customBaseQuery from "../customBaseQuery"; // Import the custom base query

type BalanceResponseResponse = BalanceResponse[];

export const BalanceResponseService = createApi({
  reducerPath: "BalanceResponse", // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ["BalanceResponse"],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    getBalanceResponsesPaged: build.query<
      BalanceResponseResponse,
      { page: number; limit?: number }
    >({
      query: ({ page, limit = 20 }) =>
        `BalanceResponse?page=${page}&limit=${limit}`,
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "BalanceResponse" as const,
                id,
              })),
              { type: "BalanceResponse", id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getBalanceResponses: build.query<BalanceResponseResponse, void>({
      query: () => `BalanceResponse`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "BalanceResponse" as const,
                id,
              })),
              { type: "BalanceResponse", id: "LIST" },
            ]
          : [{ type: "BalanceResponse", id: "LIST" }],
    }),

    // 3) Create
    addBalanceResponse: build.mutation<
      BalanceResponse,
      Partial<BalanceResponse>
    >({
      query: (body) => ({
        url: `BalanceResponse`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "BalanceResponse", id: "LIST" }],
    }),

    // 4) Get single by ID
    getBalanceResponse: build.query<BalanceResponse, string>({
      query: (id) => `BalanceResponse/${id}`,
      providesTags: (result, error, id) => [{ type: "BalanceResponse", id }],
    }),

    // 5) Update
    updateBalanceResponse: build.mutation<
      void,
      Pick<BalanceResponse, "id"> & Partial<BalanceResponse>
    >({
      query: ({ id, ...patch }) => ({
        url: `BalanceResponse/${id}`,
        method: "PUT",
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            BalanceResponseService.util.updateQueryData(
              "getBalanceResponse",
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
        { type: "BalanceResponse", id },
      ],
    }),

    // 6) Delete
    deleteBalanceResponse: build.mutation<
      { success: boolean; id: string },
      number
    >({
      query(id) {
        return {
          url: `BalanceResponse/${id}`,
          method: "DELETE",
        };
      },
      invalidatesTags: (result, error, id) => [{ type: "BalanceResponse", id }],
    }),
  }),
});

// Notice we now also export `useLazyGetBalanceResponsesPagedQuery`
export const {
  useGetBalanceResponsesPagedQuery, // immediate fetch
  useLazyGetBalanceResponsesPagedQuery, // lazy fetch
  useGetBalanceResponseQuery,
  useGetBalanceResponsesQuery,
  useAddBalanceResponseMutation,
  useUpdateBalanceResponseMutation,
  useDeleteBalanceResponseMutation,
} = BalanceResponseService;
