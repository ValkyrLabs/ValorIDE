import { createApi } from "@reduxjs/toolkit/query/react";
import { PresignRequest } from "@thor/model/PresignRequest";
import customBaseQuery from "../customBaseQuery"; // Import the custom base query

type PresignRequestResponse = PresignRequest[];

export const PresignRequestService = createApi({
  reducerPath: "PresignRequest", // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ["PresignRequest"],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getPresignRequestsPaged: build.query<
      PresignRequestResponse,
      { page: number; size?: number; example?: Partial<PresignRequest> }
    >({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example)
          q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `PresignRequest?${q.join("&")}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "PresignRequest" as const,
                id,
              })),
              { type: "PresignRequest", id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getPresignRequests: build.query<
      PresignRequestResponse,
      { example?: Partial<PresignRequest> } | void
    >({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `PresignRequest?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `PresignRequest`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "PresignRequest" as const,
                id,
              })),
              { type: "PresignRequest", id: "LIST" },
            ]
          : [{ type: "PresignRequest", id: "LIST" }],
    }),

    // 3) Create
    addPresignRequest: build.mutation<PresignRequest, Partial<PresignRequest>>({
      query: (body) => ({
        url: `PresignRequest`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "PresignRequest", id: "LIST" }],
    }),

    // 4) Get single by ID
    getPresignRequest: build.query<PresignRequest, string>({
      query: (id) => `PresignRequest/${id}`,
      providesTags: (result, error, id) => [{ type: "PresignRequest", id }],
    }),

    // 5) Update
    updatePresignRequest: build.mutation<
      void,
      Pick<PresignRequest, "id"> & Partial<PresignRequest>
    >({
      query: ({ id, ...patch }) => ({
        url: `PresignRequest/${id}`,
        method: "PUT",
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            PresignRequestService.util.updateQueryData(
              "getPresignRequest",
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
      invalidatesTags: (result, error, { id }: Pick<PresignRequest, "id">) => [
        { type: "PresignRequest", id },
        { type: "PresignRequest", id: "LIST" },
      ],
    }),

    // 6) Delete
    deletePresignRequest: build.mutation<
      { success: boolean; id: string },
      number
    >({
      query(id) {
        return {
          url: `PresignRequest/${id}`,
          method: "DELETE",
        };
      },
      invalidatesTags: (result, error, id) => [{ type: "PresignRequest", id }],
    }),
  }),
});

// Notice we now also export `useLazyGetPresignRequestsPagedQuery`
export const {
  useGetPresignRequestsPagedQuery, // immediate fetch
  useLazyGetPresignRequestsPagedQuery, // lazy fetch
  useGetPresignRequestQuery,
  useGetPresignRequestsQuery,
  useAddPresignRequestMutation,
  useUpdatePresignRequestMutation,
  useDeletePresignRequestMutation,
} = PresignRequestService;
