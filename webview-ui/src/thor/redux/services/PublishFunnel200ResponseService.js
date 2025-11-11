import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const PublishFunnel200ResponseService = createApi({
    reducerPath: 'PublishFunnel200Response', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['PublishFunnel200Response'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getPublishFunnel200ResponsesPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `PublishFunnel200Response?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'PublishFunnel200Response', id })),
                    { type: 'PublishFunnel200Response', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getPublishFunnel200Responses: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `PublishFunnel200Response?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `PublishFunnel200Response`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'PublishFunnel200Response', id })),
                    { type: 'PublishFunnel200Response', id: 'LIST' },
                ]
                : [{ type: 'PublishFunnel200Response', id: 'LIST' }],
        }),
        // 3) Create
        addPublishFunnel200Response: build.mutation({
            query: (body) => ({
                url: `PublishFunnel200Response`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'PublishFunnel200Response', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getPublishFunnel200Response: build.query({
            query: (id) => `PublishFunnel200Response/${id}`,
            providesTags: (result, error, id) => [{ type: 'PublishFunnel200Response', id }],
        }),
        // 5) Update
        updatePublishFunnel200Response: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `PublishFunnel200Response/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(PublishFunnel200ResponseService.util.updateQueryData('getPublishFunnel200Response', id, (draft) => {
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
                { type: 'PublishFunnel200Response', id },
                { type: 'PublishFunnel200Response', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deletePublishFunnel200Response: build.mutation({
            query(id) {
                return {
                    url: `PublishFunnel200Response/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'PublishFunnel200Response', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetPublishFunnel200ResponsesPagedQuery`
export const { useGetPublishFunnel200ResponsesPagedQuery, // immediate fetch
useLazyGetPublishFunnel200ResponsesPagedQuery, // lazy fetch
useGetPublishFunnel200ResponseQuery, useGetPublishFunnel200ResponsesQuery, useAddPublishFunnel200ResponseMutation, useUpdatePublishFunnel200ResponseMutation, useDeletePublishFunnel200ResponseMutation, } = PublishFunnel200ResponseService;
//# sourceMappingURL=PublishFunnel200ResponseService.js.map