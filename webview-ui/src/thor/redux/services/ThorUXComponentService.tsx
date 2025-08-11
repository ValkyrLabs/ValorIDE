import { createApi } from "@reduxjs/toolkit/query/react";
import { ThorUXComponent } from "../../model";
import customBaseQuery from "../customBaseQuery"; // Import the custom base query

type ThorUXComponentResponse = ThorUXComponent[];

export const ThorUXComponentService = createApi({
  reducerPath: "ThorUXComponent", // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ["ThorUXComponent"],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    getThorUXComponentsPaged: build.query<
      ThorUXComponentResponse,
      { page: number; limit?: number }
    >({
      query: ({ page, limit = 20 }) =>
        `ThorUXComponent?page=${page}&limit=${limit}`,
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "ThorUXComponent" as const,
                id,
              })),
              { type: "ThorUXComponent", id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getThorUXComponents: build.query<ThorUXComponentResponse, void>({
      query: () => `ThorUXComponent`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "ThorUXComponent" as const,
                id,
              })),
              { type: "ThorUXComponent", id: "LIST" },
            ]
          : [{ type: "ThorUXComponent", id: "LIST" }],
    }),

    // 3) Create
    addThorUXComponent: build.mutation<
      ThorUXComponent,
      Partial<ThorUXComponent>
    >({
      query: (body) => ({
        url: `ThorUXComponent`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "ThorUXComponent", id: "LIST" }],
    }),

    // 4) Get single by ID
    getThorUXComponent: build.query<ThorUXComponent, string>({
      query: (id) => `ThorUXComponent/${id}`,
      providesTags: (result, error, id) => [{ type: "ThorUXComponent", id }],
    }),

    // 5) Update
    updateThorUXComponent: build.mutation<
      void,
      Pick<ThorUXComponent, "id"> & Partial<ThorUXComponent>
    >({
      query: ({ id, ...patch }) => ({
        url: `ThorUXComponent/${id}`,
        method: "PUT",
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            ThorUXComponentService.util.updateQueryData(
              "getThorUXComponent",
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
        { type: "ThorUXComponent", id },
      ],
    }),

    // 6) Delete
    deleteThorUXComponent: build.mutation<
      { success: boolean; id: string },
      number
    >({
      query(id) {
        return {
          url: `ThorUXComponent/${id}`,
          method: "DELETE",
        };
      },
      invalidatesTags: (result, error, id) => [{ type: "ThorUXComponent", id }],
    }),
  }),
});

// Notice we now also export `useLazyGetThorUXComponentsPagedQuery`
export const {
  useGetThorUXComponentsPagedQuery, // immediate fetch
  useLazyGetThorUXComponentsPagedQuery, // lazy fetch
  useGetThorUXComponentQuery,
  useGetThorUXComponentsQuery,
  useAddThorUXComponentMutation,
  useUpdateThorUXComponentMutation,
  useDeleteThorUXComponentMutation,
} = ThorUXComponentService;
