import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const ChatCompletionRequestService = createApi({
    reducerPath: 'ChatCompletionRequest', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['ChatCompletionRequest'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getChatCompletionRequestsPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `ChatCompletionRequest?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'ChatCompletionRequest', id })),
                    { type: 'ChatCompletionRequest', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getChatCompletionRequests: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `ChatCompletionRequest?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `ChatCompletionRequest`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'ChatCompletionRequest', id })),
                    { type: 'ChatCompletionRequest', id: 'LIST' },
                ]
                : [{ type: 'ChatCompletionRequest', id: 'LIST' }],
        }),
        // 3) Create
        addChatCompletionRequest: build.mutation({
            query: (body) => ({
                url: `ChatCompletionRequest`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'ChatCompletionRequest', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getChatCompletionRequest: build.query({
            query: (id) => `ChatCompletionRequest/${id}`,
            providesTags: (result, error, id) => [{ type: 'ChatCompletionRequest', id }],
        }),
        // 5) Update
        updateChatCompletionRequest: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `ChatCompletionRequest/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(ChatCompletionRequestService.util.updateQueryData('getChatCompletionRequest', id, (draft) => {
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
                { type: 'ChatCompletionRequest', id },
                { type: 'ChatCompletionRequest', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteChatCompletionRequest: build.mutation({
            query(id) {
                return {
                    url: `ChatCompletionRequest/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'ChatCompletionRequest', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetChatCompletionRequestsPagedQuery`
export const { useGetChatCompletionRequestsPagedQuery, // immediate fetch
useLazyGetChatCompletionRequestsPagedQuery, // lazy fetch
useGetChatCompletionRequestQuery, useGetChatCompletionRequestsQuery, useAddChatCompletionRequestMutation, useUpdateChatCompletionRequestMutation, useDeleteChatCompletionRequestMutation, } = ChatCompletionRequestService;
//# sourceMappingURL=ChatCompletionRequestService.js.map