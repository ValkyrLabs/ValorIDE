import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const SheetColumnService = createApi({
    reducerPath: 'SheetColumn', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['SheetColumn'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getSheetColumnsPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `SheetColumn?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'SheetColumn', id })),
                    { type: 'SheetColumn', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getSheetColumns: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `SheetColumn?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `SheetColumn`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'SheetColumn', id })),
                    { type: 'SheetColumn', id: 'LIST' },
                ]
                : [{ type: 'SheetColumn', id: 'LIST' }],
        }),
        // 3) Create
        addSheetColumn: build.mutation({
            query: (body) => ({
                url: `SheetColumn`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'SheetColumn', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getSheetColumn: build.query({
            query: (id) => `SheetColumn/${id}`,
            providesTags: (result, error, id) => [{ type: 'SheetColumn', id }],
        }),
        // 5) Update
        updateSheetColumn: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `SheetColumn/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(SheetColumnService.util.updateQueryData('getSheetColumn', id, (draft) => {
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
                { type: 'SheetColumn', id },
                { type: 'SheetColumn', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteSheetColumn: build.mutation({
            query(id) {
                return {
                    url: `SheetColumn/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'SheetColumn', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetSheetColumnsPagedQuery`
export const { useGetSheetColumnsPagedQuery, // immediate fetch
useLazyGetSheetColumnsPagedQuery, // lazy fetch
useGetSheetColumnQuery, useGetSheetColumnsQuery, useAddSheetColumnMutation, useUpdateSheetColumnMutation, useDeleteSheetColumnMutation, } = SheetColumnService;
//# sourceMappingURL=SheetColumnService.js.map