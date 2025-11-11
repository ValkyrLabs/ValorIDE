import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const BorderService = createApi({
    reducerPath: 'Border', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['Border'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getBordersPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `Border?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'Border', id })),
                    { type: 'Border', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getBorders: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `Border?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `Border`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'Border', id })),
                    { type: 'Border', id: 'LIST' },
                ]
                : [{ type: 'Border', id: 'LIST' }],
        }),
        // 3) Create
        addBorder: build.mutation({
            query: (body) => ({
                url: `Border`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'Border', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getBorder: build.query({
            query: (id) => `Border/${id}`,
            providesTags: (result, error, id) => [{ type: 'Border', id }],
        }),
        // 5) Update
        updateBorder: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `Border/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(BorderService.util.updateQueryData('getBorder', id, (draft) => {
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
                { type: 'Border', id },
                { type: 'Border', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteBorder: build.mutation({
            query(id) {
                return {
                    url: `Border/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'Border', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetBordersPagedQuery`
export const { useGetBordersPagedQuery, // immediate fetch
useLazyGetBordersPagedQuery, // lazy fetch
useGetBorderQuery, useGetBordersQuery, useAddBorderMutation, useUpdateBorderMutation, useDeleteBorderMutation, } = BorderService;
//# sourceMappingURL=BorderService.js.map