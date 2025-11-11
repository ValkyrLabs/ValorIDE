import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const WebsocketMessageService = createApi({
    reducerPath: 'WebsocketMessage', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['WebsocketMessage'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getWebsocketMessagesPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `WebsocketMessage?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'WebsocketMessage', id })),
                    { type: 'WebsocketMessage', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getWebsocketMessages: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `WebsocketMessage?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `WebsocketMessage`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'WebsocketMessage', id })),
                    { type: 'WebsocketMessage', id: 'LIST' },
                ]
                : [{ type: 'WebsocketMessage', id: 'LIST' }],
        }),
        // 3) Create
        addWebsocketMessage: build.mutation({
            query: (body) => ({
                url: `WebsocketMessage`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'WebsocketMessage', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getWebsocketMessage: build.query({
            query: (id) => `WebsocketMessage/${id}`,
            providesTags: (result, error, id) => [{ type: 'WebsocketMessage', id }],
        }),
        // 5) Update
        updateWebsocketMessage: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `WebsocketMessage/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(WebsocketMessageService.util.updateQueryData('getWebsocketMessage', id, (draft) => {
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
                { type: 'WebsocketMessage', id },
                { type: 'WebsocketMessage', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteWebsocketMessage: build.mutation({
            query(id) {
                return {
                    url: `WebsocketMessage/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'WebsocketMessage', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetWebsocketMessagesPagedQuery`
export const { useGetWebsocketMessagesPagedQuery, // immediate fetch
useLazyGetWebsocketMessagesPagedQuery, // lazy fetch
useGetWebsocketMessageQuery, useGetWebsocketMessagesQuery, useAddWebsocketMessageMutation, useUpdateWebsocketMessageMutation, useDeleteWebsocketMessageMutation, } = WebsocketMessageService;
//# sourceMappingURL=WebsocketMessageService.js.map