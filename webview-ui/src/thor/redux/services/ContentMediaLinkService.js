import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const ContentMediaLinkService = createApi({
    reducerPath: 'ContentMediaLink', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['ContentMediaLink'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getContentMediaLinksPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `ContentMediaLink?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'ContentMediaLink', id })),
                    { type: 'ContentMediaLink', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getContentMediaLinks: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `ContentMediaLink?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `ContentMediaLink`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'ContentMediaLink', id })),
                    { type: 'ContentMediaLink', id: 'LIST' },
                ]
                : [{ type: 'ContentMediaLink', id: 'LIST' }],
        }),
        // 3) Create
        addContentMediaLink: build.mutation({
            query: (body) => ({
                url: `ContentMediaLink`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'ContentMediaLink', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getContentMediaLink: build.query({
            query: (id) => `ContentMediaLink/${id}`,
            providesTags: (result, error, id) => [{ type: 'ContentMediaLink', id }],
        }),
        // 5) Update
        updateContentMediaLink: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `ContentMediaLink/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(ContentMediaLinkService.util.updateQueryData('getContentMediaLink', id, (draft) => {
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
                { type: 'ContentMediaLink', id },
                { type: 'ContentMediaLink', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteContentMediaLink: build.mutation({
            query(id) {
                return {
                    url: `ContentMediaLink/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'ContentMediaLink', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetContentMediaLinksPagedQuery`
export const { useGetContentMediaLinksPagedQuery, // immediate fetch
useLazyGetContentMediaLinksPagedQuery, // lazy fetch
useGetContentMediaLinkQuery, useGetContentMediaLinksQuery, useAddContentMediaLinkMutation, useUpdateContentMediaLinkMutation, useDeleteContentMediaLinkMutation, } = ContentMediaLinkService;
//# sourceMappingURL=ContentMediaLinkService.js.map