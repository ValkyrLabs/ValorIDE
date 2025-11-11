import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const WebsocketSessionService = createApi({
    reducerPath: 'WebsocketSession', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['WebsocketSession'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getWebsocketSessionsPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `WebsocketSession?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'WebsocketSession', id })),
                    { type: 'WebsocketSession', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getWebsocketSessions: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `WebsocketSession?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `WebsocketSession`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'WebsocketSession', id })),
                    { type: 'WebsocketSession', id: 'LIST' },
                ]
                : [{ type: 'WebsocketSession', id: 'LIST' }],
        }),
        // 3) Create
        addWebsocketSession: build.mutation({
            query: (body) => ({
                url: `WebsocketSession`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'WebsocketSession', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getWebsocketSession: build.query({
            query: (id) => `WebsocketSession/${id}`,
            providesTags: (result, error, id) => [{ type: 'WebsocketSession', id }],
        }),
        // 5) Update
        updateWebsocketSession: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `WebsocketSession/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(WebsocketSessionService.util.updateQueryData('getWebsocketSession', id, (draft) => {
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
                { type: 'WebsocketSession', id },
                { type: 'WebsocketSession', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteWebsocketSession: build.mutation({
            query(id) {
                return {
                    url: `WebsocketSession/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'WebsocketSession', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetWebsocketSessionsPagedQuery`
export const { useGetWebsocketSessionsPagedQuery, // immediate fetch
useLazyGetWebsocketSessionsPagedQuery, // lazy fetch
useGetWebsocketSessionQuery, useGetWebsocketSessionsQuery, useAddWebsocketSessionMutation, useUpdateWebsocketSessionMutation, useDeleteWebsocketSessionMutation, } = WebsocketSessionService;
//# sourceMappingURL=WebsocketSessionService.js.map