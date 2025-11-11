import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const OasRequiredService = createApi({
    reducerPath: 'OasRequired', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['OasRequired'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getOasRequiredsPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `OasRequired?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'OasRequired', id })),
                    { type: 'OasRequired', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getOasRequireds: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `OasRequired?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `OasRequired`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'OasRequired', id })),
                    { type: 'OasRequired', id: 'LIST' },
                ]
                : [{ type: 'OasRequired', id: 'LIST' }],
        }),
        // 3) Create
        addOasRequired: build.mutation({
            query: (body) => ({
                url: `OasRequired`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'OasRequired', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getOasRequired: build.query({
            query: (id) => `OasRequired/${id}`,
            providesTags: (result, error, id) => [{ type: 'OasRequired', id }],
        }),
        // 5) Update
        updateOasRequired: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `OasRequired/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(OasRequiredService.util.updateQueryData('getOasRequired', id, (draft) => {
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
                { type: 'OasRequired', id },
                { type: 'OasRequired', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteOasRequired: build.mutation({
            query(id) {
                return {
                    url: `OasRequired/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'OasRequired', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetOasRequiredsPagedQuery`
export const { useGetOasRequiredsPagedQuery, // immediate fetch
useLazyGetOasRequiredsPagedQuery, // lazy fetch
useGetOasRequiredQuery, useGetOasRequiredsQuery, useAddOasRequiredMutation, useUpdateOasRequiredMutation, useDeleteOasRequiredMutation, } = OasRequiredService;
//# sourceMappingURL=OasRequiredService.js.map