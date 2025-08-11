import { createApi } from "@reduxjs/toolkit/query/react";
import { PivotTable } from "../../model";
import customBaseQuery from "../customBaseQuery"; // Import the custom base query

type PivotTableResponse = PivotTable[];

export const PivotTableService = createApi({
  reducerPath: "PivotTable", // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ["PivotTable"],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    getPivotTablesPaged: build.query<
      PivotTableResponse,
      { page: number; limit?: number }
    >({
      query: ({ page, limit = 20 }) => `PivotTable?page=${page}&limit=${limit}`,
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "PivotTable" as const, id })),
              { type: "PivotTable", id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getPivotTables: build.query<PivotTableResponse, void>({
      query: () => `PivotTable`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "PivotTable" as const, id })),
              { type: "PivotTable", id: "LIST" },
            ]
          : [{ type: "PivotTable", id: "LIST" }],
    }),

    // 3) Create
    addPivotTable: build.mutation<PivotTable, Partial<PivotTable>>({
      query: (body) => ({
        url: `PivotTable`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "PivotTable", id: "LIST" }],
    }),

    // 4) Get single by ID
    getPivotTable: build.query<PivotTable, string>({
      query: (id) => `PivotTable/${id}`,
      providesTags: (result, error, id) => [{ type: "PivotTable", id }],
    }),

    // 5) Update
    updatePivotTable: build.mutation<
      void,
      Pick<PivotTable, "id"> & Partial<PivotTable>
    >({
      query: ({ id, ...patch }) => ({
        url: `PivotTable/${id}`,
        method: "PUT",
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            PivotTableService.util.updateQueryData(
              "getPivotTable",
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
      invalidatesTags: (result, error, { id }) => [{ type: "PivotTable", id }],
    }),

    // 6) Delete
    deletePivotTable: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `PivotTable/${id}`,
          method: "DELETE",
        };
      },
      invalidatesTags: (result, error, id) => [{ type: "PivotTable", id }],
    }),
  }),
});

// Notice we now also export `useLazyGetPivotTablesPagedQuery`
export const {
  useGetPivotTablesPagedQuery, // immediate fetch
  useLazyGetPivotTablesPagedQuery, // lazy fetch
  useGetPivotTableQuery,
  useGetPivotTablesQuery,
  useAddPivotTableMutation,
  useUpdatePivotTableMutation,
  useDeletePivotTableMutation,
} = PivotTableService;
