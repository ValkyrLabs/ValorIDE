import { createApi } from "@reduxjs/toolkit/query/react";
import { PublishWorkflowRequest } from "@thor/model/PublishWorkflowRequest";
import customBaseQuery from "../customBaseQuery"; // Import the custom base query

type PublishWorkflowRequestResponse = PublishWorkflowRequest[];

export const PublishWorkflowRequestService = createApi({
  reducerPath: "PublishWorkflowRequest", // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ["PublishWorkflowRequest"],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getPublishWorkflowRequestsPaged: build.query<
      PublishWorkflowRequestResponse,
      { page: number; size?: number; example?: Partial<PublishWorkflowRequest> }
    >({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example)
          q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `PublishWorkflowRequest?${q.join("&")}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "PublishWorkflowRequest" as const,
                id,
              })),
              { type: "PublishWorkflowRequest", id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getPublishWorkflowRequests: build.query<
      PublishWorkflowRequestResponse,
      { example?: Partial<PublishWorkflowRequest> } | void
    >({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `PublishWorkflowRequest?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `PublishWorkflowRequest`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "PublishWorkflowRequest" as const,
                id,
              })),
              { type: "PublishWorkflowRequest", id: "LIST" },
            ]
          : [{ type: "PublishWorkflowRequest", id: "LIST" }],
    }),

    // 3) Create
    addPublishWorkflowRequest: build.mutation<
      PublishWorkflowRequest,
      Partial<PublishWorkflowRequest>
    >({
      query: (body) => ({
        url: `PublishWorkflowRequest`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "PublishWorkflowRequest", id: "LIST" }],
    }),

    // 4) Get single by ID
    getPublishWorkflowRequest: build.query<PublishWorkflowRequest, string>({
      query: (id) => `PublishWorkflowRequest/${id}`,
      providesTags: (result, error, id) => [
        { type: "PublishWorkflowRequest", id },
      ],
    }),

    // 5) Update
    updatePublishWorkflowRequest: build.mutation<
      void,
      Pick<PublishWorkflowRequest, "id"> & Partial<PublishWorkflowRequest>
    >({
      query: ({ id, ...patch }) => ({
        url: `PublishWorkflowRequest/${id}`,
        method: "PUT",
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            PublishWorkflowRequestService.util.updateQueryData(
              "getPublishWorkflowRequest",
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
        { id }: Pick<PublishWorkflowRequest, "id">,
      ) => [
        { type: "PublishWorkflowRequest", id },
        { type: "PublishWorkflowRequest", id: "LIST" },
      ],
    }),

    // 6) Delete
    deletePublishWorkflowRequest: build.mutation<
      { success: boolean; id: string },
      number
    >({
      query(id) {
        return {
          url: `PublishWorkflowRequest/${id}`,
          method: "DELETE",
        };
      },
      invalidatesTags: (result, error, id) => [
        { type: "PublishWorkflowRequest", id },
      ],
    }),
  }),
});

// Notice we now also export `useLazyGetPublishWorkflowRequestsPagedQuery`
export const {
  useGetPublishWorkflowRequestsPagedQuery, // immediate fetch
  useLazyGetPublishWorkflowRequestsPagedQuery, // lazy fetch
  useGetPublishWorkflowRequestQuery,
  useGetPublishWorkflowRequestsQuery,
  useAddPublishWorkflowRequestMutation,
  useUpdatePublishWorkflowRequestMutation,
  useDeletePublishWorkflowRequestMutation,
} = PublishWorkflowRequestService;
