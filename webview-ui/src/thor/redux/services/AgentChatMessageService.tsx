import { createApi } from "@reduxjs/toolkit/query/react";
import { AgentChatMessage } from "@thor/model/AgentChatMessage";
import customBaseQuery from "../customBaseQuery"; // Import the custom base query

type AgentChatMessageResponse = AgentChatMessage[];

export const AgentChatMessageService = createApi({
  reducerPath: "AgentChatMessage", // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ["AgentChatMessage"],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getAgentChatMessagesPaged: build.query<
      AgentChatMessageResponse,
      { page: number; size?: number; example?: Partial<AgentChatMessage> }
    >({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example)
          q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `AgentChatMessage?${q.join("&")}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "AgentChatMessage" as const,
                id,
              })),
              { type: "AgentChatMessage", id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getAgentChatMessages: build.query<
      AgentChatMessageResponse,
      { example?: Partial<AgentChatMessage> } | void
    >({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `AgentChatMessage?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `AgentChatMessage`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "AgentChatMessage" as const,
                id,
              })),
              { type: "AgentChatMessage", id: "LIST" },
            ]
          : [{ type: "AgentChatMessage", id: "LIST" }],
    }),

    // 3) Create
    addAgentChatMessage: build.mutation<
      AgentChatMessage,
      Partial<AgentChatMessage>
    >({
      query: (body) => ({
        url: `AgentChatMessage`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "AgentChatMessage", id: "LIST" }],
    }),

    // 4) Get single by ID
    getAgentChatMessage: build.query<AgentChatMessage, string>({
      query: (id) => `AgentChatMessage/${id}`,
      providesTags: (result, error, id) => [{ type: "AgentChatMessage", id }],
    }),

    // 5) Update
    updateAgentChatMessage: build.mutation<
      void,
      Pick<AgentChatMessage, "id"> & Partial<AgentChatMessage>
    >({
      query: ({ id, ...patch }) => ({
        url: `AgentChatMessage/${id}`,
        method: "PUT",
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            AgentChatMessageService.util.updateQueryData(
              "getAgentChatMessage",
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
        { id }: Pick<AgentChatMessage, "id">,
      ) => [
        { type: "AgentChatMessage", id },
        { type: "AgentChatMessage", id: "LIST" },
      ],
    }),

    // 6) Delete
    deleteAgentChatMessage: build.mutation<
      { success: boolean; id: string },
      number
    >({
      query(id) {
        return {
          url: `AgentChatMessage/${id}`,
          method: "DELETE",
        };
      },
      invalidatesTags: (result, error, id) => [
        { type: "AgentChatMessage", id },
      ],
    }),
  }),
});

// Notice we now also export `useLazyGetAgentChatMessagesPagedQuery`
export const {
  useGetAgentChatMessagesPagedQuery, // immediate fetch
  useLazyGetAgentChatMessagesPagedQuery, // lazy fetch
  useGetAgentChatMessageQuery,
  useGetAgentChatMessagesQuery,
  useAddAgentChatMessageMutation,
  useUpdateAgentChatMessageMutation,
  useDeleteAgentChatMessageMutation,
} = AgentChatMessageService;
