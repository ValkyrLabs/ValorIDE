import { createApi } from "@reduxjs/toolkit/query/react";
import { PresignResponse } from "@thor/model/PresignResponse";
import customBaseQuery from "../customBaseQuery"; // Import the custom base query

type PresignResponseResponse = PresignResponse[];

export const PresignResponseService = createApi({
  reducerPath: "PresignResponse", // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ["PresignResponse"],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getPresignResponsesPaged: build.query<
      PresignResponseResponse,
      { page: number; size?: number; example?: Partial<PresignResponse> }
    >({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example)
          q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `PresignResponse?${q.join("&")}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "PresignResponse" as const,
                id,
              })),
              { type: "PresignResponse", id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getPresignResponses: build.query<
      PresignResponseResponse,
      { example?: Partial<PresignResponse> } | void
    >({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `PresignResponse?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `PresignResponse`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "PresignResponse" as const,
                id,
              })),
              { type: "PresignResponse", id: "LIST" },
            ]
          : [{ type: "PresignResponse", id: "LIST" }],
    }),

    // 3) Create
    addPresignResponse: build.mutation<
      PresignResponse,
      Partial<PresignResponse>
    >({
      query: (body) => ({
        url: `PresignResponse`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "PresignResponse", id: "LIST" }],
    }),

    // 4) Get single by ID
    getPresignResponse: build.query<PresignResponse, string>({
      query: (id) => `PresignResponse/${id}`,
      providesTags: (result, error, id) => [{ type: "PresignResponse", id }],
    }),

    // 5) Update
    updatePresignResponse: build.mutation<
      void,
      Pick<PresignResponse, "id"> & Partial<PresignResponse>
    >({
      query: ({ id, ...patch }) => ({
        url: `PresignResponse/${id}`,
        method: "PUT",
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            PresignResponseService.util.updateQueryData(
              "getPresignResponse",
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
      invalidatesTags: (result, error, { id }: Pick<PresignResponse, "id">) => [
        { type: "PresignResponse", id },
        { type: "PresignResponse", id: "LIST" },
      ],
    }),

    // 6) Delete
    deletePresignResponse: build.mutation<
      { success: boolean; id: string },
      number
    >({
      query(id) {
        return {
          url: `PresignResponse/${id}`,
          method: "DELETE",
        };
      },
      invalidatesTags: (result, error, id) => [{ type: "PresignResponse", id }],
    }),
  }),
});

// Notice we now also export `useLazyGetPresignResponsesPagedQuery`
export const {
  useGetPresignResponsesPagedQuery, // immediate fetch
  useLazyGetPresignResponsesPagedQuery, // lazy fetch
  useGetPresignResponseQuery,
  useGetPresignResponsesQuery,
  useAddPresignResponseMutation,
  useUpdatePresignResponseMutation,
  useDeletePresignResponseMutation,
} = PresignResponseService;
