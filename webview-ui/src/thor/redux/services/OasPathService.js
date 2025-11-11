import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const OasPathService = createApi({
    reducerPath: 'OasPath', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['OasPath'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getOasPathsPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `OasPath?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'OasPath', id })),
                    { type: 'OasPath', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getOasPaths: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `OasPath?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `OasPath`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'OasPath', id })),
                    { type: 'OasPath', id: 'LIST' },
                ]
                : [{ type: 'OasPath', id: 'LIST' }],
        }),
        // 3) Create
        addOasPath: build.mutation({
            query: (body) => ({
                url: `OasPath`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'OasPath', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getOasPath: build.query({
            query: (id) => `OasPath/${id}`,
            providesTags: (result, error, id) => [{ type: 'OasPath', id }],
        }),
        // 5) Update
        updateOasPath: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `OasPath/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(OasPathService.util.updateQueryData('getOasPath', id, (draft) => {
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
                { type: 'OasPath', id },
                { type: 'OasPath', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteOasPath: build.mutation({
            query(id) {
                return {
                    url: `OasPath/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'OasPath', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetOasPathsPagedQuery`
export const { useGetOasPathsPagedQuery, // immediate fetch
useLazyGetOasPathsPagedQuery, // lazy fetch
useGetOasPathQuery, useGetOasPathsQuery, useAddOasPathMutation, useUpdateOasPathMutation, useDeleteOasPathMutation, } = OasPathService;
//# sourceMappingURL=OasPathService.js.map