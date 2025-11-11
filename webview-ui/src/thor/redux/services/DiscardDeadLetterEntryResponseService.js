import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const DiscardDeadLetterEntryResponseService = createApi({
    reducerPath: 'DiscardDeadLetterEntryResponse', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['DiscardDeadLetterEntryResponse'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getDiscardDeadLetterEntryResponsesPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `DiscardDeadLetterEntryResponse?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'DiscardDeadLetterEntryResponse', id })),
                    { type: 'DiscardDeadLetterEntryResponse', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getDiscardDeadLetterEntryResponses: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `DiscardDeadLetterEntryResponse?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `DiscardDeadLetterEntryResponse`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'DiscardDeadLetterEntryResponse', id })),
                    { type: 'DiscardDeadLetterEntryResponse', id: 'LIST' },
                ]
                : [{ type: 'DiscardDeadLetterEntryResponse', id: 'LIST' }],
        }),
        // 3) Create
        addDiscardDeadLetterEntryResponse: build.mutation({
            query: (body) => ({
                url: `DiscardDeadLetterEntryResponse`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'DiscardDeadLetterEntryResponse', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getDiscardDeadLetterEntryResponse: build.query({
            query: (id) => `DiscardDeadLetterEntryResponse/${id}`,
            providesTags: (result, error, id) => [{ type: 'DiscardDeadLetterEntryResponse', id }],
        }),
        // 5) Update
        updateDiscardDeadLetterEntryResponse: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `DiscardDeadLetterEntryResponse/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(DiscardDeadLetterEntryResponseService.util.updateQueryData('getDiscardDeadLetterEntryResponse', id, (draft) => {
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
                { type: 'DiscardDeadLetterEntryResponse', id },
                { type: 'DiscardDeadLetterEntryResponse', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteDiscardDeadLetterEntryResponse: build.mutation({
            query(id) {
                return {
                    url: `DiscardDeadLetterEntryResponse/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'DiscardDeadLetterEntryResponse', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetDiscardDeadLetterEntryResponsesPagedQuery`
export const { useGetDiscardDeadLetterEntryResponsesPagedQuery, // immediate fetch
useLazyGetDiscardDeadLetterEntryResponsesPagedQuery, // lazy fetch
useGetDiscardDeadLetterEntryResponseQuery, useGetDiscardDeadLetterEntryResponsesQuery, useAddDiscardDeadLetterEntryResponseMutation, useUpdateDiscardDeadLetterEntryResponseMutation, useDeleteDiscardDeadLetterEntryResponseMutation, } = DiscardDeadLetterEntryResponseService;
//# sourceMappingURL=DiscardDeadLetterEntryResponseService.js.map