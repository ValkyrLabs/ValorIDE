import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const SheetRowService = createApi({
    reducerPath: 'SheetRow', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['SheetRow'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getSheetRowsPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `SheetRow?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'SheetRow', id })),
                    { type: 'SheetRow', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getSheetRows: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `SheetRow?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `SheetRow`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'SheetRow', id })),
                    { type: 'SheetRow', id: 'LIST' },
                ]
                : [{ type: 'SheetRow', id: 'LIST' }],
        }),
        // 3) Create
        addSheetRow: build.mutation({
            query: (body) => ({
                url: `SheetRow`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'SheetRow', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getSheetRow: build.query({
            query: (id) => `SheetRow/${id}`,
            providesTags: (result, error, id) => [{ type: 'SheetRow', id }],
        }),
        // 5) Update
        updateSheetRow: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `SheetRow/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(SheetRowService.util.updateQueryData('getSheetRow', id, (draft) => {
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
                { type: 'SheetRow', id },
                { type: 'SheetRow', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteSheetRow: build.mutation({
            query(id) {
                return {
                    url: `SheetRow/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'SheetRow', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetSheetRowsPagedQuery`
export const { useGetSheetRowsPagedQuery, // immediate fetch
useLazyGetSheetRowsPagedQuery, // lazy fetch
useGetSheetRowQuery, useGetSheetRowsQuery, useAddSheetRowMutation, useUpdateSheetRowMutation, useDeleteSheetRowMutation, } = SheetRowService;
//# sourceMappingURL=SheetRowService.js.map