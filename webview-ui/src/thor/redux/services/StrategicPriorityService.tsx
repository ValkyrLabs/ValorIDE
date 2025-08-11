import { createApi } from "@reduxjs/toolkit/query/react";
import { StrategicPriority } from "../../model";
import customBaseQuery from "../customBaseQuery"; // Import the custom base query

type StrategicPriorityResponse = StrategicPriority[];

export const StrategicPriorityService = createApi({
  reducerPath: "StrategicPriority", // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ["StrategicPriority"],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    getStrategicPrioritysPaged: build.query<
      StrategicPriorityResponse,
      { page: number; limit?: number }
    >({
      query: ({ page, limit = 20 }) =>
        `StrategicPriority?page=${page}&limit=${limit}`,
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "StrategicPriority" as const,
                id,
              })),
              { type: "StrategicPriority", id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getStrategicPrioritys: build.query<StrategicPriorityResponse, void>({
      query: () => `StrategicPriority`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "StrategicPriority" as const,
                id,
              })),
              { type: "StrategicPriority", id: "LIST" },
            ]
          : [{ type: "StrategicPriority", id: "LIST" }],
    }),

    // 3) Create
    addStrategicPriority: build.mutation<
      StrategicPriority,
      Partial<StrategicPriority>
    >({
      query: (body) => ({
        url: `StrategicPriority`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "StrategicPriority", id: "LIST" }],
    }),

    // 4) Get single by ID
    getStrategicPriority: build.query<StrategicPriority, string>({
      query: (id) => `StrategicPriority/${id}`,
      providesTags: (result, error, id) => [{ type: "StrategicPriority", id }],
    }),

    // 5) Update
    updateStrategicPriority: build.mutation<
      void,
      Pick<StrategicPriority, "id"> & Partial<StrategicPriority>
    >({
      query: ({ id, ...patch }) => ({
        url: `StrategicPriority/${id}`,
        method: "PUT",
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            StrategicPriorityService.util.updateQueryData(
              "getStrategicPriority",
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
        { type: "StrategicPriority", id },
      ],
    }),

    // 6) Delete
    deleteStrategicPriority: build.mutation<
      { success: boolean; id: string },
      number
    >({
      query(id) {
        return {
          url: `StrategicPriority/${id}`,
          method: "DELETE",
        };
      },
      invalidatesTags: (result, error, id) => [
        { type: "StrategicPriority", id },
      ],
    }),
  }),
});

// Notice we now also export `useLazyGetStrategicPrioritysPagedQuery`
export const {
  useGetStrategicPrioritysPagedQuery, // immediate fetch
  useLazyGetStrategicPrioritysPagedQuery, // lazy fetch
  useGetStrategicPriorityQuery,
  useGetStrategicPrioritysQuery,
  useAddStrategicPriorityMutation,
  useUpdateStrategicPriorityMutation,
  useDeleteStrategicPriorityMutation,
} = StrategicPriorityService;
