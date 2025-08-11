import { createApi } from "@reduxjs/toolkit/query/react";
import { ChatCompletionResponse } from "../../model";
import customBaseQuery from "../customBaseQuery"; // Import the custom base query

type ChatCompletionResponseResponse = ChatCompletionResponse[];

export const ChatCompletionResponseService = createApi({
  reducerPath: "ChatCompletionResponse", // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ["ChatCompletionResponse"],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    getChatCompletionResponsesPaged: build.query<
      ChatCompletionResponseResponse,
      { page: number; limit?: number }
    >({
      query: ({ page, limit = 20 }) =>
        `ChatCompletionResponse?page=${page}&limit=${limit}`,
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "ChatCompletionResponse" as const,
                id,
              })),
              { type: "ChatCompletionResponse", id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getChatCompletionResponses: build.query<
      ChatCompletionResponseResponse,
      void
    >({
      query: () => `ChatCompletionResponse`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "ChatCompletionResponse" as const,
                id,
              })),
              { type: "ChatCompletionResponse", id: "LIST" },
            ]
          : [{ type: "ChatCompletionResponse", id: "LIST" }],
    }),

    // 3) Create
    addChatCompletionResponse: build.mutation<
      ChatCompletionResponse,
      Partial<ChatCompletionResponse>
    >({
      query: (body) => ({
        url: `ChatCompletionResponse`,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "ChatCompletionResponse", id: "LIST" }],
    }),

    // 4) Get single by ID
    getChatCompletionResponse: build.query<ChatCompletionResponse, string>({
      query: (id) => `ChatCompletionResponse/${id}`,
      providesTags: (result, error, id) => [
        { type: "ChatCompletionResponse", id },
      ],
    }),

    // 5) Update
    updateChatCompletionResponse: build.mutation<
      void,
      Pick<ChatCompletionResponse, "id"> & Partial<ChatCompletionResponse>
    >({
      query: ({ id, ...patch }) => ({
        url: `ChatCompletionResponse/${id}`,
        method: "PUT",
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            ChatCompletionResponseService.util.updateQueryData(
              "getChatCompletionResponse",
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
        { type: "ChatCompletionResponse", id },
      ],
    }),

    // 6) Delete
    deleteChatCompletionResponse: build.mutation<
      { success: boolean; id: string },
      number
    >({
      query(id) {
        return {
          url: `ChatCompletionResponse/${id}`,
          method: "DELETE",
        };
      },
      invalidatesTags: (result, error, id) => [
        { type: "ChatCompletionResponse", id },
      ],
    }),
  }),
});

// Notice we now also export `useLazyGetChatCompletionResponsesPagedQuery`
export const {
  useGetChatCompletionResponsesPagedQuery, // immediate fetch
  useLazyGetChatCompletionResponsesPagedQuery, // lazy fetch
  useGetChatCompletionResponseQuery,
  useGetChatCompletionResponsesQuery,
  useAddChatCompletionResponseMutation,
  useUpdateChatCompletionResponseMutation,
  useDeleteChatCompletionResponseMutation,
} = ChatCompletionResponseService;
