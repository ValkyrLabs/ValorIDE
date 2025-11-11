import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const DownloadAccessService = createApi({
    reducerPath: 'DownloadAccess', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['DownloadAccess'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getDownloadAccesssPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `DownloadAccess?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'DownloadAccess', id })),
                    { type: 'DownloadAccess', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getDownloadAccesss: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `DownloadAccess?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `DownloadAccess`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'DownloadAccess', id })),
                    { type: 'DownloadAccess', id: 'LIST' },
                ]
                : [{ type: 'DownloadAccess', id: 'LIST' }],
        }),
        // 3) Create
        addDownloadAccess: build.mutation({
            query: (body) => ({
                url: `DownloadAccess`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'DownloadAccess', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getDownloadAccess: build.query({
            query: (id) => `DownloadAccess/${id}`,
            providesTags: (result, error, id) => [{ type: 'DownloadAccess', id }],
        }),
        // 5) Update
        updateDownloadAccess: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `DownloadAccess/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(DownloadAccessService.util.updateQueryData('getDownloadAccess', id, (draft) => {
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
                { type: 'DownloadAccess', id },
                { type: 'DownloadAccess', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteDownloadAccess: build.mutation({
            query(id) {
                return {
                    url: `DownloadAccess/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'DownloadAccess', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetDownloadAccesssPagedQuery`
export const { useGetDownloadAccesssPagedQuery, // immediate fetch
useLazyGetDownloadAccesssPagedQuery, // lazy fetch
useGetDownloadAccessQuery, useGetDownloadAccesssQuery, useAddDownloadAccessMutation, useUpdateDownloadAccessMutation, useDeleteDownloadAccessMutation, } = DownloadAccessService;
//# sourceMappingURL=DownloadAccessService.js.map