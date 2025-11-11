import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const BalanceResponseService = createApi({
    reducerPath: 'BalanceResponse', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['BalanceResponse'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getBalanceResponsesPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `BalanceResponse?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'BalanceResponse', id })),
                    { type: 'BalanceResponse', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getBalanceResponses: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `BalanceResponse?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `BalanceResponse`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'BalanceResponse', id })),
                    { type: 'BalanceResponse', id: 'LIST' },
                ]
                : [{ type: 'BalanceResponse', id: 'LIST' }],
        }),
        // 3) Create
        addBalanceResponse: build.mutation({
            query: (body) => ({
                url: `BalanceResponse`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'BalanceResponse', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getBalanceResponse: build.query({
            query: (id) => `BalanceResponse/${id}`,
            providesTags: (result, error, id) => [{ type: 'BalanceResponse', id }],
        }),
        // 5) Update
        updateBalanceResponse: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `BalanceResponse/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(BalanceResponseService.util.updateQueryData('getBalanceResponse', id, (draft) => {
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
                { type: 'BalanceResponse', id },
                { type: 'BalanceResponse', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteBalanceResponse: build.mutation({
            query(id) {
                return {
                    url: `BalanceResponse/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'BalanceResponse', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetBalanceResponsesPagedQuery`
export const { useGetBalanceResponsesPagedQuery, // immediate fetch
useLazyGetBalanceResponsesPagedQuery, // lazy fetch
useGetBalanceResponseQuery, useGetBalanceResponsesQuery, useAddBalanceResponseMutation, useUpdateBalanceResponseMutation, useDeleteBalanceResponseMutation, } = BalanceResponseService;
//# sourceMappingURL=BalanceResponseService.js.map