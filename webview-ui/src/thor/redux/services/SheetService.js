import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const SheetService = createApi({
    reducerPath: 'Sheet', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['Sheet'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getSheetsPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `Sheet?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'Sheet', id })),
                    { type: 'Sheet', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getSheets: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `Sheet?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `Sheet`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'Sheet', id })),
                    { type: 'Sheet', id: 'LIST' },
                ]
                : [{ type: 'Sheet', id: 'LIST' }],
        }),
        // 3) Create
        addSheet: build.mutation({
            query: (body) => ({
                url: `Sheet`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'Sheet', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getSheet: build.query({
            query: (id) => `Sheet/${id}`,
            providesTags: (result, error, id) => [{ type: 'Sheet', id }],
        }),
        // 5) Update
        updateSheet: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `Sheet/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(SheetService.util.updateQueryData('getSheet', id, (draft) => {
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
                { type: 'Sheet', id },
                { type: 'Sheet', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteSheet: build.mutation({
            query(id) {
                return {
                    url: `Sheet/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'Sheet', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetSheetsPagedQuery`
export const { useGetSheetsPagedQuery, // immediate fetch
useLazyGetSheetsPagedQuery, // lazy fetch
useGetSheetQuery, useGetSheetsQuery, useAddSheetMutation, useUpdateSheetMutation, useDeleteSheetMutation, } = SheetService;
//# sourceMappingURL=SheetService.js.map