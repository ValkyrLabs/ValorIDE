import { createApi } from "@reduxjs/toolkit/query/react";
import { OasOperation } from "../../model";
import customBaseQuery from "../customBaseQuery"; // Import the custom base query

type OasOperationResponse = OasOperation[];

export const OasOperationService = createApi({
  reducerPath: "OasOperation", // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ["OasOperation"],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    getOasOperationsPaged: build.query<
      OasOperationResponse,
      { page: number; limit?: number }
    >({
      query: ({ page, limit = 20 }) =>
        `OasOperation?page=${page}&limit=${limit}`,
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "OasOperation" as const,
                id,
              })),
              { type: "OasOperation", id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getOasOperations: build.query<OasOperationResponse, void>({
      query: () => `OasOperation`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "OasOperation" as const,
                id,
              })),
              { type: "OasOperation", id: "LIST" },
            ]
          : [{ type: "OasOperation", id: "LIST" }],
    }),

    // 3) Create
    addOasOperation: build.mutation<OasOperation, Partial<OasOperation>>({
      query: (body) => ({
        url: `OasOperation`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "OasOperation", id: "LIST" }],
    }),

    // 4) Get single by ID
    getOasOperation: build.query<OasOperation, string>({
      query: (id) => `OasOperation/${id}`,
      providesTags: (result, error, id) => [{ type: "OasOperation", id }],
    }),

    // 5) Update
    updateOasOperation: build.mutation<
      void,
      Pick<OasOperation, "id"> & Partial<OasOperation>
    >({
      query: ({ id, ...patch }) => ({
        url: `OasOperation/${id}`,
        method: "PUT",
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            OasOperationService.util.updateQueryData(
              "getOasOperation",
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
        { type: "OasOperation", id },
      ],
    }),

    // 6) Delete
    deleteOasOperation: build.mutation<
      { success: boolean; id: string },
      number
    >({
      query(id) {
        return {
          url: `OasOperation/${id}`,
          method: "DELETE",
        };
      },
      invalidatesTags: (result, error, id) => [{ type: "OasOperation", id }],
    }),
  }),
});

// Notice we now also export `useLazyGetOasOperationsPagedQuery`
export const {
  useGetOasOperationsPagedQuery, // immediate fetch
  useLazyGetOasOperationsPagedQuery, // lazy fetch
  useGetOasOperationQuery,
  useGetOasOperationsQuery,
  useAddOasOperationMutation,
  useUpdateOasOperationMutation,
  useDeleteOasOperationMutation,
} = OasOperationService;
