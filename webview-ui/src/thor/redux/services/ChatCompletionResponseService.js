import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const ChatCompletionResponseService = createApi({
    reducerPath: 'ChatCompletionResponse', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['ChatCompletionResponse'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getChatCompletionResponsesPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `ChatCompletionResponse?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'ChatCompletionResponse', id })),
                    { type: 'ChatCompletionResponse', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getChatCompletionResponses: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `ChatCompletionResponse?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `ChatCompletionResponse`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'ChatCompletionResponse', id })),
                    { type: 'ChatCompletionResponse', id: 'LIST' },
                ]
                : [{ type: 'ChatCompletionResponse', id: 'LIST' }],
        }),
        // 3) Create
        addChatCompletionResponse: build.mutation({
            query: (body) => ({
                url: `ChatCompletionResponse`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'ChatCompletionResponse', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getChatCompletionResponse: build.query({
            query: (id) => `ChatCompletionResponse/${id}`,
            providesTags: (result, error, id) => [{ type: 'ChatCompletionResponse', id }],
        }),
        // 5) Update
        updateChatCompletionResponse: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `ChatCompletionResponse/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(ChatCompletionResponseService.util.updateQueryData('getChatCompletionResponse', id, (draft) => {
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
                { type: 'ChatCompletionResponse', id },
                { type: 'ChatCompletionResponse', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteChatCompletionResponse: build.mutation({
            query(id) {
                return {
                    url: `ChatCompletionResponse/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'ChatCompletionResponse', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetChatCompletionResponsesPagedQuery`
export const { useGetChatCompletionResponsesPagedQuery, // immediate fetch
useLazyGetChatCompletionResponsesPagedQuery, // lazy fetch
useGetChatCompletionResponseQuery, useGetChatCompletionResponsesQuery, useAddChatCompletionResponseMutation, useUpdateChatCompletionResponseMutation, useDeleteChatCompletionResponseMutation, } = ChatCompletionResponseService;
//# sourceMappingURL=ChatCompletionResponseService.js.map