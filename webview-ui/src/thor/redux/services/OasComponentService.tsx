import { createApi } from "@reduxjs/toolkit/query/react";
import { OasComponent } from "../../model";
import customBaseQuery from "../customBaseQuery"; // Import the custom base query

type OasComponentResponse = OasComponent[];

export const OasComponentService = createApi({
  reducerPath: "OasComponent", // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ["OasComponent"],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    getOasComponentsPaged: build.query<
      OasComponentResponse,
      { page: number; limit?: number }
    >({
      query: ({ page, limit = 20 }) =>
        `OasComponent?page=${page}&limit=${limit}`,
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "OasComponent" as const,
                id,
              })),
              { type: "OasComponent", id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getOasComponents: build.query<OasComponentResponse, void>({
      query: () => `OasComponent`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "OasComponent" as const,
                id,
              })),
              { type: "OasComponent", id: "LIST" },
            ]
          : [{ type: "OasComponent", id: "LIST" }],
    }),

    // 3) Create
    addOasComponent: build.mutation<OasComponent, Partial<OasComponent>>({
      query: (body) => ({
        url: `OasComponent`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "OasComponent", id: "LIST" }],
    }),

    // 4) Get single by ID
    getOasComponent: build.query<OasComponent, string>({
      query: (id) => `OasComponent/${id}`,
      providesTags: (result, error, id) => [{ type: "OasComponent", id }],
    }),

    // 5) Update
    updateOasComponent: build.mutation<
      void,
      Pick<OasComponent, "id"> & Partial<OasComponent>
    >({
      query: ({ id, ...patch }) => ({
        url: `OasComponent/${id}`,
        method: "PUT",
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            OasComponentService.util.updateQueryData(
              "getOasComponent",
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
        { type: "OasComponent", id },
      ],
    }),

    // 6) Delete
    deleteOasComponent: build.mutation<
      { success: boolean; id: string },
      number
    >({
      query(id) {
        return {
          url: `OasComponent/${id}`,
          method: "DELETE",
        };
      },
      invalidatesTags: (result, error, id) => [{ type: "OasComponent", id }],
    }),
  }),
});

// Notice we now also export `useLazyGetOasComponentsPagedQuery`
export const {
  useGetOasComponentsPagedQuery, // immediate fetch
  useLazyGetOasComponentsPagedQuery, // lazy fetch
  useGetOasComponentQuery,
  useGetOasComponentsQuery,
  useAddOasComponentMutation,
  useUpdateOasComponentMutation,
  useDeleteOasComponentMutation,
} = OasComponentService;
