import { createApi } from "@reduxjs/toolkit/query/react";
import { Depend } from "../../model";
import customBaseQuery from "../customBaseQuery"; // Import the custom base query

type DependResponse = Depend[];

export const DependService = createApi({
  reducerPath: "Depend", // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ["Depend"],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    getDependsPaged: build.query<
      DependResponse,
      { page: number; limit?: number }
    >({
      query: ({ page, limit = 20 }) => `Depend?page=${page}&limit=${limit}`,
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Depend" as const, id })),
              { type: "Depend", id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getDepends: build.query<DependResponse, void>({
      query: () => `Depend`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Depend" as const, id })),
              { type: "Depend", id: "LIST" },
            ]
          : [{ type: "Depend", id: "LIST" }],
    }),

    // 3) Create
    addDepend: build.mutation<Depend, Partial<Depend>>({
      query: (body) => ({
        url: `Depend`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Depend", id: "LIST" }],
    }),

    // 4) Get single by ID
    getDepend: build.query<Depend, string>({
      query: (id) => `Depend/${id}`,
      providesTags: (result, error, id) => [{ type: "Depend", id }],
    }),

    // 5) Update
    updateDepend: build.mutation<void, Pick<Depend, "id"> & Partial<Depend>>({
      query: ({ id, ...patch }) => ({
        url: `Depend/${id}`,
        method: "PUT",
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            DependService.util.updateQueryData("getDepend", id, (draft) => {
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
      invalidatesTags: (result, error, { id }) => [{ type: "Depend", id }],
    }),

    // 6) Delete
    deleteDepend: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `Depend/${id}`,
          method: "DELETE",
        };
      },
      invalidatesTags: (result, error, id) => [{ type: "Depend", id }],
    }),
  }),
});

// Notice we now also export `useLazyGetDependsPagedQuery`
export const {
  useGetDependsPagedQuery, // immediate fetch
  useLazyGetDependsPagedQuery, // lazy fetch
  useGetDependQuery,
  useGetDependsQuery,
  useAddDependMutation,
  useUpdateDependMutation,
  useDeleteDependMutation,
} = DependService;
