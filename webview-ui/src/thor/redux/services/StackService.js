import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const StackService = createApi({
    reducerPath: 'Stack', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['Stack'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getStacksPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `Stack?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'Stack', id })),
                    { type: 'Stack', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getStacks: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `Stack?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `Stack`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'Stack', id })),
                    { type: 'Stack', id: 'LIST' },
                ]
                : [{ type: 'Stack', id: 'LIST' }],
        }),
        // 3) Create
        addStack: build.mutation({
            query: (body) => ({
                url: `Stack`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'Stack', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getStack: build.query({
            query: (id) => `Stack/${id}`,
            providesTags: (result, error, id) => [{ type: 'Stack', id }],
        }),
        // 5) Update
        updateStack: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `Stack/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(StackService.util.updateQueryData('getStack', id, (draft) => {
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
                { type: 'Stack', id },
                { type: 'Stack', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteStack: build.mutation({
            query(id) {
                return {
                    url: `Stack/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'Stack', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetStacksPagedQuery`
export const { useGetStacksPagedQuery, // immediate fetch
useLazyGetStacksPagedQuery, // lazy fetch
useGetStackQuery, useGetStacksQuery, useAddStackMutation, useUpdateStackMutation, useDeleteStackMutation, } = StackService;
//# sourceMappingURL=StackService.js.map