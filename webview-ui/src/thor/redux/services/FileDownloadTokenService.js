import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const FileDownloadTokenService = createApi({
    reducerPath: 'FileDownloadToken', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['FileDownloadToken'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getFileDownloadTokensPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `FileDownloadToken?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'FileDownloadToken', id })),
                    { type: 'FileDownloadToken', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getFileDownloadTokens: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `FileDownloadToken?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `FileDownloadToken`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'FileDownloadToken', id })),
                    { type: 'FileDownloadToken', id: 'LIST' },
                ]
                : [{ type: 'FileDownloadToken', id: 'LIST' }],
        }),
        // 3) Create
        addFileDownloadToken: build.mutation({
            query: (body) => ({
                url: `FileDownloadToken`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'FileDownloadToken', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getFileDownloadToken: build.query({
            query: (id) => `FileDownloadToken/${id}`,
            providesTags: (result, error, id) => [{ type: 'FileDownloadToken', id }],
        }),
        // 5) Update
        updateFileDownloadToken: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `FileDownloadToken/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(FileDownloadTokenService.util.updateQueryData('getFileDownloadToken', id, (draft) => {
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
                { type: 'FileDownloadToken', id },
                { type: 'FileDownloadToken', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteFileDownloadToken: build.mutation({
            query(id) {
                return {
                    url: `FileDownloadToken/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'FileDownloadToken', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetFileDownloadTokensPagedQuery`
export const { useGetFileDownloadTokensPagedQuery, // immediate fetch
useLazyGetFileDownloadTokensPagedQuery, // lazy fetch
useGetFileDownloadTokenQuery, useGetFileDownloadTokensQuery, useAddFileDownloadTokenMutation, useUpdateFileDownloadTokenMutation, useDeleteFileDownloadTokenMutation, } = FileDownloadTokenService;
//# sourceMappingURL=FileDownloadTokenService.js.map