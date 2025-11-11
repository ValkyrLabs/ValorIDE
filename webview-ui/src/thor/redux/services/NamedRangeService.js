import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const NamedRangeService = createApi({
    reducerPath: 'NamedRange', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['NamedRange'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getNamedRangesPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `NamedRange?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'NamedRange', id })),
                    { type: 'NamedRange', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getNamedRanges: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `NamedRange?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `NamedRange`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'NamedRange', id })),
                    { type: 'NamedRange', id: 'LIST' },
                ]
                : [{ type: 'NamedRange', id: 'LIST' }],
        }),
        // 3) Create
        addNamedRange: build.mutation({
            query: (body) => ({
                url: `NamedRange`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'NamedRange', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getNamedRange: build.query({
            query: (id) => `NamedRange/${id}`,
            providesTags: (result, error, id) => [{ type: 'NamedRange', id }],
        }),
        // 5) Update
        updateNamedRange: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `NamedRange/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(NamedRangeService.util.updateQueryData('getNamedRange', id, (draft) => {
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
                { type: 'NamedRange', id },
                { type: 'NamedRange', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteNamedRange: build.mutation({
            query(id) {
                return {
                    url: `NamedRange/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'NamedRange', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetNamedRangesPagedQuery`
export const { useGetNamedRangesPagedQuery, // immediate fetch
useLazyGetNamedRangesPagedQuery, // lazy fetch
useGetNamedRangeQuery, useGetNamedRangesQuery, useAddNamedRangeMutation, useUpdateNamedRangeMutation, useDeleteNamedRangeMutation, } = NamedRangeService;
//# sourceMappingURL=NamedRangeService.js.map