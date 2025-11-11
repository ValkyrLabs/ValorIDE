import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const PtgRefService = createApi({
    reducerPath: 'PtgRef', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['PtgRef'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getPtgRefsPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `PtgRef?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'PtgRef', id })),
                    { type: 'PtgRef', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getPtgRefs: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `PtgRef?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `PtgRef`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'PtgRef', id })),
                    { type: 'PtgRef', id: 'LIST' },
                ]
                : [{ type: 'PtgRef', id: 'LIST' }],
        }),
        // 3) Create
        addPtgRef: build.mutation({
            query: (body) => ({
                url: `PtgRef`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'PtgRef', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getPtgRef: build.query({
            query: (id) => `PtgRef/${id}`,
            providesTags: (result, error, id) => [{ type: 'PtgRef', id }],
        }),
        // 5) Update
        updatePtgRef: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `PtgRef/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(PtgRefService.util.updateQueryData('getPtgRef', id, (draft) => {
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
                { type: 'PtgRef', id },
                { type: 'PtgRef', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deletePtgRef: build.mutation({
            query(id) {
                return {
                    url: `PtgRef/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'PtgRef', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetPtgRefsPagedQuery`
export const { useGetPtgRefsPagedQuery, // immediate fetch
useLazyGetPtgRefsPagedQuery, // lazy fetch
useGetPtgRefQuery, useGetPtgRefsQuery, useAddPtgRefMutation, useUpdatePtgRefMutation, useDeletePtgRefMutation, } = PtgRefService;
//# sourceMappingURL=PtgRefService.js.map