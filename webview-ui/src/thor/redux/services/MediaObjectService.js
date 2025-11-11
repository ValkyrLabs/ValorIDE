import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const MediaObjectService = createApi({
    reducerPath: 'MediaObject', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['MediaObject'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getMediaObjectsPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `MediaObject?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'MediaObject', id })),
                    { type: 'MediaObject', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getMediaObjects: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `MediaObject?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `MediaObject`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'MediaObject', id })),
                    { type: 'MediaObject', id: 'LIST' },
                ]
                : [{ type: 'MediaObject', id: 'LIST' }],
        }),
        // 3) Create
        addMediaObject: build.mutation({
            query: (body) => ({
                url: `MediaObject`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'MediaObject', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getMediaObject: build.query({
            query: (id) => `MediaObject/${id}`,
            providesTags: (result, error, id) => [{ type: 'MediaObject', id }],
        }),
        // 5) Update
        updateMediaObject: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `MediaObject/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(MediaObjectService.util.updateQueryData('getMediaObject', id, (draft) => {
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
                { type: 'MediaObject', id },
                { type: 'MediaObject', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteMediaObject: build.mutation({
            query(id) {
                return {
                    url: `MediaObject/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'MediaObject', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetMediaObjectsPagedQuery`
export const { useGetMediaObjectsPagedQuery, // immediate fetch
useLazyGetMediaObjectsPagedQuery, // lazy fetch
useGetMediaObjectQuery, useGetMediaObjectsQuery, useAddMediaObjectMutation, useUpdateMediaObjectMutation, useDeleteMediaObjectMutation, } = MediaObjectService;
//# sourceMappingURL=MediaObjectService.js.map