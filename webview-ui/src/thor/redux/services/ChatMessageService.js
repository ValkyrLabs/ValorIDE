import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const ChatMessageService = createApi({
    reducerPath: 'ChatMessage', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['ChatMessage'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getChatMessagesPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `ChatMessage?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'ChatMessage', id })),
                    { type: 'ChatMessage', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getChatMessages: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `ChatMessage?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `ChatMessage`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'ChatMessage', id })),
                    { type: 'ChatMessage', id: 'LIST' },
                ]
                : [{ type: 'ChatMessage', id: 'LIST' }],
        }),
        // 3) Create
        addChatMessage: build.mutation({
            query: (body) => ({
                url: `ChatMessage`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'ChatMessage', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getChatMessage: build.query({
            query: (id) => `ChatMessage/${id}`,
            providesTags: (result, error, id) => [{ type: 'ChatMessage', id }],
        }),
        // 5) Update
        updateChatMessage: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `ChatMessage/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(ChatMessageService.util.updateQueryData('getChatMessage', id, (draft) => {
                        Object.assign(draft, patch);
                    }));
                    try {
                        await queryFulfilled;
                    }
                    catch {
                        patchResult.undo();
                    }
                }
            },
            invalidatesTags: (result, error, { id }) => [
                { type: 'ChatMessage', id },
                { type: 'ChatMessage', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteChatMessage: build.mutation({
            query(id) {
                return {
                    url: `ChatMessage/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'ChatMessage', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetChatMessagesPagedQuery`
export const { useGetChatMessagesPagedQuery, // immediate fetch
useLazyGetChatMessagesPagedQuery, // lazy fetch
useGetChatMessageQuery, useGetChatMessagesQuery, useAddChatMessageMutation, useUpdateChatMessageMutation, useDeleteChatMessageMutation, } = ChatMessageService;
//# sourceMappingURL=ChatMessageService.js.map