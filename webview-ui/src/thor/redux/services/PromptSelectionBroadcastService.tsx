import { createApi } from "@reduxjs/toolkit/query/react";
import { PromptSelectionBroadcast } from "@thor/model/PromptSelectionBroadcast";
import customBaseQuery from "../customBaseQuery"; // Import the custom base query

type PromptSelectionBroadcastResponse = PromptSelectionBroadcast[];

export const PromptSelectionBroadcastService = createApi({
  reducerPath: "PromptSelectionBroadcast", // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ["PromptSelectionBroadcast"],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getPromptSelectionBroadcastsPaged: build.query<
      PromptSelectionBroadcastResponse,
      {
        page: number;
        size?: number;
        example?: Partial<PromptSelectionBroadcast>;
      }
    >({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example)
          q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `PromptSelectionBroadcast?${q.join("&")}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "PromptSelectionBroadcast" as const,
                id,
              })),
              { type: "PromptSelectionBroadcast", id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getPromptSelectionBroadcasts: build.query<
      PromptSelectionBroadcastResponse,
      { example?: Partial<PromptSelectionBroadcast> } | void
    >({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `PromptSelectionBroadcast?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `PromptSelectionBroadcast`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "PromptSelectionBroadcast" as const,
                id,
              })),
              { type: "PromptSelectionBroadcast", id: "LIST" },
            ]
          : [{ type: "PromptSelectionBroadcast", id: "LIST" }],
    }),

    // 3) Create
    addPromptSelectionBroadcast: build.mutation<
      PromptSelectionBroadcast,
      Partial<PromptSelectionBroadcast>
    >({
      query: (body) => ({
        url: `PromptSelectionBroadcast`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "PromptSelectionBroadcast", id: "LIST" }],
    }),

    // 4) Get single by ID
    getPromptSelectionBroadcast: build.query<PromptSelectionBroadcast, string>({
      query: (id) => `PromptSelectionBroadcast/${id}`,
      providesTags: (result, error, id) => [
        { type: "PromptSelectionBroadcast", id },
      ],
    }),

    // 5) Update
    updatePromptSelectionBroadcast: build.mutation<
      void,
      Pick<PromptSelectionBroadcast, "id"> & Partial<PromptSelectionBroadcast>
    >({
      query: ({ id, ...patch }) => ({
        url: `PromptSelectionBroadcast/${id}`,
        method: "PUT",
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            PromptSelectionBroadcastService.util.updateQueryData(
              "getPromptSelectionBroadcast",
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
      invalidatesTags: (
        result,
        error,
        { id }: Pick<PromptSelectionBroadcast, "id">,
      ) => [
        { type: "PromptSelectionBroadcast", id },
        { type: "PromptSelectionBroadcast", id: "LIST" },
      ],
    }),

    // 6) Delete
    deletePromptSelectionBroadcast: build.mutation<
      { success: boolean; id: string },
      number
    >({
      query(id) {
        return {
          url: `PromptSelectionBroadcast/${id}`,
          method: "DELETE",
        };
      },
      invalidatesTags: (result, error, id) => [
        { type: "PromptSelectionBroadcast", id },
      ],
    }),
  }),
});

// Notice we now also export `useLazyGetPromptSelectionBroadcastsPagedQuery`
export const {
  useGetPromptSelectionBroadcastsPagedQuery, // immediate fetch
  useLazyGetPromptSelectionBroadcastsPagedQuery, // lazy fetch
  useGetPromptSelectionBroadcastQuery,
  useGetPromptSelectionBroadcastsQuery,
  useAddPromptSelectionBroadcastMutation,
  useUpdatePromptSelectionBroadcastMutation,
  useDeletePromptSelectionBroadcastMutation,
} = PromptSelectionBroadcastService;
