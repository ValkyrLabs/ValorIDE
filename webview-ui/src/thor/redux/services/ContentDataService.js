import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const ContentDataService = createApi({
    reducerPath: 'ContentData', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['ContentData'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getContentDatasPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `ContentData?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'ContentData', id })),
                    { type: 'ContentData', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getContentDatas: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `ContentData?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `ContentData`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'ContentData', id })),
                    { type: 'ContentData', id: 'LIST' },
                ]
                : [{ type: 'ContentData', id: 'LIST' }],
        }),
        // 3) Create
        addContentData: build.mutation({
            query: (body) => ({
                url: `ContentData`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'ContentData', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getContentData: build.query({
            query: (id) => `ContentData/${id}`,
            providesTags: (result, error, id) => [{ type: 'ContentData', id }],
        }),
        // 5) Update
        updateContentData: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `ContentData/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(ContentDataService.util.updateQueryData('getContentData', id, (draft) => {
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
                { type: 'ContentData', id },
                { type: 'ContentData', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteContentData: build.mutation({
            query(id) {
                return {
                    url: `ContentData/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'ContentData', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetContentDatasPagedQuery`
export const { useGetContentDatasPagedQuery, // immediate fetch
useLazyGetContentDatasPagedQuery, // lazy fetch
useGetContentDataQuery, useGetContentDatasQuery, useAddContentDataMutation, useUpdateContentDataMutation, useDeleteContentDataMutation, } = ContentDataService;
//# sourceMappingURL=ContentDataService.js.map