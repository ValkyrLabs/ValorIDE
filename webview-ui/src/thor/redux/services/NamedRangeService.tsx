import { createApi } from "@reduxjs/toolkit/query/react";
import { NamedRange } from "../../model";
import customBaseQuery from "../customBaseQuery"; // Import the custom base query

type NamedRangeResponse = NamedRange[];

export const NamedRangeService = createApi({
  reducerPath: "NamedRange", // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ["NamedRange"],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    getNamedRangesPaged: build.query<
      NamedRangeResponse,
      { page: number; limit?: number }
    >({
      query: ({ page, limit = 20 }) => `NamedRange?page=${page}&limit=${limit}`,
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "NamedRange" as const, id })),
              { type: "NamedRange", id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getNamedRanges: build.query<NamedRangeResponse, void>({
      query: () => `NamedRange`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "NamedRange" as const, id })),
              { type: "NamedRange", id: "LIST" },
            ]
          : [{ type: "NamedRange", id: "LIST" }],
    }),

    // 3) Create
    addNamedRange: build.mutation<NamedRange, Partial<NamedRange>>({
      query: (body) => ({
        url: `NamedRange`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "NamedRange", id: "LIST" }],
    }),

    // 4) Get single by ID
    getNamedRange: build.query<NamedRange, string>({
      query: (id) => `NamedRange/${id}`,
      providesTags: (result, error, id) => [{ type: "NamedRange", id }],
    }),

    // 5) Update
    updateNamedRange: build.mutation<
      void,
      Pick<NamedRange, "id"> & Partial<NamedRange>
    >({
      query: ({ id, ...patch }) => ({
        url: `NamedRange/${id}`,
        method: "PUT",
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            NamedRangeService.util.updateQueryData(
              "getNamedRange",
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
      invalidatesTags: (result, error, { id }) => [{ type: "NamedRange", id }],
    }),

    // 6) Delete
    deleteNamedRange: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `NamedRange/${id}`,
          method: "DELETE",
        };
      },
      invalidatesTags: (result, error, id) => [{ type: "NamedRange", id }],
    }),
  }),
});

// Notice we now also export `useLazyGetNamedRangesPagedQuery`
export const {
  useGetNamedRangesPagedQuery, // immediate fetch
  useLazyGetNamedRangesPagedQuery, // lazy fetch
  useGetNamedRangeQuery,
  useGetNamedRangesQuery,
  useAddNamedRangeMutation,
  useUpdateNamedRangeMutation,
  useDeleteNamedRangeMutation,
} = NamedRangeService;
