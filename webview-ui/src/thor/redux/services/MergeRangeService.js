import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const MergeRangeService = createApi({
    reducerPath: 'MergeRange', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['MergeRange'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getMergeRangesPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `MergeRange?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'MergeRange', id })),
                    { type: 'MergeRange', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getMergeRanges: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `MergeRange?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `MergeRange`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'MergeRange', id })),
                    { type: 'MergeRange', id: 'LIST' },
                ]
                : [{ type: 'MergeRange', id: 'LIST' }],
        }),
        // 3) Create
        addMergeRange: build.mutation({
            query: (body) => ({
                url: `MergeRange`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'MergeRange', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getMergeRange: build.query({
            query: (id) => `MergeRange/${id}`,
            providesTags: (result, error, id) => [{ type: 'MergeRange', id }],
        }),
        // 5) Update
        updateMergeRange: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `MergeRange/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(MergeRangeService.util.updateQueryData('getMergeRange', id, (draft) => {
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
                { type: 'MergeRange', id },
                { type: 'MergeRange', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteMergeRange: build.mutation({
            query(id) {
                return {
                    url: `MergeRange/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'MergeRange', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetMergeRangesPagedQuery`
export const { useGetMergeRangesPagedQuery, // immediate fetch
useLazyGetMergeRangesPagedQuery, // lazy fetch
useGetMergeRangeQuery, useGetMergeRangesQuery, useAddMergeRangeMutation, useUpdateMergeRangeMutation, useDeleteMergeRangeMutation, } = MergeRangeService;
//# sourceMappingURL=MergeRangeService.js.map