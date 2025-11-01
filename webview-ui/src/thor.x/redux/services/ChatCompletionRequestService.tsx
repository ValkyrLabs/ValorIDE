import { createApi } from '@reduxjs/toolkit/query/react'
import { ChatCompletionRequest } from '@thor/model/ChatCompletionRequest'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type ChatCompletionRequestResponse = ChatCompletionRequest[]

export const ChatCompletionRequestService = createApi({
  reducerPath: 'ChatCompletionRequest', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['ChatCompletionRequest'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getChatCompletionRequestsPaged: build.query<ChatCompletionRequestResponse, { page: number; size?: number; example?: Partial<ChatCompletionRequest> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `ChatCompletionRequest?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'ChatCompletionRequest' as const, id })),
              { type: 'ChatCompletionRequest', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getChatCompletionRequests: build.query<ChatCompletionRequestResponse, { example?: Partial<ChatCompletionRequest> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `ChatCompletionRequest?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `ChatCompletionRequest`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'ChatCompletionRequest' as const, id })),
              { type: 'ChatCompletionRequest', id: 'LIST' },
            ]
          : [{ type: 'ChatCompletionRequest', id: 'LIST' }],
    }),

    // 3) Create
    addChatCompletionRequest: build.mutation<ChatCompletionRequest, Partial<ChatCompletionRequest>>({
      query: (body) => ({
        url: `ChatCompletionRequest`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'ChatCompletionRequest', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getChatCompletionRequest: build.query<ChatCompletionRequest, string>({
      query: (id) => `ChatCompletionRequest/${id}`,
      providesTags: (result, error, id) => [{ type: 'ChatCompletionRequest', id }],
    }),

    // 5) Update
    updateChatCompletionRequest: build.mutation<void, Pick<ChatCompletionRequest, 'id'> & Partial<ChatCompletionRequest>>({
      query: ({ id, ...patch }) => ({
        url: `ChatCompletionRequest/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            ChatCompletionRequestService.util.updateQueryData('getChatCompletionRequest', id, (draft) => {
              Object.assign(draft, patch)
            })
          )
          try {
            await queryFulfilled
          } catch {
            patchResult.undo()
          }
        }
      },
      invalidatesTags: (result, error, { id }) => [
        { type: 'ChatCompletionRequest', id },
        { type: 'ChatCompletionRequest', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteChatCompletionRequest: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `ChatCompletionRequest/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'ChatCompletionRequest', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetChatCompletionRequestsPagedQuery`
export const {
  useGetChatCompletionRequestsPagedQuery,     // immediate fetch
  useLazyGetChatCompletionRequestsPagedQuery, // lazy fetch
  useGetChatCompletionRequestQuery,
  useGetChatCompletionRequestsQuery,
  useAddChatCompletionRequestMutation,
  useUpdateChatCompletionRequestMutation,
  useDeleteChatCompletionRequestMutation,
} = ChatCompletionRequestService
