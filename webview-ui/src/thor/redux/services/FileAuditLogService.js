import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const FileAuditLogService = createApi({
    reducerPath: 'FileAuditLog', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['FileAuditLog'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getFileAuditLogsPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `FileAuditLog?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'FileAuditLog', id })),
                    { type: 'FileAuditLog', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getFileAuditLogs: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `FileAuditLog?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `FileAuditLog`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'FileAuditLog', id })),
                    { type: 'FileAuditLog', id: 'LIST' },
                ]
                : [{ type: 'FileAuditLog', id: 'LIST' }],
        }),
        // 3) Create
        addFileAuditLog: build.mutation({
            query: (body) => ({
                url: `FileAuditLog`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'FileAuditLog', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getFileAuditLog: build.query({
            query: (id) => `FileAuditLog/${id}`,
            providesTags: (result, error, id) => [{ type: 'FileAuditLog', id }],
        }),
        // 5) Update
        updateFileAuditLog: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `FileAuditLog/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(FileAuditLogService.util.updateQueryData('getFileAuditLog', id, (draft) => {
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
                { type: 'FileAuditLog', id },
                { type: 'FileAuditLog', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteFileAuditLog: build.mutation({
            query(id) {
                return {
                    url: `FileAuditLog/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'FileAuditLog', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetFileAuditLogsPagedQuery`
export const { useGetFileAuditLogsPagedQuery, // immediate fetch
useLazyGetFileAuditLogsPagedQuery, // lazy fetch
useGetFileAuditLogQuery, useGetFileAuditLogsQuery, useAddFileAuditLogMutation, useUpdateFileAuditLogMutation, useDeleteFileAuditLogMutation, } = FileAuditLogService;
//# sourceMappingURL=FileAuditLogService.js.map