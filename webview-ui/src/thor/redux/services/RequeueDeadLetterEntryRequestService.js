import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const RequeueDeadLetterEntryRequestService = createApi({
    reducerPath: 'RequeueDeadLetterEntryRequest', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['RequeueDeadLetterEntryRequest'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getRequeueDeadLetterEntryRequestsPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `RequeueDeadLetterEntryRequest?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'RequeueDeadLetterEntryRequest', id })),
                    { type: 'RequeueDeadLetterEntryRequest', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getRequeueDeadLetterEntryRequests: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `RequeueDeadLetterEntryRequest?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `RequeueDeadLetterEntryRequest`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'RequeueDeadLetterEntryRequest', id })),
                    { type: 'RequeueDeadLetterEntryRequest', id: 'LIST' },
                ]
                : [{ type: 'RequeueDeadLetterEntryRequest', id: 'LIST' }],
        }),
        // 3) Create
        addRequeueDeadLetterEntryRequest: build.mutation({
            query: (body) => ({
                url: `RequeueDeadLetterEntryRequest`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'RequeueDeadLetterEntryRequest', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getRequeueDeadLetterEntryRequest: build.query({
            query: (id) => `RequeueDeadLetterEntryRequest/${id}`,
            providesTags: (result, error, id) => [{ type: 'RequeueDeadLetterEntryRequest', id }],
        }),
        // 5) Update
        updateRequeueDeadLetterEntryRequest: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `RequeueDeadLetterEntryRequest/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(RequeueDeadLetterEntryRequestService.util.updateQueryData('getRequeueDeadLetterEntryRequest', id, (draft) => {
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
                { type: 'RequeueDeadLetterEntryRequest', id },
                { type: 'RequeueDeadLetterEntryRequest', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteRequeueDeadLetterEntryRequest: build.mutation({
            query(id) {
                return {
                    url: `RequeueDeadLetterEntryRequest/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'RequeueDeadLetterEntryRequest', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetRequeueDeadLetterEntryRequestsPagedQuery`
export const { useGetRequeueDeadLetterEntryRequestsPagedQuery, // immediate fetch
useLazyGetRequeueDeadLetterEntryRequestsPagedQuery, // lazy fetch
useGetRequeueDeadLetterEntryRequestQuery, useGetRequeueDeadLetterEntryRequestsQuery, useAddRequeueDeadLetterEntryRequestMutation, useUpdateRequeueDeadLetterEntryRequestMutation, useDeleteRequeueDeadLetterEntryRequestMutation, } = RequeueDeadLetterEntryRequestService;
//# sourceMappingURL=RequeueDeadLetterEntryRequestService.js.map