import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const PivotTableService = createApi({
    reducerPath: 'PivotTable', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['PivotTable'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getPivotTablesPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `PivotTable?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'PivotTable', id })),
                    { type: 'PivotTable', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getPivotTables: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `PivotTable?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `PivotTable`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'PivotTable', id })),
                    { type: 'PivotTable', id: 'LIST' },
                ]
                : [{ type: 'PivotTable', id: 'LIST' }],
        }),
        // 3) Create
        addPivotTable: build.mutation({
            query: (body) => ({
                url: `PivotTable`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'PivotTable', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getPivotTable: build.query({
            query: (id) => `PivotTable/${id}`,
            providesTags: (result, error, id) => [{ type: 'PivotTable', id }],
        }),
        // 5) Update
        updatePivotTable: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `PivotTable/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(PivotTableService.util.updateQueryData('getPivotTable', id, (draft) => {
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
                { type: 'PivotTable', id },
                { type: 'PivotTable', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deletePivotTable: build.mutation({
            query(id) {
                return {
                    url: `PivotTable/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'PivotTable', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetPivotTablesPagedQuery`
export const { useGetPivotTablesPagedQuery, // immediate fetch
useLazyGetPivotTablesPagedQuery, // lazy fetch
useGetPivotTableQuery, useGetPivotTablesQuery, useAddPivotTableMutation, useUpdatePivotTableMutation, useDeletePivotTableMutation, } = PivotTableService;
//# sourceMappingURL=PivotTableService.js.map