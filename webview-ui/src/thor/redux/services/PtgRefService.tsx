import { createApi } from "@reduxjs/toolkit/query/react";
import { PtgRef } from "../../model";
import customBaseQuery from "../customBaseQuery"; // Import the custom base query

type PtgRefResponse = PtgRef[];

export const PtgRefService = createApi({
  reducerPath: "PtgRef", // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ["PtgRef"],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    getPtgRefsPaged: build.query<
      PtgRefResponse,
      { page: number; limit?: number }
    >({
      query: ({ page, limit = 20 }) => `PtgRef?page=${page}&limit=${limit}`,
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "PtgRef" as const, id })),
              { type: "PtgRef", id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getPtgRefs: build.query<PtgRefResponse, void>({
      query: () => `PtgRef`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "PtgRef" as const, id })),
              { type: "PtgRef", id: "LIST" },
            ]
          : [{ type: "PtgRef", id: "LIST" }],
    }),

    // 3) Create
    addPtgRef: build.mutation<PtgRef, Partial<PtgRef>>({
      query: (body) => ({
        url: `PtgRef`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "PtgRef", id: "LIST" }],
    }),

    // 4) Get single by ID
    getPtgRef: build.query<PtgRef, string>({
      query: (id) => `PtgRef/${id}`,
      providesTags: (result, error, id) => [{ type: "PtgRef", id }],
    }),

    // 5) Update
    updatePtgRef: build.mutation<void, Pick<PtgRef, "id"> & Partial<PtgRef>>({
      query: ({ id, ...patch }) => ({
        url: `PtgRef/${id}`,
        method: "PUT",
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            PtgRefService.util.updateQueryData("getPtgRef", id, (draft) => {
              Object.assign(draft, patch);
            }),
          );
          try {
            await queryFulfilled;
          } catch {
            patchResult.undo();
          }
        }
      },
      invalidatesTags: (result, error, { id }) => [{ type: "PtgRef", id }],
    }),

    // 6) Delete
    deletePtgRef: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `PtgRef/${id}`,
          method: "DELETE",
        };
      },
      invalidatesTags: (result, error, id) => [{ type: "PtgRef", id }],
    }),
  }),
});

// Notice we now also export `useLazyGetPtgRefsPagedQuery`
export const {
  useGetPtgRefsPagedQuery, // immediate fetch
  useLazyGetPtgRefsPagedQuery, // lazy fetch
  useGetPtgRefQuery,
  useGetPtgRefsQuery,
  useAddPtgRefMutation,
  useUpdatePtgRefMutation,
  useDeletePtgRefMutation,
} = PtgRefService;
