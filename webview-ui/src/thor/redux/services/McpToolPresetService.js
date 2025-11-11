import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const McpToolPresetService = createApi({
    reducerPath: 'McpToolPreset', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['McpToolPreset'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getMcpToolPresetsPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `McpToolPreset?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'McpToolPreset', id })),
                    { type: 'McpToolPreset', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getMcpToolPresets: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `McpToolPreset?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `McpToolPreset`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'McpToolPreset', id })),
                    { type: 'McpToolPreset', id: 'LIST' },
                ]
                : [{ type: 'McpToolPreset', id: 'LIST' }],
        }),
        // 3) Create
        addMcpToolPreset: build.mutation({
            query: (body) => ({
                url: `McpToolPreset`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'McpToolPreset', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getMcpToolPreset: build.query({
            query: (id) => `McpToolPreset/${id}`,
            providesTags: (result, error, id) => [{ type: 'McpToolPreset', id }],
        }),
        // 5) Update
        updateMcpToolPreset: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `McpToolPreset/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(McpToolPresetService.util.updateQueryData('getMcpToolPreset', id, (draft) => {
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
                { type: 'McpToolPreset', id },
                { type: 'McpToolPreset', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteMcpToolPreset: build.mutation({
            query(id) {
                return {
                    url: `McpToolPreset/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'McpToolPreset', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetMcpToolPresetsPagedQuery`
export const { useGetMcpToolPresetsPagedQuery, // immediate fetch
useLazyGetMcpToolPresetsPagedQuery, // lazy fetch
useGetMcpToolPresetQuery, useGetMcpToolPresetsQuery, useAddMcpToolPresetMutation, useUpdateMcpToolPresetMutation, useDeleteMcpToolPresetMutation, } = McpToolPresetService;
//# sourceMappingURL=McpToolPresetService.js.map