import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const PtgService = createApi({
    reducerPath: 'Ptg', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['Ptg'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getPtgsPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `Ptg?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'Ptg', id })),
                    { type: 'Ptg', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getPtgs: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `Ptg?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `Ptg`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'Ptg', id })),
                    { type: 'Ptg', id: 'LIST' },
                ]
                : [{ type: 'Ptg', id: 'LIST' }],
        }),
        // 3) Create
        addPtg: build.mutation({
            query: (body) => ({
                url: `Ptg`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'Ptg', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getPtg: build.query({
            query: (id) => `Ptg/${id}`,
            providesTags: (result, error, id) => [{ type: 'Ptg', id }],
        }),
        // 5) Update
        updatePtg: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `Ptg/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(PtgService.util.updateQueryData('getPtg', id, (draft) => {
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
                { type: 'Ptg', id },
                { type: 'Ptg', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deletePtg: build.mutation({
            query(id) {
                return {
                    url: `Ptg/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'Ptg', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetPtgsPagedQuery`
export const { useGetPtgsPagedQuery, // immediate fetch
useLazyGetPtgsPagedQuery, // lazy fetch
useGetPtgQuery, useGetPtgsQuery, useAddPtgMutation, useUpdatePtgMutation, useDeletePtgMutation, } = PtgService;
//# sourceMappingURL=PtgService.js.map