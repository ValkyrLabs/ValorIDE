import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const OasOperationService = createApi({
    reducerPath: 'OasOperation', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['OasOperation'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getOasOperationsPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `OasOperation?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'OasOperation', id })),
                    { type: 'OasOperation', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getOasOperations: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `OasOperation?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `OasOperation`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'OasOperation', id })),
                    { type: 'OasOperation', id: 'LIST' },
                ]
                : [{ type: 'OasOperation', id: 'LIST' }],
        }),
        // 3) Create
        addOasOperation: build.mutation({
            query: (body) => ({
                url: `OasOperation`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'OasOperation', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getOasOperation: build.query({
            query: (id) => `OasOperation/${id}`,
            providesTags: (result, error, id) => [{ type: 'OasOperation', id }],
        }),
        // 5) Update
        updateOasOperation: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `OasOperation/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(OasOperationService.util.updateQueryData('getOasOperation', id, (draft) => {
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
                { type: 'OasOperation', id },
                { type: 'OasOperation', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteOasOperation: build.mutation({
            query(id) {
                return {
                    url: `OasOperation/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'OasOperation', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetOasOperationsPagedQuery`
export const { useGetOasOperationsPagedQuery, // immediate fetch
useLazyGetOasOperationsPagedQuery, // lazy fetch
useGetOasOperationQuery, useGetOasOperationsQuery, useAddOasOperationMutation, useUpdateOasOperationMutation, useDeleteOasOperationMutation, } = OasOperationService;
//# sourceMappingURL=OasOperationService.js.map