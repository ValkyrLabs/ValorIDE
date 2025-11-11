import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const LlmDetailsService = createApi({
    reducerPath: 'LlmDetails', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['LlmDetails'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getLlmDetailssPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `LlmDetails?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'LlmDetails', id })),
                    { type: 'LlmDetails', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getLlmDetailss: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `LlmDetails?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `LlmDetails`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'LlmDetails', id })),
                    { type: 'LlmDetails', id: 'LIST' },
                ]
                : [{ type: 'LlmDetails', id: 'LIST' }],
        }),
        // 3) Create
        addLlmDetails: build.mutation({
            query: (body) => ({
                url: `LlmDetails`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'LlmDetails', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getLlmDetails: build.query({
            query: (id) => `LlmDetails/${id}`,
            providesTags: (result, error, id) => [{ type: 'LlmDetails', id }],
        }),
        // 5) Update
        updateLlmDetails: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `LlmDetails/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(LlmDetailsService.util.updateQueryData('getLlmDetails', id, (draft) => {
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
                { type: 'LlmDetails', id },
                { type: 'LlmDetails', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteLlmDetails: build.mutation({
            query(id) {
                return {
                    url: `LlmDetails/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'LlmDetails', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetLlmDetailssPagedQuery`
export const { useGetLlmDetailssPagedQuery, // immediate fetch
useLazyGetLlmDetailssPagedQuery, // lazy fetch
useGetLlmDetailsQuery, useGetLlmDetailssQuery, useAddLlmDetailsMutation, useUpdateLlmDetailsMutation, useDeleteLlmDetailsMutation, } = LlmDetailsService;
//# sourceMappingURL=LlmDetailsService.js.map