import { createApi } from "@reduxjs/toolkit/query/react";
import { AgentChatMessageResponse } from "@thor/model/AgentChatMessageResponse";
import customBaseQuery from "../customBaseQuery"; // Import the custom base query

type AgentChatMessageResponseResponse = AgentChatMessageResponse[];

export const AgentChatMessageResponseService = createApi({
  reducerPath: "AgentChatMessageResponse", // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ["AgentChatMessageResponse"],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getAgentChatMessageResponsesPaged: build.query<
      AgentChatMessageResponseResponse,
      {
        page: number;
        size?: number;
        example?: Partial<AgentChatMessageResponse>;
      }
    >({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example)
          q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `AgentChatMessageResponse?${q.join("&")}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "AgentChatMessageResponse" as const,
                id,
              })),
              { type: "AgentChatMessageResponse", id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getAgentChatMessageResponses: build.query<
      AgentChatMessageResponseResponse,
      { example?: Partial<AgentChatMessageResponse> } | void
    >({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `AgentChatMessageResponse?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `AgentChatMessageResponse`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "AgentChatMessageResponse" as const,
                id,
              })),
              { type: "AgentChatMessageResponse", id: "LIST" },
            ]
          : [{ type: "AgentChatMessageResponse", id: "LIST" }],
    }),

    // 3) Create
    addAgentChatMessageResponse: build.mutation<
      AgentChatMessageResponse,
      Partial<AgentChatMessageResponse>
    >({
      query: (body) => ({
        url: `AgentChatMessageResponse`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "AgentChatMessageResponse", id: "LIST" }],
    }),

    // 4) Get single by ID
    getAgentChatMessageResponse: build.query<AgentChatMessageResponse, string>({
      query: (id) => `AgentChatMessageResponse/${id}`,
      providesTags: (result, error, id) => [
        { type: "AgentChatMessageResponse", id },
      ],
    }),

    // 5) Update
    updateAgentChatMessageResponse: build.mutation<
      void,
      Pick<AgentChatMessageResponse, "id"> & Partial<AgentChatMessageResponse>
    >({
      query: ({ id, ...patch }) => ({
        url: `AgentChatMessageResponse/${id}`,
        method: "PUT",
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            AgentChatMessageResponseService.util.updateQueryData(
              "getAgentChatMessageResponse",
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
        { id }: Pick<AgentChatMessageResponse, "id">,
      ) => [
        { type: "AgentChatMessageResponse", id },
        { type: "AgentChatMessageResponse", id: "LIST" },
      ],
    }),

    // 6) Delete
    deleteAgentChatMessageResponse: build.mutation<
      { success: boolean; id: string },
      number
    >({
      query(id) {
        return {
          url: `AgentChatMessageResponse/${id}`,
          method: "DELETE",
        };
      },
      invalidatesTags: (result, error, id) => [
        { type: "AgentChatMessageResponse", id },
      ],
    }),
  }),
});

// Notice we now also export `useLazyGetAgentChatMessageResponsesPagedQuery`
export const {
  useGetAgentChatMessageResponsesPagedQuery, // immediate fetch
  useLazyGetAgentChatMessageResponsesPagedQuery, // lazy fetch
  useGetAgentChatMessageResponseQuery,
  useGetAgentChatMessageResponsesQuery,
  useAddAgentChatMessageResponseMutation,
  useUpdateAgentChatMessageResponseMutation,
  useDeleteAgentChatMessageResponseMutation,
} = AgentChatMessageResponseService;
