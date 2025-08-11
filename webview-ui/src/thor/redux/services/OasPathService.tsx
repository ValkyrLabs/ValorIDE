import { createApi } from "@reduxjs/toolkit/query/react";
import { OasPath } from "../../model";
import customBaseQuery from "../customBaseQuery"; // Import the custom base query

type OasPathResponse = OasPath[];

export const OasPathService = createApi({
  reducerPath: "OasPath", // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ["OasPath"],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    getOasPathsPaged: build.query<
      OasPathResponse,
      { page: number; limit?: number }
    >({
      query: ({ page, limit = 20 }) => `OasPath?page=${page}&limit=${limit}`,
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "OasPath" as const, id })),
              { type: "OasPath", id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getOasPaths: build.query<OasPathResponse, void>({
      query: () => `OasPath`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "OasPath" as const, id })),
              { type: "OasPath", id: "LIST" },
            ]
          : [{ type: "OasPath", id: "LIST" }],
    }),

    // 3) Create
    addOasPath: build.mutation<OasPath, Partial<OasPath>>({
      query: (body) => ({
        url: `OasPath`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "OasPath", id: "LIST" }],
    }),

    // 4) Get single by ID
    getOasPath: build.query<OasPath, string>({
      query: (id) => `OasPath/${id}`,
      providesTags: (result, error, id) => [{ type: "OasPath", id }],
    }),

    // 5) Update
    updateOasPath: build.mutation<void, Pick<OasPath, "id"> & Partial<OasPath>>(
      {
        query: ({ id, ...patch }) => ({
          url: `OasPath/${id}`,
          method: "PUT",
          body: patch,
        }),
        async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
          if (id) {
            const patchResult = dispatch(
              OasPathService.util.updateQueryData("getOasPath", id, (draft) => {
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
        invalidatesTags: (result, error, { id }) => [{ type: "OasPath", id }],
      },
    ),

    // 6) Delete
    deleteOasPath: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `OasPath/${id}`,
          method: "DELETE",
        };
      },
      invalidatesTags: (result, error, id) => [{ type: "OasPath", id }],
    }),
  }),
});

// Notice we now also export `useLazyGetOasPathsPagedQuery`
export const {
  useGetOasPathsPagedQuery, // immediate fetch
  useLazyGetOasPathsPagedQuery, // lazy fetch
  useGetOasPathQuery,
  useGetOasPathsQuery,
  useAddOasPathMutation,
  useUpdateOasPathMutation,
  useDeleteOasPathMutation,
} = OasPathService;
