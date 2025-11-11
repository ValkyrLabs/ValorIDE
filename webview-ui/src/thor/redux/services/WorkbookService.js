import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const WorkbookService = createApi({
    reducerPath: 'Workbook', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['Workbook'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getWorkbooksPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `Workbook?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'Workbook', id })),
                    { type: 'Workbook', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getWorkbooks: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `Workbook?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `Workbook`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'Workbook', id })),
                    { type: 'Workbook', id: 'LIST' },
                ]
                : [{ type: 'Workbook', id: 'LIST' }],
        }),
        // 3) Create
        addWorkbook: build.mutation({
            query: (body) => ({
                url: `Workbook`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'Workbook', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getWorkbook: build.query({
            query: (id) => `Workbook/${id}`,
            providesTags: (result, error, id) => [{ type: 'Workbook', id }],
        }),
        // 5) Update
        updateWorkbook: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `Workbook/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(WorkbookService.util.updateQueryData('getWorkbook', id, (draft) => {
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
                { type: 'Workbook', id },
                { type: 'Workbook', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteWorkbook: build.mutation({
            query(id) {
                return {
                    url: `Workbook/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'Workbook', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetWorkbooksPagedQuery`
export const { useGetWorkbooksPagedQuery, // immediate fetch
useLazyGetWorkbooksPagedQuery, // lazy fetch
useGetWorkbookQuery, useGetWorkbooksQuery, useAddWorkbookMutation, useUpdateWorkbookMutation, useDeleteWorkbookMutation, } = WorkbookService;
//# sourceMappingURL=WorkbookService.js.map