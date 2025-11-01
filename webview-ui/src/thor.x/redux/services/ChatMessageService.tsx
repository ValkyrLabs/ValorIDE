import { createApi } from '@reduxjs/toolkit/query/react'
import { ChatMessage } from '@thor/model/ChatMessage'
import customBaseQuery from '../customBaseQuery'; // Import the custom base query

type ChatMessageResponse = ChatMessage[]

export const ChatMessageService = createApi({
  reducerPath: 'ChatMessage', // This should remain unique
  baseQuery: customBaseQuery,
  tagTypes: ['ChatMessage'],
  endpoints: (build) => ({
    // 1) Paged Query Endpoint
    // Standardized pagination: page (0-based), size (page size)
    getChatMessagesPaged: build.query<ChatMessageResponse, { page: number; size?: number; example?: Partial<ChatMessage> }>({
      query: ({ page, size = 20, example }) => {
        const q: string[] = [`page=${page}`, `size=${size}`];
        if (example) q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
        return `ChatMessage?${q.join('&')}`;
      },
      providesTags: (result, error, { page }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'ChatMessage' as const, id })),
              { type: 'ChatMessage', id: `PAGE_${page}` },
            ]
          : [],
    }),

    // 2) Simple "get all" Query (optional)
    getChatMessages: build.query<ChatMessageResponse, { example?: Partial<ChatMessage> } | void>({
      query: (arg) => {
        if (arg && (arg as any).example) {
          const ex = (arg as any).example;
          return `ChatMessage?example=${encodeURIComponent(JSON.stringify(ex))}`;
        }
        return `ChatMessage`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'ChatMessage' as const, id })),
              { type: 'ChatMessage', id: 'LIST' },
            ]
          : [{ type: 'ChatMessage', id: 'LIST' }],
    }),

    // 3) Create
    addChatMessage: build.mutation<ChatMessage, Partial<ChatMessage>>({
      query: (body) => ({
        url: `ChatMessage`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'ChatMessage', id: 'LIST' }],
    }),

    // 4) Get single by ID
    getChatMessage: build.query<ChatMessage, string>({
      query: (id) => `ChatMessage/${id}`,
      providesTags: (result, error, id) => [{ type: 'ChatMessage', id }],
    }),

    // 5) Update
    updateChatMessage: build.mutation<void, Pick<ChatMessage, 'id'> & Partial<ChatMessage>>({
      query: ({ id, ...patch }) => ({
        url: `ChatMessage/${id}`,
        method: 'PUT',
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        if (id) {
          const patchResult = dispatch(
            ChatMessageService.util.updateQueryData('getChatMessage', id, (draft) => {
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
        { type: 'ChatMessage', id },
        { type: 'ChatMessage', id: 'LIST' },
      ],
    }),

    // 6) Delete
    deleteChatMessage: build.mutation<{ success: boolean; id: string }, number>({
      query(id) {
        return {
          url: `ChatMessage/${id}`,
          method: 'DELETE',
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'ChatMessage', id }],
    }),
  }),
})

// Notice we now also export `useLazyGetChatMessagesPagedQuery`
export const {
  useGetChatMessagesPagedQuery,     // immediate fetch
  useLazyGetChatMessagesPagedQuery, // lazy fetch
  useGetChatMessageQuery,
  useGetChatMessagesQuery,
  useAddChatMessageMutation,
  useUpdateChatMessageMutation,
  useDeleteChatMessageMutation,
} = ChatMessageService
