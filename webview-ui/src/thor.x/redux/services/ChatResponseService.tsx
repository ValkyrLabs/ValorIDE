import { createApi } from '@reduxjs/toolkit/query/react'
import { ChatResponse } from '@thor/model/ChatResponse'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type ChatResponseResponse = ChatResponse[]

export const ChatResponseService = createApi({
  reducerPath: 'ChatResponse', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['ChatResponse'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getChatResponsesPaged: build.query<ChatResponseResponse, { page: number; size?: number; example?: Partial<ChatResponse> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `ChatResponse?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'ChatResponse' as const, id })),
              { type: 'ChatResponse', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getChatResponses: build.query<ChatResponseResponse, { example?: Partial<ChatResponse> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `ChatResponse?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `ChatResponse`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'ChatResponse' as const, id })),
              { type: 'ChatResponse', id: 'LIST' },
            ]
          : [{ type: 'ChatResponse', id: 'LIST' }],
    }),

    // 3) Create
    addChatResponse: build.mutation<ChatResponse, Partial<ChatResponse>>({
      query: (body) => ({
        url: `ChatResponse`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'ChatResponse', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getChatResponse: build.query<ChatResponse, string>({
      query: (id) => `ChatResponse/${id}`,
      providesTags: (result, error, id) => [{ type: 'ChatResponse', id }],
    }),

    // 5) Update
    updateChatResponse: build.mutation<void, Pick<ChatResponse, 'id'> & Partial<ChatResponse>>({
      query: ({ id, ...patch }) => ({
        url: `ChatResponse/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            ChatResponseService.util.updateQueryData('getChatResponse', id, (draft) => {
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
        { type: 'ChatResponse', id },
        { type: 'ChatResponse', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteChatResponse: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `ChatResponse/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'ChatResponse', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetChatResponsesPagedQuery`
export const {
  useGetChatResponsesPagedQuery,     // immediate fetch
  useLazyGetChatResponsesPagedQuery, // lazy fetch
  useGetChatResponseQuery,
  useGetChatResponsesQuery,
  useAddChatResponseMutation,
  useUpdateChatResponseMutation,
  useDeleteChatResponseMutation,
} = ChatResponseService
