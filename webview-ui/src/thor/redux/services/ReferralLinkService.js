import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from '../customBaseQuery'; // Import the custom base query
export const ReferralLinkService = createApi({
    reducerPath: 'ReferralLink', // This should remain unique
    baseQuery: customBaseQuery,
    tagTypes: ['ReferralLink'],
    endpoints: (build) => ({
        // 1) Paged Query Endpoint
        // Standardized pagination: page (0-based), size (page size)
        getReferralLinksPaged: build.query({
            query: ({ page, size = 20, example }) => {
                const q = [`page=${page}`, `size=${size}`];
                if (example)
                    q.push(`example=${encodeURIComponent(JSON.stringify(example))}`);
                return `ReferralLink?${q.join('&')}`;
            },
            providesTags: (result, error, { page }) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'ReferralLink', id })),
                    { type: 'ReferralLink', id: `PAGE_${page}` },
                ]
                : [],
        }),
        // 2) Simple "get all" Query (optional)
        getReferralLinks: build.query({
            query: (arg) => {
                if (arg && arg.example) {
                    const ex = arg.example;
                    return `ReferralLink?example=${encodeURIComponent(JSON.stringify(ex))}`;
                }
                return `ReferralLink`;
            },
            providesTags: (result) => result
                ? [
                    ...result.map(({ id }) => ({ type: 'ReferralLink', id })),
                    { type: 'ReferralLink', id: 'LIST' },
                ]
                : [{ type: 'ReferralLink', id: 'LIST' }],
        }),
        // 3) Create
        addReferralLink: build.mutation({
            query: (body) => ({
                url: `ReferralLink`,
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'ReferralLink', id: 'LIST' }],
        }),
        // 4) Get single by ID
        getReferralLink: build.query({
            query: (id) => `ReferralLink/${id}`,
            providesTags: (result, error, id) => [{ type: 'ReferralLink', id }],
        }),
        // 5) Update
        updateReferralLink: build.mutation({
            query: ({ id, ...patch }) => ({
                url: `ReferralLink/${id}`,
                method: 'PUT',
                body: patch,
            }),
            async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
                if (id) {
                    const patchResult = dispatch(ReferralLinkService.util.updateQueryData('getReferralLink', id, (draft) => {
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
                { type: 'ReferralLink', id },
                { type: 'ReferralLink', id: 'LIST' },
            ],
        }),
        // 6) Delete
        deleteReferralLink: build.mutation({
            query(id) {
                return {
                    url: `ReferralLink/${id}`,
                    method: 'DELETE',
                };
            },
            invalidatesTags: (result, error, id) => [{ type: 'ReferralLink', id }],
        }),
    }),
});
// Notice we now also export `useLazyGetReferralLinksPagedQuery`
export const { useGetReferralLinksPagedQuery, // immediate fetch
useLazyGetReferralLinksPagedQuery, // lazy fetch
useGetReferralLinkQuery, useGetReferralLinksQuery, useAddReferralLinkMutation, useUpdateReferralLinkMutation, useDeleteReferralLinkMutation, } = ReferralLinkService;
//# sourceMappingURL=ReferralLinkService.js.map