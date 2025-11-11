import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const BackupConfigService = createApi({
    reducerPath: 'BackupConfig', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['BackupConfig'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getBackupConfigsPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `BackupConfig?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'BackupConfig', id })),
                    { type: 'BackupConfig', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getBackupConfigs: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `BackupConfig?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `BackupConfig`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'BackupConfig', id })),
                    { type: 'BackupConfig', id: 'LIST' },
                ]
                : [{ type: 'BackupConfig', id: 'LIST' }],
        }),
        // 3) Create
        addBackupConfig: build.mutation({
            query: (body) => ({
                url: `BackupConfig`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'BackupConfig', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getBackupConfig: build.query({
            query: (id) => `BackupConfig/${id}`,
            providesTags: (result, error, id) => [{ type: 'BackupConfig', id }],
        }),
        // 5) Update
        updateBackupConfig: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `BackupConfig/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(BackupConfigService.util.updateQueryData('getBackupConfig', id, (draft) => {
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
                { type: 'BackupConfig', id },
                { type: 'BackupConfig', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteBackupConfig: build.mutation({
            query(id) {
                return {
                    url: `BackupConfig/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'BackupConfig', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetBackupConfigsPagedQuery`
export const { useGetBackupConfigsPagedQuery, // immediate fetch
useLazyGetBackupConfigsPagedQuery, // lazy fetch
useGetBackupConfigQuery, useGetBackupConfigsQuery, useAddBackupConfigMutation, useUpdateBackupConfigMutation, useDeleteBackupConfigMutation, } = BackupConfigService;
//# sourceMappingURL=BackupConfigService.js.map