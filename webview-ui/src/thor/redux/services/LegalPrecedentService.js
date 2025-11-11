import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const LegalPrecedentService = createApi({
    reducerPath: 'LegalPrecedent', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['LegalPrecedent'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getLegalPrecedentsPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `LegalPrecedent?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'LegalPrecedent', id })),
                    { type: 'LegalPrecedent', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getLegalPrecedents: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `LegalPrecedent?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `LegalPrecedent`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'LegalPrecedent', id })),
                    { type: 'LegalPrecedent', id: 'LIST' },
                ]
                : [{ type: 'LegalPrecedent', id: 'LIST' }],
        }),
        // 3) Create
        addLegalPrecedent: build.mutation({
            query: (body) => ({
                url: `LegalPrecedent`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'LegalPrecedent', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getLegalPrecedent: build.query({
            query: (id) => `LegalPrecedent/${id}`,
            providesTags: (result, error, id) => [{ type: 'LegalPrecedent', id }],
        }),
        // 5) Update
        updateLegalPrecedent: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `LegalPrecedent/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(LegalPrecedentService.util.updateQueryData('getLegalPrecedent', id, (draft) => {
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
                { type: 'LegalPrecedent', id },
                { type: 'LegalPrecedent', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteLegalPrecedent: build.mutation({
            query(id) {
                return {
                    url: `LegalPrecedent/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'LegalPrecedent', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetLegalPrecedentsPagedQuery`
export const { useGetLegalPrecedentsPagedQuery, // immediate fetch
useLazyGetLegalPrecedentsPagedQuery, // lazy fetch
useGetLegalPrecedentQuery, useGetLegalPrecedentsQuery, useAddLegalPrecedentMutation, useUpdateLegalPrecedentMutation, useDeleteLegalPrecedentMutation, } = LegalPrecedentService;
//# sourceMappingURL=LegalPrecedentService.js.map